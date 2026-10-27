import { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcpServer.js';
import type { UserContext } from '../types.js';

// Map of active transports keyed by session ID
const activeTransports = new Map<string, SSEServerTransport>();

export async function handleSSE(req: Request, res: Response) {
  const user: UserContext = req.userContext || {
    userId: 'default_user',
    role: 'user',
    readOnly: false,
  };

  try {
    // SSEServerTransport takes the endpoint URL where client should send POST messages
    const transport = new SSEServerTransport('/messages', res);
    const server = createMcpServer(user);

    await server.connect(transport);

    const sessionId = transport.sessionId;
    activeTransports.set(sessionId, transport);
    console.log(`🔌 [MCP SSE] Client connected for user ${user.userId} (Session: ${sessionId})`);

    req.on('close', () => {
      console.log(`🔌 [MCP SSE] Client disconnected (Session: ${sessionId})`);
      activeTransports.delete(sessionId);
    });
  } catch (err) {
    console.error('Error establishing SSE transport:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish MCP SSE connection' });
    }
  }
}

export async function handleMessages(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;

  if (!sessionId || !activeTransports.has(sessionId)) {
    return res.status(404).json({
      error: 'Session not found or expired',
      message: 'Please re-establish SSE connection at /sse',
    });
  }

  const transport = activeTransports.get(sessionId)!;
  try {
    await transport.handlePostMessage(req, res);
  } catch (err: any) {
    console.error('Error handling MCP message:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error processing MCP message', details: err.message });
    }
  }
}
