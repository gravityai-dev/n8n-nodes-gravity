import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from "n8n-workflow";
import { NodeConnectionType, NodeOperationError } from "n8n-workflow";

// Import from gravity-server
import { 
  Publisher,
  ChatState,
  MessageType,
  AI_RESULT_CHANNEL,
  createProgressUpdate,
  createMessageChunk,
  createJsonData,
  createMetadata,
} from "@gravityai-dev/gravity-server";

export class GravityUpdate implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Gravity Update",
    name: "gravityUpdate",
    group: ["AI"],
    version: 1,
    subtitle: "= Update a message in Gravity",
    description: "Send updates for an existing message in Gravity",
    defaults: {
      name: "Gravity Update",
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
        description: "Chat ID for this update",
        required: true,
      },
      {
        displayName: "Conversation ID",
        name: "conversationId",
        type: "string",
        default: "={{$json.conversationId}}",
        description: "Conversation ID from the GravityInput node",
        hint: "This should match the conversation ID from the Gravity Input node",
        required: true,
      },
      {
        displayName: "User ID",
        name: "userId",
        type: "string",
        default: "",
        description: "User ID for this update",
        required: true,
      },
      {
        displayName: "Update Type",
        name: "updateType",
        type: "options",
        options: [
          {
            name: "Progress Update",
            value: MessageType.PROGRESS_UPDATE,
            description: "Send a step progress update",
          },
          {
            name: "Message Chunk",
            value: MessageType.MESSAGE_CHUNK,
            description: "Send a streaming text chunk",
          },
          {
            name: "JSON Data",
            value: MessageType.JSON_DATA,
            description: "Send structured JSON data",
          },
          {
            name: "Metadata",
            value: MessageType.METADATA,
            description: "Send key-value metadata",
          },
        ],
        default: MessageType.PROGRESS_UPDATE,
        description: "Type of update to send",
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
      // Channel parameter removed to keep things simple - always use AI_RESULT_CHANNEL
      {
        displayName: "Progress Message",
        name: "message",
        type: "string",
        default: "",
        description: "Progress update message text",
        displayOptions: {
          show: {
            updateType: [MessageType.PROGRESS_UPDATE],
          },
        },
        required: true,
      },
      {
        displayName: "Text",
        name: "text",
        type: "string",
        default: "",
        description: "The text chunk content to send",
        displayOptions: {
          show: {
            updateType: [MessageType.MESSAGE_CHUNK],
          },
        },
        required: true,
      },
      {
        displayName: "JSON Data",
        name: "jsonData",
        type: "string",
        typeOptions: {
          alwaysOpenEditWindow: true,
          rows: 10,
        },
        default: "{}",
        description: "Structured JSON data to send",
        displayOptions: {
          show: {
            updateType: [MessageType.JSON_DATA],
          },
        },
        required: true,
      },
      {
        displayName: "JSON Data Field Name",
        name: "jsonDataFieldName",
        type: "string",
        default: "calls",
        description: "Name of the field to use for the JSON data in the output",
        displayOptions: {
          show: {
            updateType: [MessageType.JSON_DATA],
          },
        },
      },
      {
        displayName: "Metadata Key",
        name: "metadataKey",
        type: "string",
        default: "",
        description: "Key for this metadata update",
        displayOptions: {
          show: {
            updateType: [MessageType.METADATA],
          },
        },
        required: true,
      },
      {
        displayName: "Metadata Value",
        name: "metadataValue",
        type: "string",
        default: "",
        description: "Value for this metadata update",
        displayOptions: {
          show: {
            updateType: [MessageType.METADATA],
          },
        },
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    try {
      const items = this.getInputData();
      const returnData: INodeExecutionData[] = [];

      // Get provider details for attribution
      const workflowId = this.getWorkflow()?.id?.toString() || "unknown";
      const nodeId = this.getNode()?.id || "unknown";
      const nodeProviderId = `n8n:${workflowId}:${nodeId}`;

      // Create publisher directly - no registration needed
      const credentials = await this.getCredentials("gravityApi");
      const serverUrl = credentials.serverUrl as string;
      const apiKey = credentials.apiKey as string;

      // Create publisher with provider ID for tracking
      const publisher = Publisher.fromCredentials(serverUrl, apiKey, nodeProviderId);

      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        try {
          // Get common parameters for all update types
          const chatId = this.getNodeParameter("chatId", itemIndex) as string;
          const conversationId = this.getNodeParameter("conversationId", itemIndex) as string;
          const userId = this.getNodeParameter("userId", itemIndex) as string;
          const updateType = this.getNodeParameter("updateType", itemIndex) as MessageType;

          console.log(`[GravityUpdate] Received updateType: "${updateType}" (type: ${typeof updateType})`);
          console.log(`[GravityUpdate] MessageType.MESSAGE_CHUNK = "${MessageType.MESSAGE_CHUNK}"`);
          console.log(`[GravityUpdate] MessageType.PROGRESS_UPDATE = "${MessageType.PROGRESS_UPDATE}"`);

          // Check for advanced options
          const advancedOptions = this.getNodeParameter("advancedOptions", itemIndex, false) as boolean;

          // Always use AI_RESULT_CHANNEL for simplicity and consistency
          const outputChannel = AI_RESULT_CHANNEL;

          // Determine message state
          let state = ChatState.ACTIVE;
          if (advancedOptions) {
            state = this.getNodeParameter("state", itemIndex, ChatState.ACTIVE) as ChatState;
          }

          // Create base event for all message types
          const baseEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            chatId,
            conversationId,
            userId,
            providerId: nodeProviderId,
            timestamp: Date.now(),
            state,
          };

          // Process based on update type
          switch (updateType) {
            case MessageType.PROGRESS_UPDATE: {
              const message = this.getNodeParameter("message", itemIndex) as string;

              // Use the message creation function
              const progressMessage = createProgressUpdate(baseEvent, message);

              // Publish directly
              await publisher.publishEvent(outputChannel, progressMessage);

              returnData.push({
                json: {
                  success: true,
                  updateType: "progressUpdate",
                  timestamp: new Date().toISOString(),
                  message,
                },
              });
              break;
            }

            case MessageType.MESSAGE_CHUNK: {
              const text = this.getNodeParameter("text", itemIndex) as string;

              // Use the message creation function
              const chunkMessage = createMessageChunk(baseEvent, text);

              // Publish directly
              await publisher.publishEvent(outputChannel, chunkMessage);

              returnData.push({
                json: {
                  success: true,
                  updateType: "messageChunk",
                  timestamp: new Date().toISOString(),
                  textPreview: text.length > 30 ? `${text.substring(0, 30)}...` : text,
                },
              });
              break;
            }

            case MessageType.JSON_DATA: {
              try {
                const jsonDataStr = this.getNodeParameter("jsonData", itemIndex) as string;
                const jsonDataFieldName = this.getNodeParameter("jsonDataFieldName", itemIndex, "calls") as string;

                // Parse and format the data
                const parsedData = JSON.parse(jsonDataStr);
                const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
                const formattedData = {
                  _dataType: jsonDataFieldName,
                  items: dataArray,
                };

                // Use the message creation function
                const jsonMessage = createJsonData(baseEvent, formattedData);

                // Publish directly
                await publisher.publishEvent(outputChannel, jsonMessage);

                returnData.push({
                  json: {
                    success: true,
                    updateType: "jsonData",
                    timestamp: new Date().toISOString(),
                    dataType: jsonDataFieldName,
                    itemCount: dataArray.length,
                  },
                });
              } catch (error) {
                throw new NodeOperationError(this.getNode(), "Invalid JSON data", { itemIndex });
              }
              break;
            }

            case MessageType.METADATA: {
              const key = this.getNodeParameter("metadataKey", itemIndex) as string;
              const value = this.getNodeParameter("metadataValue", itemIndex) as string;

              // Format metadata as JSON
              const metadataStr = JSON.stringify({ [key]: value });

              // Use the message creation function
              const metadataMessage = createMetadata(baseEvent, metadataStr);

              // Publish directly
              await publisher.publishEvent(outputChannel, metadataMessage);

              returnData.push({
                json: {
                  success: true,
                  updateType: "metadata",
                  timestamp: new Date().toISOString(),
                  key,
                  value,
                },
              });
              break;
            }

            default: {
              throw new NodeOperationError(this.getNode(), `Unsupported update type: ${updateType}`, { itemIndex });
            }
          }
        } catch (error) {
          // Handle errors for individual items
          if (this.continueOnFail()) {
            returnData.push({
              json: {
                success: false,
                error: error.message,
              },
            });
          } else {
            // Direct error handling without using the utility
            if (error instanceof Error) {
              if (error.constructor.name !== "NodeOperationError") {
                throw new NodeOperationError(this.getNode(), error, { itemIndex });
              }
              throw error;
            }
            throw new NodeOperationError(this.getNode(), "Unknown error occurred", { itemIndex });
          }
        }
      }

      return [returnData];
    } catch (error) {
      // Handle unexpected errors
      throw error;
    }
  }
}
