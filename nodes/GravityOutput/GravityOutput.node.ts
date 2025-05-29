import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from "n8n-workflow";
import { NodeConnectionType, NodeOperationError } from "n8n-workflow";

// Import from gravity-server
import {
  ChatState,
  MessageType,
  AI_RESULT_CHANNEL,
  createText,
  createJsonData,
  createImageResponse,
  createToolOutput,
  createActionSuggestion,
  Publisher,
} from "@gravityai-dev/gravity-server";

export class GravityOutput implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Gravity Output",
    name: "gravityOutput",
    group: ["gravity"],
    version: 1,
    subtitle: "= Output messages from Gravity",
    description: "Send various message types to clients",
    defaults: {
      name: "Gravity Output",
      color: "#00AA00",
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    icon: "fa:eye",
    credentials: [
      {
        name: "gravityApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Chat ID",
        name: "chatId",
        type: "string",
        default: "",
        description: "Chat ID",
        required: true,
      },
      {
        displayName: "Conversation ID",
        name: "conversationId",
        type: "string",
        default: "",
        description: "Conversation ID from the GravityInput node",
        hint: "This should match the conversation ID from the Gravity Input node",
        required: true,
      },
      {
        displayName: "User ID",
        name: "userId",
        type: "string",
        default: "",
        description: "User ID",
        required: true,
      },
      {
        displayName: "Advanced Options",
        name: "advancedOptions",
        type: "boolean",
        default: false,
        description: "Whether to show advanced configuration options",
      },
      {
        displayName: "Enable Audio Generation",
        name: "enableAudio",
        type: "boolean",
        default: false,
        description: "Whether to generate voice for this message",
        displayOptions: {
          show: {
            advancedOptions: [true],
            outputType: [MessageType.TEXT],
          },
        },
      },
      {
        displayName: "Message State",
        name: "state",
        type: "options",
        options: [
          { name: "Idle", value: ChatState.IDLE },
          { name: "Active", value: ChatState.ACTIVE },
          { name: "Complete", value: ChatState.COMPLETE },
          { name: "Thinking", value: ChatState.THINKING },
          { name: "Responding", value: ChatState.RESPONDING },
          { name: "Waiting", value: ChatState.WAITING },
          { name: "Error", value: ChatState.ERROR },
          { name: "Cancelled", value: ChatState.CANCELLED },
        ],
        default: ChatState.ACTIVE,
        description: "State of the chat message",
        displayOptions: {
          show: {
            advancedOptions: [true],
          },
        },
      },
      {
        displayName: "Output Type",
        name: "outputType",
        type: "options",
        options: [
          { name: "Text", value: MessageType.TEXT },
          { name: "JSON Data", value: MessageType.JSON_DATA },
          { name: "Image Response", value: MessageType.IMAGE_RESPONSE },
          { name: "Tool Output", value: MessageType.TOOL_OUTPUT },
          { name: "Action Suggestion", value: MessageType.ACTION_SUGGESTION },
        ],
        default: MessageType.TEXT,
        description: "Type of output to send",
        required: true,
      },
      {
        displayName: "Text Content",
        name: "textContent",
        type: "string",
        typeOptions: {
          rows: 4,
        },
        default: "",
        description: "Text content to send",
        displayOptions: {
          show: {
            outputType: [MessageType.TEXT],
          },
        },
        required: true,
      },
      {
        displayName: "JSON Data",
        name: "jsonData",
        type: "string",
        typeOptions: {
          rows: 4,
        },
        default: "{}",
        description: "JSON data as a string (will be parsed)",
        displayOptions: {
          show: {
            outputType: [MessageType.JSON_DATA, MessageType.TOOL_OUTPUT, MessageType.ACTION_SUGGESTION],
          },
        },
        required: true,
      },
      {
        displayName: "JSON Data Field Name",
        name: "jsonDataFieldName",
        type: "string",
        default: "data",
        description: "Field name for JSON data",
        displayOptions: {
          show: {
            outputType: [MessageType.JSON_DATA],
          },
        },
        required: true,
      },
      {
        displayName: "Image URL",
        name: "imageUrl",
        type: "string",
        default: "",
        description: "URL of the image to display",
        displayOptions: {
          show: {
            outputType: [MessageType.IMAGE_RESPONSE],
          },
        },
        required: true,
      },
      {
        displayName: "Image Alt Text",
        name: "imageAlt",
        type: "string",
        default: "",
        description: "Alt text for the image",
        displayOptions: {
          show: {
            outputType: [MessageType.IMAGE_RESPONSE],
          },
        },
        required: false,
      },
      {
        displayName: "Tool Name",
        name: "toolName",
        type: "string",
        default: "",
        description: "Name of the tool that was executed",
        displayOptions: {
          show: {
            outputType: [MessageType.TOOL_OUTPUT],
          },
        },
        required: true,
      },
      {
        displayName: "Action Type",
        name: "actionType",
        type: "string",
        default: "",
        description: "Type of action to suggest",
        displayOptions: {
          show: {
            outputType: [MessageType.ACTION_SUGGESTION],
          },
        },
        required: true,
      },
      {
        displayName: "Error Handling",
        name: "errorHandling",
        type: "options",
        options: [
          {
            name: "Throw Error",
            value: "throw",
            description: "Throw an error when a problem is encountered",
          },
          {
            name: "Continue",
            value: "continue",
            description: "Log the error but continue workflow execution",
          },
        ],
        default: "throw",
        description: "How to handle errors",
        displayOptions: {
          show: {
            advancedOptions: [true],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    console.log(`[Gravity Output] Executing...`);
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Process each item
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        // Initialize publisher directly with credentials
        const credentials = await this.getCredentials("gravityApi");
        const serverUrl = credentials.serverUrl as string;
        const apiKey = credentials.apiKey as string;

        // Get unique provider ID for this node
        const workflowId = this.getWorkflow()?.id?.toString() || "unknown";
        const nodeId = this.getNode()?.id || "unknown";
        const nodeProviderId = `n8n:${workflowId}:${nodeId}`;

        // Create publisher directly
        const publisher = Publisher.fromCredentials(serverUrl, apiKey, nodeProviderId);

        // Get essential parameters
        const conversationId = this.getNodeParameter("conversationId", itemIndex) as string;
        const chatId = this.getNodeParameter("chatId", itemIndex) as string;
        const userId = this.getNodeParameter("userId", itemIndex) as string;
        const outputType = this.getNodeParameter("outputType", itemIndex) as string;
        const advancedOptions = this.getNodeParameter("advancedOptions", itemIndex, false) as boolean;

        // Basic validation
        if (!conversationId || !chatId || !userId) {
          throw new NodeOperationError(this.getNode(), "Required IDs missing", { itemIndex });
        }

        // Set message state
        let messageState = ChatState.ACTIVE;
        if (advancedOptions) {
          // Get state parameter directly as ChatState enum value
          messageState = this.getNodeParameter("state", itemIndex, ChatState.ACTIVE) as ChatState;
        }

        // Debug info
        console.log(`[Gravity Output] Sending message type ${outputType} to conversation ${conversationId}`);

        // Create base event for all message types
        const baseEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          chatId,
          conversationId,
          userId,
          providerId: nodeProviderId,
          timestamp: Date.now(),
          state: messageState,
        };

        // Handle different output types
        switch (outputType) {
          case MessageType.TEXT: {
            const text = this.getNodeParameter("textContent", itemIndex) as string;
            const enableAudio = this.getNodeParameter("enableAudio", itemIndex, false) as boolean;
            this.sendMessageToUI(`Sending text: ${text.substring(0, 50)}...`);

            // Use the message creation function
            const message = createText(baseEvent, text);
            
            // Add voice configuration if enabled
            if (enableAudio) {
              message.voiceConfig = { enabled: true, textField: 'text' };
            }

            // Publish directly to gravity
            await publisher.publishEvent(AI_RESULT_CHANNEL, message);
            break;
          }

          case MessageType.JSON_DATA: {
            try {
              const jsonDataStr = this.getNodeParameter("jsonData", itemIndex) as string;
              const jsonDataFieldName = this.getNodeParameter("jsonDataFieldName", itemIndex, "data") as string;
              const parsedData = JSON.parse(jsonDataStr);
              this.sendMessageToUI(`Sending JSON data with field name: ${jsonDataFieldName}`);

              // Format the data
              const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
              const formattedData = {
                _dataType: jsonDataFieldName,
                items: dataArray,
              };

              // Use the message creation function
              const message = createJsonData(baseEvent, formattedData);

              // Publish directly to gravity
              await publisher.publishEvent(AI_RESULT_CHANNEL, message);
            } catch (error) {
              throw new NodeOperationError(this.getNode(), "Invalid JSON data", { itemIndex });
            }
            break;
          }

          case MessageType.IMAGE_RESPONSE: {
            const url = this.getNodeParameter("imageUrl", itemIndex) as string;
            const alt = this.getNodeParameter("imageAlt", itemIndex, "") as string;
            this.sendMessageToUI(`Sending image: ${url}`);

            // Use the message creation function
            const message = createImageResponse(baseEvent, url, alt);

            // Publish directly to gravity
            await publisher.publishEvent(AI_RESULT_CHANNEL, message);
            break;
          }

          case MessageType.TOOL_OUTPUT: {
            try {
              const tool = this.getNodeParameter("toolName", itemIndex) as string;
              const resultString = this.getNodeParameter("jsonData", itemIndex) as string;
              const result = JSON.parse(resultString);
              this.sendMessageToUI(`Sending tool output: ${tool}`);

              // Use the message creation function
              const message = createToolOutput(baseEvent, tool, result);

              // Publish directly to gravity
              await publisher.publishEvent(AI_RESULT_CHANNEL, message);
            } catch (error) {
              throw new NodeOperationError(this.getNode(), "Invalid JSON data for tool output", { itemIndex });
            }
            break;
          }

          case MessageType.ACTION_SUGGESTION: {
            try {
              const actionType = this.getNodeParameter("actionType", itemIndex) as string;
              const payloadString = this.getNodeParameter("jsonData", itemIndex) as string;
              const payload = JSON.parse(payloadString);
              this.sendMessageToUI(`Sending action suggestion: ${actionType}`);

              // Use the message creation function
              const message = createActionSuggestion(baseEvent, actionType, payload);

              // Publish directly to gravity
              await publisher.publishEvent(AI_RESULT_CHANNEL, message);
            } catch (error) {
              throw new NodeOperationError(this.getNode(), "Invalid JSON data for action payload", { itemIndex });
            }
            break;
          }

          default: {
            throw new NodeOperationError(this.getNode(), `Unsupported output type: ${outputType}`, { itemIndex });
          }
        }

        // Add execution results to output
        returnData.push({
          json: {
            ...items[itemIndex].json,
            success: true,
            outputType,
            state: messageState,
            timestamp: new Date().toISOString(),
            conversationId,
            chatId,
            userId,
          },
        });
      } catch (error) {
        // Determine error handling strategy
        const advancedOptions = this.getNodeParameter("advancedOptions", itemIndex, false) as boolean;
        const errorHandling = advancedOptions
          ? (this.getNodeParameter("errorHandling", itemIndex, "throw") as "throw" | "continue")
          : "throw";

        if (errorHandling === "continue") {
          // Handle errors with continue strategy
          console.error("Error in Gravity Output:", error);
          returnData.push({
            json: {
              ...items[itemIndex].json,
              success: false,
              error: error.message || "Unknown error in Gravity Output",
            },
          });
        } else {
          throw error;
        }
      }
    }

    return [returnData];
  }
}
