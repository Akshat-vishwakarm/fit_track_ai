import crypto from 'crypto';
import type { PersonalApiTokenRecord, TokenGenerationResult, TokenPublicMetadata } from './tokenTypes.js';
import { firestoreClient } from '../db/firestoreClient.js';

// Fast in-memory lookup index for tokens (keyed by token_hash)
const tokenHashIndex = new Map<string, PersonalApiTokenRecord>();
// Keyed by user_id to easily manage per-user tokens
const userTokenIndex = new Map<string, PersonalApiTokenRecord[]>();

const DEFAULT_RATE_LIMIT_MINUTE = parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '30', 10);
const DEFAULT_RATE_LIMIT_DAY = parseInt(process.env.API_RATE_LIMIT_PER_DAY || '100', 10);
const DEFAULT_TOKEN_EXPIRY_DAYS = parseInt(process.env.API_TOKEN_EXPIRY_DAYS || '90', 10);

export function hashToken(plaintextToken: string): string {
  return crypto.createHash('sha256').update(plaintextToken).digest('hex');
}

export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // Format: "ft_live_" followed by 64 hex characters (256 bits of entropy)
  const regex = /^ft_live_[a-f0-9]{64}$/;
  return regex.test(token);
}

export const tokenService = {
  /**
   * Generates a new cryptographically secure Personal API Token for a user.
   * Uses 256 bits of CSPRNG entropy.
   * Stored ONLY as a SHA-256 hash. Plaintext token is returned EXACTLY ONCE.
   */
  async generatePersonalToken(
    userId: string,
    options?: { name?: string; expiresInDays?: number }
  ): Promise<TokenGenerationResult> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required to generate personal API token');
    }

    // Revoke any existing active tokens for this user to enforce single-active-token policy
    await this.revokeUserTokens(userId);

    // Generate 32 bytes (256 bits) of cryptographic random entropy
    const randomEntropyHex = crypto.randomBytes(32).toString('hex');
    const plaintextToken = `ft_live_${randomEntropyHex}`;
    const tokenHash = hashToken(plaintextToken);
    const tokenPrefix = `ft_live_${randomEntropyHex.substring(0, 8)}...`;

    const now = new Date();
    const expiryDays = options?.expiresInDays ?? DEFAULT_TOKEN_EXPIRY_DAYS;
    const expiresAt = typeof options?.expiresInDays === 'number'
      ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : expiryDays > 0
      ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const recordId = 'tok_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

    const record: PersonalApiTokenRecord = {
      id: recordId,
      user_id: userId,
      name: options?.name || 'Personal AI Assistant',
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      created_at: now.toISOString(),
      last_used_at: null,
      expires_at: expiresAt,
      revoked: false,
      revoked_at: null,
      rate_limit: {
        requests_per_minute: DEFAULT_RATE_LIMIT_MINUTE,
        requests_per_day: DEFAULT_RATE_LIMIT_DAY,
      },
    };

    // Store in memory index
    tokenHashIndex.set(tokenHash, record);
    const userTokens = userTokenIndex.get(userId) || [];
    userTokens.push(record);
    userTokenIndex.set(userId, userTokens);

    // Persist hash record to Firestore if available
    try {
      const colRef = firestoreClient.getUserCol(userId, 'apiTokens');
      if (colRef) {
        // Safe to store hash record in Firestore (plaintext token is never stored)
        const { ...safeRecord } = record;
        await firestoreClient.saveHabit(userId, safeRecord as any).catch(() => {});
      }
    } catch {
      // Ignore background persistence errors
    }

    // Return the plaintext token and safe metadata (without token_hash)
    const { token_hash: _, ...safeMetadata } = record;
    return {
      token: plaintextToken,
      record: safeMetadata,
    };
  },

  /**
   * Verifies and resolves a plaintext bearer token to its user context.
   */
  async verifyAndResolveToken(plaintextToken: string): Promise<{
    valid: boolean;
    record?: PersonalApiTokenRecord;
    error?: string;
    code?: string;
  }> {
    if (!validateTokenFormat(plaintextToken)) {
      return {
        valid: false,
        error: 'Invalid token format. Personal API tokens must start with "ft_live_" followed by 64 hexadecimal characters.',
        code: 'TOKEN_FORMAT_INVALID',
      };
    }

    const tokenHash = hashToken(plaintextToken);
    const record = tokenHashIndex.get(tokenHash);

    if (!record) {
      return {
        valid: false,
        error: 'Personal API token not found or unrecognized.',
        code: 'TOKEN_NOT_FOUND',
      };
    }

    if (record.revoked) {
      return {
        valid: false,
        error: `Personal API token was revoked on ${record.revoked_at || 'an earlier date'}.`,
        code: 'TOKEN_REVOKED',
      };
    }

    if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
      return {
        valid: false,
        error: `Personal API token expired on ${record.expires_at}. Please generate a new token.`,
        code: 'TOKEN_EXPIRED',
      };
    }

    return {
      valid: true,
      record,
    };
  },

  /**
   * Revokes all active tokens for a given user.
   */
  async revokeUserTokens(userId: string): Promise<boolean> {
    const userTokens = userTokenIndex.get(userId) || [];
    const nowIso = new Date().toISOString();
    let anyRevoked = false;

    for (const record of userTokens) {
      if (!record.revoked) {
        record.revoked = true;
        record.revoked_at = nowIso;
        tokenHashIndex.set(record.token_hash, record);
        anyRevoked = true;
      }
    }

    return anyRevoked;
  },

  /**
   * Updates last_used_at timestamp on a token record when successfully used.
   */
  async touchToken(tokenHash: string): Promise<void> {
    const record = tokenHashIndex.get(tokenHash);
    if (record) {
      record.last_used_at = new Date().toISOString();
      tokenHashIndex.set(tokenHash, record);
    }
  },

  /**
   * Retrieves current token public metadata for a user (for Settings UI).
   */
  async getUserTokenMetadata(userId: string): Promise<TokenPublicMetadata | null> {
    const userTokens = userTokenIndex.get(userId) || [];
    if (userTokens.length === 0) return null;

    // Get the most recently created token
    const latest = [...userTokens].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    const isExpired = latest.expires_at ? new Date(latest.expires_at).getTime() < Date.now() : false;
    const status: TokenPublicMetadata['status'] = latest.revoked
      ? 'revoked'
      : isExpired
      ? 'expired'
      : 'active';

    return {
      id: latest.id,
      user_id: latest.user_id,
      name: latest.name,
      token_prefix: latest.token_prefix,
      created_at: latest.created_at,
      last_used_at: latest.last_used_at,
      expires_at: latest.expires_at,
      revoked: latest.revoked,
      revoked_at: latest.revoked_at,
      status,
    };
  },
};
