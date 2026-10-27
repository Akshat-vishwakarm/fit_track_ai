import { Router, Request, Response } from 'express';
import { allTools, executeTool } from '../tools/registry.js';
import type { UserContext } from '../types.js';

export const apiRouter = Router();

// List all tools
apiRouter.get('/tools', (req: Request, res: Response) => {
  res.json({
    total_tools: allTools.length,
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      is_write: !!t.isWrite,
    })),
  });
});

// Execute any tool over REST
apiRouter.post('/tools/:toolName', async (req: Request, res: Response) => {
  const toolName = req.params.toolName;
  const user: UserContext = req.userContext || {
    userId: 'default_user',
    role: 'user',
    readOnly: false,
  };

  try {
    const result = await executeTool(toolName, req.body || {}, user);
    res.json({
      success: true,
      tool: toolName,
      user_id: user.userId,
      result,
    });
  } catch (err: any) {
    console.error(`Tool execution error [${toolName}]:`, err.message);
    res.status(400).json({
      success: false,
      tool: toolName,
      error: err.message,
    });
  }
});
