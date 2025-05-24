import type { IExecuteFunctions, INodeType, INodeTypeDescription, INodeExecutionData } from "n8n-workflow";
import { NodeConnectionType } from "n8n-workflow";
import { ChatState } from "@gravityai-dev/gravity-server";

// Import Bedrock Service
import {
  ClaudeRequestOptions,
  BedrockConfig,
  sendClaudeRequest,
  processUserMessage,
  extractMcpTools,
  formatMcpOutput,
  createFinalResponseObject,
  formatStreamChunk,
  createCompletionChunk,
  formatErrorResponse,
} from "./BedrockService";

// Constants for the node
const NODE_TYPE = "gravityClaude";
const NODE_DISPLAY_NAME = "Gravity Claude";
const NODE_VERSION = 1;
const NODE_SUBTITLE = "Claude AI";
const NODE_DESCRIPTION = "Streams responses from Claude via AWS Bedrock";

export class GravityClaude implements INodeType {
  description: INodeTypeDescription = {
    displayName: NODE_DISPLAY_NAME,
    name: NODE_TYPE,
    group: ["transform"],
    version: NODE_VERSION,
    subtitle: NODE_SUBTITLE,
    description: NODE_DESCRIPTION,
    defaults: {
      name: NODE_DISPLAY_NAME,
    },
    inputs: [
      NodeConnectionType.Main,
      {
        displayName: "Tool",
        maxConnections: 1, // Only allow one MCP Client connection
        type: NodeConnectionType.AiTool,
        required: false,
      },
    ],
    outputs: [
      {
        type: NodeConnectionType.Main,
        displayName: "Stream",
      },
      {
        type: NodeConnectionType.Main,
        displayName: "Result",
      },
    ],
    // Output names aligned with the outputs array
    outputNames: ["Stream", "Result", "MCP"],

    // Node icon configuration
    icon: "fa:eye",

    // Authentication
    credentials: [
      {
        name: "aws",
        required: true,
      },
    ],

    // Node properties
    properties: [
      {
        displayName: "Model",
        name: "model",
        type: "options",
        default: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        options: [
          {
            name: "Claude 3.5 Sonnet 2",
            value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          },
          {
            name: "Claude 3.5 Haiku",
            value: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
          },
        ],
        description: "The Claude model to use",
      },
      {
        displayName: "System Prompt",
        name: "systemPrompt",
        type: "string",
        typeOptions: {
          rows: 5,
        },
        default: "You are Claude, a helpful AI assistant.",
        description: "System prompt to guide Claude's behavior",
      },
      {
        displayName: "Message",
        name: "message",
        type: "json",
        typeOptions: {
          rows: 5,
        },
        default: JSON.stringify(
          {
            role: "user",
            content: [{ text: "User message here" }],
          },
          null,
          2
        ),
        description: "The message to send to Claude in JSON format",
      },
      {
        displayName: "Temperature",
        name: "temperature",
        type: "number",
        default: 0.7,
        typeOptions: {
          minValue: 0,
          maxValue: 1,
        },
        description: "Controls randomness in the response (0-1)",
      },
      {
        displayName: "Max Tokens",
        name: "maxTokens",
        type: "number",
        default: 1000,
        description: "Maximum number of tokens to generate",
      },
      // MCP Output and Tool Calling are now automatically enabled based on connections
      {
        displayName: "Use Gravity MCP provider",
        name: "useMcpProvider",
        type: "boolean",
        default: true,
        description: "Send output to the MCP provider (required for MCP Client integration)",
      },
      {
        displayName: "Enable Any Tool",
        name: "enableAnyTool",
        type: "boolean",
        default: false,
        description: "Allow Claude to use any tool without restrictions",
      },
      {
        displayName: "Tool Choice",
        name: "toolChoice",
        type: "string",
        default: "",
        description: "Specify a specific tool for Claude to use (leave empty for automatic tool selection)",
      },
      {
        displayName: "Advanced Options",
        name: "advancedOptions",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        options: [
          {
            displayName: "Message State",
            name: "state",
            type: "options",
            default: "",
            description: "Override the message state for all chunks",
            options: [
              {
                name: "Default (Auto)",
                value: "",
                description: "Use default states (RESPONDING for chunks, COMPLETE for final)",
              },
              {
                name: "Thinking",
                value: ChatState.THINKING,
              },
              {
                name: "Responding",
                value: ChatState.RESPONDING,
              },
              {
                name: "Active",
                value: ChatState.ACTIVE,
              },
              {
                name: "Waiting",
                value: ChatState.WAITING,
              },
              {
                name: "Complete",
                value: ChatState.COMPLETE,
              },
            ],
          },
          {
            displayName: "Progress Message",
            name: "progressMessage",
            type: "string",
            default: "",
            description: "Optional progress message to include with state",
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    try {
      // Get tools from the Tool input
      const toolInputs = this.getInputData(1) || [];
      const mcpTools = extractMcpTools(toolInputs);
      const enableTools = mcpTools.length > 0;

      // Get node parameters (using first item only)
      const itemIndex = 0;
      const model = this.getNodeParameter("model", itemIndex, "") as string;
      const systemPrompt = this.getNodeParameter("systemPrompt", itemIndex, "") as string;
      const temperature = this.getNodeParameter("temperature", itemIndex, 0.7) as number;
      const maxTokens = this.getNodeParameter("maxTokens", itemIndex, 1000) as number;
      const userMessage = this.getNodeParameter("message", itemIndex, "") as string;
      const enableAnyTool = this.getNodeParameter("enableAnyTool", itemIndex, false) as boolean;
      const toolChoice = this.getNodeParameter("toolChoice", itemIndex, "") as string;

      // Get advanced options
      const advancedOptions = this.getNodeParameter("advancedOptions", itemIndex, {}) as {
        state?: string;
        progressMessage?: string;
      };

      // Get AWS credentials
      const awsCredentials = await this.getCredentials("aws");
      const bedrockConfig: BedrockConfig = {
        region: process.env.AWS_REGION || "us-east-1",
        accessKeyId: awsCredentials.accessKeyId as string,
        secretAccessKey: awsCredentials.secretAccessKey as string,
      };

      // Prepare request
      const messages = processUserMessage(userMessage);
      const requestOptions: ClaudeRequestOptions = {
        model,
        systemPrompt,
        messages,
        temperature,
        maxTokens,
        enableTools,
        mcpTools,
        enableAnyTool,
        toolChoice: toolChoice.trim() || undefined,
      };

      // Prepare output arrays
      const streamOutput: INodeExecutionData[] = [];

      // Send request to Claude
      const { fullResponse, chunkCount } = await sendClaudeRequest(bedrockConfig, requestOptions, (text, chunkIndex) =>
        streamOutput.push(
          formatStreamChunk(model, text, chunkIndex, advancedOptions.state, advancedOptions.progressMessage)
        )
      );

      // Add completion chunk
      streamOutput.push(
        createCompletionChunk(model, chunkCount, advancedOptions.state, advancedOptions.progressMessage)
      );

      // Create final response
      const finalResponseObject = createFinalResponseObject(
        model,
        fullResponse,
        chunkCount,
        messages,
        temperature,
        maxTokens
      );
      const finalOutput = [{ json: finalResponseObject }];

      // Create MCP output - using standard format, no provider ID needed
      const mcpOutput = [formatMcpOutput(fullResponse, model, temperature, maxTokens)];

      // Return all outputs
      return [streamOutput, finalOutput, mcpOutput];
    } catch (error: any) {
      // Handle errors
      const errorResponse = formatErrorResponse(error);
      return [[errorResponse], [errorResponse], [errorResponse]];
    }
  }
}
