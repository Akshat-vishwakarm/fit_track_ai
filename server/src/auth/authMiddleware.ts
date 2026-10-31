import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import type { UserContext } from '../types.js';
import { tokenService, validateTokenFormat } from './tokenService.js';

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

export async function resolveUserFromTokenAsync(token: string | null): Promise<{
  user: UserContext | null;
  error?: string;
  code?: string;
}> {
  if (!token) {
    return { user: null, error: 'Missing authentication token', code: 'AUTH_REQUIRED' };
  }

  // 1. New Personal API Token format: "ft_live_<64 hex chars>"
  if (token.startsWith('ft_live_')) {
    const verification = await tokenService.verifyAndResolveToken(token);
    if (!verification.valid || !verification.record) {
      return {
        user: null,
        error: verification.error || 'Invalid or revoked personal API token',
        code: verification.code || 'TOKEN_INVALID',
      };
    }

    // Touch token asynchronously
    tokenService.touchToken(verification.record.token_hash).catch(() => {});

    return {
      user: {
        userId: verification.record.user_id,
        role: 'user',
        readOnly: false,
        tokenRecord: verification.record,
      },
    };
  }

  // 2. Legacy MCP tokens for backward compatibility
  if (token.startsWith('fittrack_live_')) {
    const raw = token.substring('fittrack_live_'.length);
    const userId = raw.includes('__') ? raw.split('__')[0] : raw;
    return {
      user: {
        userId,
        role: 'user',
        readOnly: false,
      },
    };
  }

  if (token.startsWith('fittrack_readonly_')) {
    const raw = token.substring('fittrack_readonly_'.length);
    const userId = raw.includes('__') ? raw.split('__')[0] : raw;
    return {
      user: {
        userId,
        role: 'user',
        readOnly: true,
      },
    };
  }

  // 3. Admin / dev master secret or test user prefix (in test / dev)
  if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
    if (token === config.auth.apiKeySecret) {
      return {
        user: {
          userId: config.auth.defaultDevUserId,
          role: 'user',
          readOnly: false,
        },
      };
    }
    if (token.startsWith('test_user_')) {
      return {
        user: {
          userId: token,
          role: 'user',
          readOnly: false,
        },
      };
    }
  }

  return {
    user: null,
    error: 'Unrecognized authentication token format',
    code: 'TOKEN_INVALID',
  };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow health check, root, openapi, and token management endpoints through
  if (
    req.path === '/health' ||
    req.path === '/' ||
    req.path === '/openapi.json' ||
    req.path === '/api/v1/openapi.json' ||
    req.path.startsWith('/tokens') ||
    req.path.startsWith('/api/v1/tokens') ||
    req.method === 'OPTIONS'
  ) {
    const token = extractAuthToken(req);
    if (token) {
      const resUser = await resolveUserFromTokenAsync(token);
      if (resUser.user) {
        req.userContext = resUser.user;
      }
    }
    return next();
  }

  const token = extractAuthToken(req);
  const result = await resolveUserFromTokenAsync(token);

  if (!result.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: result.error || 'Missing or invalid authentication token. Provide an Authorization: Bearer <PERSONAL_API_TOKEN> header.',
      code: result.code || 'AUTH_REQUIRED',
    });
  }

  req.userContext = result.user;
  next();
}

/** Synchronous helper retained for tests that call resolveUserFromToken directly */
export function resolveUserFromToken(token: string | null): UserContext | null {
  if (!token) return null;
  if (token.startsWith('fittrack_live_')) {
    const raw = token.substring('fittrack_live_'.length);
    const userId = raw.includes('__') ? raw.split('__')[0] : raw;
    return { userId, role: 'user', readOnly: false };
  }
  if (token.startsWith('fittrack_readonly_')) {
    const raw = token.substring('fittrack_readonly_'.length);
    const userId = raw.includes('__') ? raw.split('__')[0] : raw;
    return { userId, role: 'user', readOnly: true };
  }
  if (token.length > 2) {
    return { userId: token, role: 'user', readOnly: false };
  }
  return null;
}
