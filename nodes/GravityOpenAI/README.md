# Gravity OpenAI Node

This node provides streaming integration with OpenAI's GPT models for the Gravity AI system.

## Features

- **Streaming Support**: Real-time streaming of AI responses
- **Multiple Models**: Support for GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, and newer models
- **Dual Output**: Provides both streaming chunks and complete responses
- **Custom Base URL**: Support for OpenAI-compatible APIs

## Configuration

### Credentials
- **OpenAI API Key**: Your OpenAI API key
- **Organization ID**: Optional organization ID
- **Base URL**: Optional custom base URL for OpenAI-compatible APIs

### Parameters
- **Model**: Select the GPT model to use
- **System Prompt**: Define the AI's behavior and context
- **Message**: The user message to send (JSON format)
- **Temperature**: Control response randomness (0-2)
- **Max Tokens**: Maximum response length

## Outputs

1. **Stream Output**: Individual text chunks as they arrive
2. **Result Output**: Complete response with metadata

## Usage Example

```json
{
  "role": "user",
  "content": "Explain quantum computing in simple terms"
}
```

## Integration with Gravity

This node integrates seamlessly with the Gravity AI system, providing:
- Real-time streaming responses
- Consistent message formatting
- Error handling and recovery
- Metadata tracking

## Notes

- The node automatically handles streaming and chunk management
- Responses include completion markers for proper stream termination
- Error responses are formatted consistently with other Gravity nodes
