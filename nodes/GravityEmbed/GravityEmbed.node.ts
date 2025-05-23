import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
  NodeOperationError,
} from "n8n-workflow";

// AWS SDK import for Bedrock
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Constants for the node
const NODE_TYPE = "gravityEmbed";
const NODE_DISPLAY_NAME = "Gravity Embed";
const NODE_VERSION = 1;
const NODE_SUBTITLE = "Titan Text Embeddings";
const NODE_DESCRIPTION = "Convert text to Titan Text Embeddings 2 vectors";

export class GravityEmbed implements INodeType {
  description: INodeTypeDescription = {
    displayName: NODE_DISPLAY_NAME,
    name: NODE_TYPE,
    group: ["transform", "ai"],
    version: NODE_VERSION,
    subtitle: NODE_SUBTITLE,
    description: NODE_DESCRIPTION,
    defaults: {
      name: NODE_DISPLAY_NAME,
    },
    inputs: [
      {
        type: NodeConnectionType.Main,
      },
    ],
    outputs: [
      {
        type: NodeConnectionType.Main,
      },
    ],
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
        displayName: "Input Text",
        name: "inputText",
        type: "string",
        typeOptions: {
          rows: 4,
        },
        default: "",
        description: "The text to convert to an embedding vector",
        noDataExpression: false,
      },
      {
        displayName: "Model",
        name: "model",
        type: "options",
        default: "amazon.titan-embed-text-v2:0",
        options: [
          {
            name: "Titan Text Embeddings v2",
            value: "amazon.titan-embed-text-v2:0",
          },
          {
            name: "Titan Text Embeddings v1",
            value: "amazon.titan-embed-g1-text-02",
          },
        ],
        description: "The embedding model to use",
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const items = this.getInputData();

    // Get AWS credentials
    const awsCredentials = await this.getCredentials("aws");
    const region = process.env.AWS_REGION || "us-east-1";

    // Create the Bedrock client
    const bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: awsCredentials.accessKeyId as string,
        secretAccessKey: awsCredentials.secretAccessKey as string,
      },
    });

    // Process each item
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        // Get parameters
        const model = this.getNodeParameter("model", itemIndex, "amazon.titan-embed-text-v2") as string;

        // Get input text
        const inputText = this.getNodeParameter("inputText", itemIndex, "") as string;

        // Validate input
        if (!inputText || inputText.trim().length === 0) {
          throw new NodeOperationError(this.getNode(), "Input text is required");
        }

        // Create the request body for Titan models
        const requestBody = {
          inputText: inputText.trim(),
        };

        // Create the command
        const command = new InvokeModelCommand({
          modelId: model,
          body: Buffer.from(JSON.stringify(requestBody)),
          contentType: "application/json",
          accept: "application/json",
        });

        // Execute the command
        const response = await bedrockClient.send(command);

        // Process the response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // Extract embedding from Titan model response
        const embedding = responseBody.embedding;

        // Validate that we got an embedding
        if (!embedding || !Array.isArray(embedding)) {
          throw new NodeOperationError(
            this.getNode(),
            `Failed to extract embedding from response: ${JSON.stringify(responseBody)}`
          );
        }

        // Create output
        const outputItem = {
          ...items[itemIndex].json,
          embedding: embedding,
          _embeddingModel: model,
          _embeddingDimension: embedding.length,
          _originalText: inputText,
        };

        returnData.push({
          json: outputItem,
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
