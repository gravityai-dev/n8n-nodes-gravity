# Gravity Claude Node

This node integrates Claude, Anthropic's powerful large language model, into the GravityAI workflow system via AWS Bedrock.

## Features

- Stream responses from Claude models via AWS Bedrock
- Configure system prompts to control Claude's behavior
- Flexible input options (manual or from workflow data)
- Support for conversation history
- Adjustable temperature and token limits
- Full streaming support for real-time responses

## Requirements

- AWS credentials with access to Bedrock
- Claude models enabled in your AWS Bedrock account

## Configuration

### AWS Credentials

This node requires AWS credentials with permissions to access Bedrock services. Configure these in n8n's credentials manager.

### Node Parameters

| Parameter | Description |
|-----------|-------------|
| Model | Select which Claude model to use |
| System Prompt | Instructions that guide Claude's behavior |
| Input Source | Choose between manual input or field from previous nodes |
| Input Prompt | Direct prompt text (when using manual input) |
| Input Field | Field name containing the prompt (when using field input) |
| Conversation Field | Field containing conversation history (optional) |
| Temperature | Controls randomness in responses (0-1) |
| Max Tokens | Maximum length of generated response |
| Stream Response | Whether to stream the response in real-time |

## Usage Examples

### Basic Question Answering

Configure the node with a system prompt and connect it to a workflow that provides user questions.

### Conversation Agent

Use with conversation history to create a contextual agent that remembers previous interactions.

### Content Generation

Generate creative content by setting appropriate system prompts and temperature values.

## Output

The node outputs an object containing:

- `response`: The full text response from Claude
- `responseChunks`: Individual chunks of the response (when streaming)
- `conversation`: Updated conversation history including the new response
- `metadata`: Information about the request including model, temperature, etc.

## Notes

- Streaming is recommended for better user experience with longer responses
- Higher temperature values (closer to 1) produce more creative but less predictable responses
- Lower temperature values (closer to 0) produce more deterministic, focused responses
