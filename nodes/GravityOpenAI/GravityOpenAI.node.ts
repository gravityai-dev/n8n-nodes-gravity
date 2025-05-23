import type { IExecuteFunctions, INodeType, INodeTypeDescription, INodeExecutionData } from "n8n-workflow";
import { NodeConnectionType } from "n8n-workflow";

// Import OpenAI Service
import {
  OpenAIRequestOptions,
  OpenAIConfig,
  sendOpenAIRequest,
  processUserMessage,
  createFinalResponseObject,
  formatStreamChunk,
  createCompletionChunk,
  formatErrorResponse,
} from "./OpenAIService";

// Constants for the node
const NODE_TYPE = "gravityOpenAI";
const NODE_DISPLAY_NAME = "Gravity OpenAI";
const NODE_VERSION = 1;
const NODE_SUBTITLE = "OpenAI GPT";
const NODE_DESCRIPTION = "Streams responses from OpenAI GPT models";

export class GravityOpenAI implements INodeType {
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
    inputs: [NodeConnectionType.Main],
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
    outputNames: ["Stream", "Result"],

    // Node icon configuration
    icon: "fa:robot",

    // Authentication
    credentials: [
      {
        name: "openAiApi",
        required: true,
      },
    ],

    // Node properties
    properties: [
      {
        displayName: "Model",
        name: "model",
        type: "options",
        default: "gpt-4-turbo-preview",
        options: [
          {
            name: "GPT-4 Turbo",
            value: "gpt-4-turbo-preview",
          },
          {
            name: "GPT-4",
            value: "gpt-4",
          },
          {
            name: "GPT-3.5 Turbo",
            value: "gpt-3.5-turbo",
          },
          {
            name: "GPT-4o",
            value: "gpt-4o",
          },
          {
            name: "GPT-4o Mini",
            value: "gpt-4o-mini",
          },
        ],
        description: "The OpenAI model to use",
      },
      {
        displayName: "System Prompt",
        name: "systemPrompt",
        type: "string",
        typeOptions: {
          rows: 5,
        },
        default: "You are a helpful AI assistant.",
        description: "System prompt to guide the model's behavior",
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
            content: "Hello, how can you help me today?",
          },
          null,
          2
        ),
        description: "The message to send to OpenAI in JSON format",
      },
      {
        displayName: "Temperature",
        name: "temperature",
        type: "number",
        default: 0.7,
        typeOptions: {
          minValue: 0,
          maxValue: 2,
        },
        description: "Controls randomness in the response (0-2)",
      },
      {
        displayName: "Max Tokens",
        name: "maxTokens",
        type: "number",
        default: 1000,
        description: "Maximum number of tokens to generate",
      },
      {
        displayName: "Base URL",
        name: "baseURL",
        type: "string",
        default: "",
        description: "Optional custom base URL for OpenAI-compatible APIs (leave empty for standard OpenAI)",
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    try {
      // Get node parameters (using first item only)
      const itemIndex = 0;
      const model = this.getNodeParameter("model", itemIndex, "") as string;
      const systemPrompt = this.getNodeParameter("systemPrompt", itemIndex, "") as string;
      const temperature = this.getNodeParameter("temperature", itemIndex, 0.7) as number;
      const maxTokens = this.getNodeParameter("maxTokens", itemIndex, 1000) as number;
      const userMessage = this.getNodeParameter("message", itemIndex, "") as string;
      const baseURL = this.getNodeParameter("baseURL", itemIndex, "") as string;

      // Get OpenAI credentials
      const openAICredentials = await this.getCredentials("openAiApi");
      const openAIConfig: OpenAIConfig = {
        apiKey: openAICredentials.apiKey as string,
        organization: openAICredentials.organizationId as string | undefined,
        baseURL: baseURL || undefined,
      };

      // Prepare request
      const messages = processUserMessage(userMessage);
      const requestOptions: OpenAIRequestOptions = {
        model,
        systemPrompt,
        messages,
        temperature,
        maxTokens,
        stream: true,
      };

      // Prepare output arrays
      const streamOutput: INodeExecutionData[] = [];

      // Send request to OpenAI
      const { fullResponse, chunkCount } = await sendOpenAIRequest(openAIConfig, requestOptions, (text, chunkIndex) =>
        streamOutput.push(formatStreamChunk(model, text, chunkIndex))
      );

      // Add completion chunk
      streamOutput.push(createCompletionChunk(model, chunkCount));

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

      // Return outputs
      return [streamOutput, finalOutput];
    } catch (error: any) {
      // Handle errors
      const errorResponse = formatErrorResponse(error);
      return [[errorResponse], [errorResponse]];
    }
  }
}
