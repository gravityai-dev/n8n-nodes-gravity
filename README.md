# n8n-nodes-gravity

Official n8n nodes for [Gravity AI](https://gravity-ai.com) - Build AI workflows with ease.

## Features

- 🤖 **Multiple AI Models** - Claude (via AWS Bedrock), OpenAI GPT-4, and more
- 📡 **Real-time Communication** - Seamless integration with Gravity's event-driven architecture
- 🔄 **Streaming Support** - Handle streaming responses from AI models
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 🔧 **Easy Setup** - Simple credential configuration

## Installation

### Community Nodes (Recommended)

1. In n8n, go to **Settings** > **Community Nodes**
2. Select **Install**
3. Enter `https://github.com/gravityai-dev/n8n-nodes-gravity`
4. Click **Install**

### Manual Installation

```bash
npm install -g @gravityai-dev/n8n-nodes-gravity
```

Then restart n8n.

## Quick Start

### 1. Configure Credentials

Add your Gravity API credentials:
- Go to **Credentials** > **New**
- Select **Gravity API**
- Enter your server URL and API key
- Save

### 2. Create Your First Workflow

1. Add a **Gravity Input** node to receive messages
2. Process with **Gravity Claude** or **Gravity OpenAI**
3. Send responses with **Gravity Output**

## Available Nodes

### 🎯 Gravity Input
Entry point for Gravity messages in your workflows.

**Outputs:**
- `chatId` - Unique chat identifier
- `conversationId` - Conversation thread ID
- `userId` - User identifier
- `message` - Incoming message text
- `metadata` - Additional context

### 🤖 Gravity Claude
Process messages with Claude AI via AWS Bedrock.

**Inputs:**
- `message` - Text to process
- `systemPrompt` - System instructions
- `model` - Claude model version
- `temperature` - Response creativity (0-1)
- `maxTokens` - Maximum response length

**Outputs:**
- `response` - Claude's response
- `usage` - Token usage statistics

### 🧠 Gravity OpenAI
Process messages with OpenAI's GPT models.

**Inputs:**
- `message` - Text to process
- `systemPrompt` - System instructions
- `model` - GPT model version
- `temperature` - Response creativity (0-1)

**Outputs:**
- `response` - GPT's response
- `usage` - Token usage statistics

### 📤 Gravity Output
Send responses back to Gravity.

**Message Types:**
- `text` - Simple text response
- `json` - Structured data
- `mdx` - Rich markdown components
- `image` - Image responses
- `tool` - Tool/function outputs
- `action` - Suggested actions

### 📊 Gravity Update
Send progress updates during processing.

**Inputs:**
- `message` - Status message
- `progress` - Progress percentage (0-100)
- `state` - Current state

### 🔍 Gravity Embed
Generate embeddings for semantic search.

**Inputs:**
- `text` - Text to embed
- `model` - Embedding model

**Outputs:**
- `embedding` - Vector representation
- `dimensions` - Vector size

## Example Workflows

### Basic Chat Assistant

```
[Gravity Input] → [Gravity Claude] → [Gravity Output]
```

### Multi-Model Comparison

```
[Gravity Input] → [Split]
                    ├→ [Gravity Claude] → [Merge]
                    └→ [Gravity OpenAI] → [Merge] → [Gravity Output]
```

### Document Processing

```
[Gravity Input] → [Extract Text] → [Gravity Embed] → [Vector Store] → [Gravity Output]
```

## AWS Bedrock Setup

To use Gravity Claude nodes:

1. Create AWS credentials in n8n
2. Ensure your AWS account has Bedrock access
3. Enable Claude models in your region

## Best Practices

1. **Error Handling**: Always add error outputs to handle failures gracefully
2. **Progress Updates**: Use Gravity Update nodes for long-running processes
3. **Metadata**: Include relevant metadata in responses for better tracking
4. **Streaming**: Enable streaming for better user experience with long responses

## Support

- 📧 Email: support@gravityai.dev
- 💬 Discord: [Join our community](https://discord.gg/gravity-ai)
- 📚 Docs: [Full documentation](https://docs.gravityai.dev)
- 🐛 Issues: [GitHub Issues](https://github.com/gravityai-dev/n8n-nodes-gravity/issues)

## License

MIT - See LICENSE file for details

---

Built with ❤️ by the Gravity AI Team
