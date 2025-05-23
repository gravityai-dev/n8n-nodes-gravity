/**
 * Main entry point for n8n nodes
 */

// Import node classes
import { GravityClaude } from "./nodes/GravityClaude/GravityClaude.node";
import { GravityInput } from "./nodes/GravityInput/GravityInput.node";
import { GravityOutput } from "./nodes/GravityOutput/GravityOutput.node";
import { GravityUpdate } from "./nodes/GravityUpdate/GravityUpdate.node";
import { GravityEmbed } from "./nodes/GravityEmbed/GravityEmbed.node";
import { GravityOpenAI } from "./nodes/GravityOpenAI/GravityOpenAI.node";
// Using n8n's built-in AWS credentials
import { GravityApi } from "./credentials/GravityApi.credentials";

// Re-export for external use
export { GravityClaude } from "./nodes/GravityClaude/GravityClaude.node";
export { GravityInput } from "./nodes/GravityInput/GravityInput.node";
export { GravityOutput } from "./nodes/GravityOutput/GravityOutput.node";
export { GravityUpdate } from "./nodes/GravityUpdate/GravityUpdate.node";
export { GravityEmbed } from "./nodes/GravityEmbed/GravityEmbed.node";
export { GravityOpenAI } from "./nodes/GravityOpenAI/GravityOpenAI.node";
// Using n8n's built-in AWS credentials
export { GravityApi } from "./credentials/GravityApi.credentials";

// Export node and credential types for n8n
export const nodeTypes = [GravityClaude, GravityInput, GravityOutput, GravityUpdate, GravityEmbed, GravityOpenAI];

export const credentialTypes = [GravityApi];
