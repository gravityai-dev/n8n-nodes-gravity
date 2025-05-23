import { ICredentialType, INodeProperties, ICredentialTestRequest, IAuthenticateGeneric } from "n8n-workflow";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export class GravityApi implements ICredentialType {
  name = "gravityApi";
  displayName = "Gravity GraphQL API";
  documentationUrl = "https://github.com/payner35/GravityN8nServer";

  properties: INodeProperties[] = [
    {
      displayName: "GraphQL Server URL",
      name: "serverUrl",
      type: "string",
      default: "http://host.docker.internal",
      placeholder: "http://host.docker.internal",
      description: "URL of your Gravity Server. Use http://host.docker.internal if running n8n in Docker.",
      required: true,
    },
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      default: "",
      description: "API key used for both GraphQL authentication and Redis password",
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        "x-api-key": "={{$credentials.apiKey}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.serverUrl}}",
      url: "/graphql",
      method: "POST",
      body: {
        query: "{ __schema { queryType { name } } }",
      },
    },
  };
}
