/**
 * Node Metadata Constants
 * Shared constants for Gravity node metadata
 */

export const GRAVITY_NODE_VERSION = 1;
export const GRAVITY_NODE_CATEGORY = ["ai"];

// Node types
export const NODE_TYPE = {
  INPUT: "gravityInput",
  UPDATE: "gravityUpdate",
  OUTPUT: "gravityOutput",
  CLAUDE: "gravityClaude",
  AGENT: "gravityAgent",
};

// Node display names
export const NODE_DISPLAY_NAME = {
  INPUT: "Gravity Input",
  UPDATE: "Gravity Update",
  OUTPUT: "Gravity Output",
  CLAUDE: "Gravity Claude",
  AGENT: "Gravity Agent",
};

// Node subtitles
export const NODE_SUBTITLE = {
  INPUT: "AI Inputs",
  UPDATE: "AI Updates",
  OUTPUT: "AI Outputs",
  CLAUDE: "Claude AI",
  AGENT: "Agent Communication",
};

// Node descriptions
export const NODE_DESCRIPTION = {
  INPUT: "Starts a new Gravity GraphQL Agent workflow with user input and session tracking",
  UPDATE: "Sends progress updates during a Gravity workflow",
  OUTPUT: "Finalizes a Gravity agent session with structured output",
  CLAUDE: "Streams responses from Claude via AWS Bedrock",
  AGENT: "Communicates with Gravity server via service bus",
};

// Import the Icon type from n8n-workflow
import type { Icon } from "n8n-workflow";

// Node icon paths using the proper Icon type structure with 'file:' prefix
export const NODE_ICON: Record<string, Icon> = {
  INPUT: { light: "file:gravity.svg", dark: "file:gravity.svg" },
  UPDATE: { light: "file:gravity.svg", dark: "file:gravity.svg" },
  OUTPUT: { light: "file:gravity.svg", dark: "file:gravity.svg" },
  CLAUDE: { light: "file:gravity.svg", dark: "file:gravity.svg" },
  AGENT: { light: "file:gravity.svg", dark: "file:gravity.svg" },
};

// Default timeout in seconds
export const DEFAULT_TIMEOUT = 60;
