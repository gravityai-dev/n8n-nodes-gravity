import OpenAI from 'openai';
import type { INodeExecutionData } from 'n8n-workflow';
import { ChatState } from '@gravityai-dev/gravity-server';

// Type definitions
export interface OpenAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface OpenAIConfig {
	apiKey: string;
	organization?: string;
	baseURL?: string;
}

export interface OpenAIRequestOptions {
	model: string;
	systemPrompt?: string;
	messages: OpenAIMessage[];
	temperature: number;
	maxTokens: number;
	stream: boolean;
}

// Main function to send a request to OpenAI with streaming
export async function sendOpenAIRequest(
	config: OpenAIConfig,
	options: OpenAIRequestOptions,
	onChunk?: (text: string, chunkIndex: number) => void,
): Promise<{ fullResponse: string; chunkCount: number }> {
	// Create OpenAI client
	const openai = new OpenAI({
		apiKey: config.apiKey,
		organization: config.organization,
		baseURL: config.baseURL,
	});

	// Prepare messages
	const messages: OpenAIMessage[] = [];
	if (options.systemPrompt) {
		messages.push({ role: 'system', content: options.systemPrompt });
	}
	messages.push(...options.messages);

	// Create the request
	const stream = await openai.chat.completions.create({
		model: options.model,
		messages,
		temperature: options.temperature,
		max_tokens: options.maxTokens,
		stream: true,
	});

	// Process the streaming response
	let fullResponse = '';
	let chunkCount = 0;

	for await (const chunk of stream) {
		const content = chunk.choices[0]?.delta?.content || '';
		if (content) {
			fullResponse += content;
			chunkCount++;

			// Call the chunk callback if provided
			if (onChunk) {
				onChunk(content, chunkCount - 1);
			}
		}
	}

	return { fullResponse, chunkCount };
}

// Process a user message and prepare it for OpenAI API
export function processUserMessage(userMessage: any): OpenAIMessage[] {
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
		return [{ role: 'user', content: userMessage }];
	}

	// Handle object input
	if (typeof userMessage === 'object' && userMessage !== null) {
		if (Array.isArray(userMessage)) {
			return userMessage as OpenAIMessage[];
		}
		return [userMessage as OpenAIMessage];
	}

	// Default fallback
	return [{ role: 'user', content: 'Hello' }];
}

// Format helpers for node outputs

// Format the response for standard output
export function formatOpenAIOutput(
	fullResponse: string,
	model: string,
	temperature: number,
	maxTokens: number,
): INodeExecutionData {
	return {
		json: {
			type: 'text',
			content: fullResponse,
			model,
			metadata: {
				timestamp: new Date().toISOString(),
				temperature,
				maxTokens,
				source: 'openai',
				done: true,
			},
		},
	};
}

// Create a final response object with complete data
export function createFinalResponseObject(
	model: string,
	fullResponse: string,
	chunkCount: number,
	messages: OpenAIMessage[],
	temperature: number,
	maxTokens: number,
): any {
	return {
		model,
		response: fullResponse,
		chunkCount,
		messages,
		updatedMessages: [...messages, { role: 'assistant', content: fullResponse }],
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
	stateOverride?: string,
	progressMessage?: string,
): INodeExecutionData {
	const json: any = {
		model,
		text,
		chunkIndex,
		timestamp: new Date().toISOString(),
		state: stateOverride || ChatState.RESPONDING, // Use override if provided, otherwise default
	};
	
	// Add progress message if provided
	if (progressMessage) {
		json.progressMessage = progressMessage;
	}
	
	return { json };
}

// Create a final completion chunk with state='COMPLETE'
export function createCompletionChunk(
	model: string, 
	chunkCount: number,
	stateOverride?: string,
	progressMessage?: string,
): INodeExecutionData {
	const json: any = {
		model,
		text: ' ',
		chunkIndex: chunkCount,
		timestamp: new Date().toISOString(),
		state: stateOverride || ChatState.COMPLETE, // Use override if provided, otherwise default
	};
	
	// Add progress message if provided
	if (progressMessage) {
		json.progressMessage = progressMessage;
	}
	
	return { json };
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
