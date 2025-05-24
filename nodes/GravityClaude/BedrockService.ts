import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import type { INodeExecutionData } from 'n8n-workflow';
import { ChatState } from '@gravityai-dev/gravity-server';

// Type definitions
export interface McpTool {
	name: string;
	description: string;
	inputSchema: {
		type: string;
		properties: Record<string, any>;
		required?: string[];
	};
}

export interface ClaudeMessage {
	role: string;
	content: Array<{ text: string }>;
}

export interface BedrockConfig {
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
}

export interface ClaudeRequestOptions {
	model: string;
	systemPrompt?: string;
	messages: ClaudeMessage[];
	temperature: number;
	maxTokens: number;
	enableTools: boolean;
	mcpTools: McpTool[];
	enableAnyTool?: boolean;
	toolChoice?: string;
}

// Main function to send a request to Claude via Bedrock
export async function sendClaudeRequest(
	config: BedrockConfig,
	options: ClaudeRequestOptions,
	onChunk?: (text: string, chunkIndex: number) => void,
): Promise<{ fullResponse: string; chunkCount: number }> {
	// Create Bedrock client
	const bedrockClient = new BedrockRuntimeClient({
		region: config.region,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});

	// Create the request configuration
	const commandInput: any = {
		modelId: options.model,
		system: options.systemPrompt ? [{ text: options.systemPrompt }] : undefined,
		messages: options.messages,
		inferenceConfig: {
			temperature: options.temperature,
			maxTokens: options.maxTokens,
		},
	};

	// Add tool configuration if enabled and we have tools
	if (options.enableTools && options.mcpTools.length > 0) {
		const toolConfig: any = {
			tools: options.mcpTools.map((tool) => ({
				toolSpec: {
					name: tool.name,
					description: tool.description,
					inputSchema: { json: tool.inputSchema },
				},
			})),
		};

		// Add 'any' tool option if enabled
		if (options.enableAnyTool) {
			toolConfig.any = {};
		}

		// Add specific tool choice if provided
		if (options.toolChoice) {
			toolConfig.toolChoice = {
				tool: {
					name: options.toolChoice,
				},
			};
		}

		commandInput.toolConfig = toolConfig;
	}

	// Send request to Bedrock
	const converseStream = await bedrockClient.send(new ConverseStreamCommand(commandInput as any));

	// Process the streaming response
	let fullResponse = '';
	let chunkCount = 0;

	// Process the stream
	if (converseStream.stream) {
		for await (const chunk of converseStream.stream) {
			const chunkAny = chunk as any;

			// Extract text from the chunk (Claude's format)
			if (chunkAny.contentBlockDelta?.delta?.text) {
				const text = chunkAny.contentBlockDelta.delta.text;
				fullResponse += text;
				chunkCount++;

				// Call the chunk callback if provided
				if (onChunk) {
					onChunk(text, chunkCount - 1);
				}
			}
		}
	}

	return { fullResponse, chunkCount };
}

// Process a user message and prepare it for Claude API
export function processUserMessage(userMessage: any): ClaudeMessage[] {
	// Handle string input
	if (typeof userMessage === 'string') {
		try {
			// Try to parse as JSON first
			const messageObj = JSON.parse(userMessage);
			if (messageObj.role && messageObj.content) {
				return [messageObj];
			}
		} catch (error) {
			// Not valid JSON, continue to default handling
		}

		// Use as plain text message
		return [{ role: 'user', content: [{ text: userMessage }] }];
	}

	// Handle object input
	if (typeof userMessage === 'object' && userMessage !== null) {
		return [userMessage as ClaudeMessage];
	}

	// Default fallback
	return [{ role: 'user', content: [{ text: 'Hello' }] }];
}

// Extract MCP tools from input data
export function extractMcpTools(toolInputs: INodeExecutionData[]): McpTool[] {
	const mcpTools: McpTool[] = [];

	for (const toolInput of toolInputs) {
		const tool = toolInput.json?.tool;
		if (
			tool &&
			typeof tool === 'object' &&
			'name' in tool &&
			'description' in tool &&
			'inputSchema' in tool
		) {
			mcpTools.push({
				name: tool.name as string,
				description: tool.description as string,
				inputSchema: tool.inputSchema as any,
			});
		}
	}

	return mcpTools;
}

// Format helpers for node outputs

// Format the response for MCP output
export function formatMcpOutput(
	fullResponse: string,
	model: string,
	temperature: number,
	maxTokens: number,
	useMcpProvider: boolean = true,
): INodeExecutionData {
	const output: any = {
		type: 'text',
		content: fullResponse,
		model: model.split(':')[0], // Remove version from model ID
		metadata: {
			timestamp: new Date().toISOString(),
			temperature,
			maxTokens,
			source: 'claude',
			done: true,
		},
	};

	// Only add the providerId if useMcpProvider is true
	if (useMcpProvider) {
		output.providerId = 'mcp';
	}

	return { json: output };
}

// Create a final response object with complete data
export function createFinalResponseObject(
	model: string,
	fullResponse: string,
	chunkCount: number,
	messages: ClaudeMessage[],
	temperature: number,
	maxTokens: number,
): any {
	return {
		model,
		response: fullResponse,
		chunkCount,
		messages,
		updatedMessages: [...messages, { role: 'assistant', content: [{ text: fullResponse }] }],
		metadata: {
			timestamp: new Date().toISOString(),
			model,
			temperature,
			maxTokens,
			totalCharacters: fullResponse.length,
		},
	};
}

// Format a stream chunk for output
export function formatStreamChunk(
	model: string,
	text: string,
	chunkIndex: number,
): INodeExecutionData {
	return {
		json: {
			model,
			text,
			chunkIndex,
			timestamp: new Date().toISOString(),
			state: ChatState.RESPONDING, // Set state to RESPONDING for streaming chunks
		},
	};
}

// Create a final completion chunk with state='COMPLETE'
export function createCompletionChunk(model: string, chunkCount: number): INodeExecutionData {
	return {
		json: {
			model,
			text: ' ',
			chunkIndex: chunkCount,
			timestamp: new Date().toISOString(),
			state: ChatState.COMPLETE, // Set state to COMPLETE for final chunk
		},
	};
}

// Format an error response
export function formatErrorResponse(error: any): INodeExecutionData {
	return {
		json: {
			error: true,
			message: error?.message || 'Unknown error',
			stack: error?.stack || '',
			timestamp: new Date().toISOString(),
		},
	};
}
