# Gravity Input Node

## Overview

The Gravity Input Node serves as the entry point for user queries into the Gravity AI ecosystem. It processes incoming requests from the GraphQL server and initiates new agent sessions within n8n workflows.

## Architecture

This node is designed to work within the decoupled Redis Pub/Sub architecture:

1. Client applications send GraphQL mutations to initiate agent sessions
2. The GraphQL server processes these requests and triggers this webhook
3. This node receives the webhook data and starts the n8n workflow
4. Subsequent nodes in the workflow use Redis Pub/Sub to communicate back to the client

## GraphQL Integration

### Starting a Conversation

To initiate a conversation with the agent, use the `talkToAgent` mutation:

```graphql
mutation StartConversation {
  talkToAgent(input: { 
    message: "Tell me about cats", 
    sessionId: "test-session-1" 
  }) {
    sessionId
    success
  }
}
```

This returns:
```json
{
  "data": {
    "talkToAgent": {
      "sessionId": "test-session-1",
      "success": true
    }
  }
}
```

### Receiving Responses

The responses are streamed back via a separate GraphQL subscription:

```graphql
subscription ReceiveResponses {
  agentResponse(sessionId: "test-session-1") {
    __typename
    ... on MessageChunk { text }
    ... on Text { content }
    ... on ProgressUpdate { step message }
    ... on JsonData { data }
    ... on ActionSuggestion { type payload }
    ... on MdxComponent { code }
    ... on ImageResponse { url alt }
    ... on ToolOutput { tool result }
  }
}
```

## Node Configuration

| Parameter | Type | Description |
|-----------|------|-------------|
| Session ID | string | Unique identifier for the agent conversation. Can use dynamic values like `={{Date.now()}}` or passed from the client |
| User Input | string | The user's message or query to be processed by the agent workflow |

## Webhook Data

When triggered, this node receives:

```json
{
  "message": "User's query text",
  "sessionId": "unique-session-id"
}
```

And passes to the workflow:

```json
{
  "sessionId": "unique-session-id",
  "message": "User's query text",
  "userInput": "User's query text",
  "timestamp": "2025-04-14T12:34:56.789Z",
  "webhookSource": "gravity-graphql"
}
```

## Implementation Notes

- The node automatically handles authentication using the Gravity API credentials
- Webhook responses are sent immediately to prevent timeouts, allowing the workflow to continue processing asynchronously
- All communication with the client after the initial request happens through Redis Pub/Sub channels
- Error handling is built in to provide meaningful feedback for failed requests
