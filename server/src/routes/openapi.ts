import { Request, Response } from 'express';
import { allTools, zodToJsonSchema } from '../tools/registry.js';

export function getOpenApiSpec(req: Request) {
  const protocol = req.protocol;
  const host = req.get('host') || 'localhost:3001';
  const baseUrl = `${protocol}://${host}`;

  const paths: Record<string, any> = {};

  for (const tool of allTools) {
    const inputSchema = zodToJsonSchema(tool.parameters);

    paths[`/api/v1/tools/${tool.name}`] = {
      post: {
        summary: tool.name.replace(/_/g, ' '),
        description: tool.description,
        operationId: tool.name,
        tags: [tool.category.toUpperCase()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: inputSchema,
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful operation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input parameters',
          },
          '401': {
            description: 'Unauthorized - invalid or missing token',
          },
        },
      },
    };
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'FitTrack AI MCP & ChatGPT API',
      version: '2.0.0',
      description:
        'Live Model Context Protocol and REST API connecting ChatGPT to FitTrack AI. Provides deep access to habits, weekly workout splits, nutrition meal logs, body measurements, and active goals.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'FitTrack AI API Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT or API Key',
          description: 'FitTrack AI User Access Token (e.g. fittrack_live_<userId>)',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    paths,
  };
}

export function handleOpenApi(req: Request, res: Response) {
  const spec = getOpenApiSpec(req);
  res.json(spec);
}
