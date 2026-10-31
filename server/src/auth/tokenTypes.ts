export interface PersonalApiTokenRecord {
  id: string; // Unique token ID (e.g., 'tok_...')
  user_id: string; // Associated Firebase UID
  name?: string; // Optional friendly label (e.g., "Personal ChatGPT Assistant")
  token_prefix: string; // First 12 chars for display (e.g. "ft_live_9f83")
  token_hash: string; // SHA-256 cryptographic hash of the plaintext token
  created_at: string; // ISO 8601 timestamp
  last_used_at: string | null; // ISO 8601 timestamp or null
  expires_at: string | null; // ISO 8601 timestamp or null
  revoked: boolean; // Revocation flag
  revoked_at: string | null; // ISO 8601 timestamp or null
  rate_limit: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}

export interface TokenGenerationResult {
  token: string; // PLAINTEXT TOKEN - RETURNED ONCE AND NEVER STORED
  record: Omit<PersonalApiTokenRecord, 'token_hash'>;
}

export interface TokenPublicMetadata {
  id: string;
  user_id: string;
  name?: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
  status: 'active' | 'revoked' | 'expired';
}
