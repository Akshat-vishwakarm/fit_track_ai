import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authMiddleware } from './auth/authMiddleware.js';
import { handleSSE, handleMessages } from './mcp/sseHandler.js';
import { handleOpenApi } from './routes/openapi.js';
import { apiRouter } from './routes/apiRoutes.js';
import { allTools } from './tools/registry.js';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fittrack-ai-mcp-server',
    version: '2.0.0',
    total_tools: allTools.length,
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Root / Welcome & Discovery
app.get('/', (req, res) => {
  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  res.json({
    name: 'FitTrack AI — Model Context Protocol (MCP) Server',
    description:
      'Real-time authenticated MCP Server integrating ChatGPT with your live habits, weekly workout training split, nutrition meals, and body metrics.',
    endpoints: {
      health: `${baseUrl}/health`,
      mcp_sse: `${baseUrl}/sse`,
      mcp_messages: `${baseUrl}/messages`,
      openapi_spec: `${baseUrl}/openapi.json`,
      rest_api: `${baseUrl}/api/v1/tools`,
    },
    total_tools: allTools.length,
    instructions: {
      chatgpt_remote_mcp: `Connect ChatGPT Desktop / MCP Client to SSE endpoint: ${baseUrl}/sse?token=<YOUR_FITTRACK_TOKEN>`,
      chatgpt_custom_gpt: `Import OpenAPI specification into Custom GPT Actions: ${baseUrl}/openapi.json with Bearer Authentication.`,
    },
  });
});

// OpenAPI 3.0 specification for ChatGPT Actions
app.get('/openapi.json', handleOpenApi);

// Standard MCP Endpoints (Server-Sent Events)
app.get('/sse', authMiddleware, handleSSE);
app.post('/messages', authMiddleware, handleMessages);

// REST API Endpoints for ChatGPT Actions and direct calls
app.use('/api/v1', authMiddleware, apiRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start Server
app.listen(config.port, config.host, () => {
  console.log(`=======================================================`);
  console.log(`🚀 FitTrack AI MCP Server running on http://${config.host}:${config.port}`);
  console.log(`🔌 MCP SSE Endpoint:    http://${config.host}:${config.port}/sse`);
  console.log(`📋 OpenAPI Spec URL:    http://${config.host}:${config.port}/openapi.json`);
  console.log(`🛠️ Registered Tools:    ${allTools.length} total tools active`);
  console.log(`=======================================================`);
});

export default app;
