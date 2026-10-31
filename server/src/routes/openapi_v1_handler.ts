import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function handleOpenApiV1(req: Request, res: Response) {
  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}/api/v1`;

  try {
    const filePath = path.join(__dirname, 'openapi_v1.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const spec = JSON.parse(content);

    // Dynamic server URL
    spec.servers = [
      { url: baseUrl, description: 'Current FitTrack Server' },
      { url: 'https://fittrack-ai-mcp.onrender.com/api/v1', description: 'Production Render Backend' },
    ];

    res.json(spec);
  } catch (err: any) {
    res.status(500).json({ error: 'Could not load OpenAPI specification', message: err.message });
  }
}

