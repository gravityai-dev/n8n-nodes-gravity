/**
 * GravityInput Node
 *
 * Entry point for Gravity messages in n8n workflows
 * Receives messages from Redis and triggers workflow execution
 */

import { INodeType, INodeTypeDescription, ITriggerFunctions, ITriggerResponse, NodeConnectionType } from "n8n-workflow";

// Import from gravity-server
import { 
  EventBus,
  EVENT_CHANNEL_PREFIX,
  QUERY_MESSAGE_CHANNEL
} from "@gravityai-dev/gravity-server";

console.log(`[Gravity Input] Module loaded at ${new Date().toISOString()}`);

export class GravityInput implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Gravity Input",
    name: "gravityInput",
    icon: "fa:eye",
    group: ["trigger"],
    version: 1,
    description: "Listens for messages from Gravity",
    eventTriggerDescription: "Waiting for Gravity messages",
    defaults: {
      name: "Gravity Input",
      color: "#00AA00",
    },
    inputs: [],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: "gravityApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Channel",
        name: "channel",
        type: "string",
        default: QUERY_MESSAGE_CHANNEL,
        required: true,
        description: "Redis channel to subscribe to",
      },
    ],
  };

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    const channel = this.getNodeParameter("channel", 0) as string;

    console.log(`[Gravity Input] Starting trigger method...`);
    console.log(`[Gravity Input] Subscribing to channel: ${channel}`);

    try {
      // Get credentials
      const credentials = await this.getCredentials("gravityApi");
      console.log(`[Gravity Input] Got credentials:`, {
        serverUrl: credentials.serverUrl,
        hasApiKey: !!credentials.apiKey,
      });

      const serverUrl = credentials.serverUrl as string;
      const apiKey = credentials.apiKey as string;

      // Get node info for unique service ID
      const workflowId = this.getWorkflow().id?.toString() || "unknown";
      const nodeId = this.getNode().id || "unknown";
      const serviceId = `n8n:${workflowId}:${nodeId}`;

      console.log(`[Gravity Input] Creating EventBus with serviceId: ${serviceId}`);

      // Create event bus connection
      console.log(`[Gravity Input] Creating EventBus with serverUrl: ${serverUrl.substring(0, serverUrl.indexOf('@') > 0 ? serverUrl.indexOf('@') : 10)}...`);
      const eventBus = EventBus.fromCredentials(serverUrl, apiKey, serviceId);

      console.log(`[Gravity Input] EventBus created successfully`);

      // Add the event channel prefix to the channel name
      const fullChannel = `${EVENT_CHANNEL_PREFIX}${channel}`;
      console.log(`[Gravity Input] Subscribing to full channel: ${fullChannel}`);

      console.log(`[Gravity Input] Debug info:`, {
        serverUrl,
        apiKey: apiKey ? 'provided' : 'missing',
        serviceId,
        channel,
        fullChannel,
        connectionActive: !!eventBus
      });

      // Subscribe to Redis channel
      const unsubscribe = await eventBus.subscribe(fullChannel, async (event: any) => {
        console.log(`[Gravity Input] Received event:`, JSON.stringify(event));

        // Extract the actual message from the event payload
        const message = event.payload || event;
        console.log(`[Gravity Input] Extracted message:`, JSON.stringify(message));

        try {
          // Emit the data to trigger the workflow
          this.emit([this.helpers.returnJsonArray([message])]);
        } catch (error) {
          console.error(`[Gravity Input] Error processing message:`, error);
          this.emit([
            this.helpers.returnJsonArray([
              {
                error: error instanceof Error ? error.message : String(error),
                originalMessage: message,
              },
            ]),
          ]);
        }
      });

      console.log(`[Gravity Input] Successfully subscribed to channel: ${channel}`);

      // Return cleanup function
      const closeFunction = async () => {
        console.log(`[Gravity Input] Unsubscribing from channel: ${channel}`);
        await unsubscribe();
      };

      return {
        closeFunction,
      };
    } catch (error) {
      console.error(`[Gravity Input] Error in trigger method:`, error);
      throw error;
    }
  }
}
