import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import type { UserContext } from '../types.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }
  const queryToken = req.query.token || req.query.api_key;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

export function resolveUserFromToken(token: string | null): UserContext | null {
  if (!token) {
    if (config.nodeEnv === 'development') {
      return {
        userId: config.auth.defaultDevUserId,
        name: 'Dev Athlete',
        email: 'dev@fittrack.ai',
        role: 'user',
        readOnly: false,
      };
    }
    return null;
  }

  // Token formats:
  // 1. "fittrack_live_<userId>" or "fittrack_live_<userId>__<secret>"
  if (token.startsWith('fittrack_live_')) {
    const raw = token.substring('fittrack_live_'.length);
    const userId = raw.includes('__') ? raw.split('__')[0] : raw;
    return {
      userId,
      role: 'user',
      readOnly: false,
    };
  }

  // 2. "fittrack_readonly_<userId>" or "fittrack_readonly_<userId>__<secret>"
  if (token.startsWith('fittrack_readonly_')) {
    const raw = token.substring('fittrack_readonly_'.length);
    const userId = raw.includes('__') ? raw.split('__')[0] : raw;
    return {
      userId,
      role: 'user',
      readOnly: true,
    };
  }

  // 3. Simple user id or custom key
  if (token.length > 2) {
    return {
      userId: token,
      role: 'user',
      readOnly: false,
    };
  }

  return null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow health check and root without authentication
  if (req.path === '/health' || req.path === '/' || req.path === '/openapi.json') {
    return next();
  }

  const token = extractAuthToken(req);
  const user = resolveUserFromToken(token);

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message:
        'Missing or invalid authentication token. Provide an Authorization: Bearer <API_KEY> header or ?token=<API_KEY> query parameter.',
      code: 'AUTH_REQUIRED',
    });
  }

  req.userContext = user;
  next();
}
