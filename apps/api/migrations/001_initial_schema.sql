CREATE TABLE IF NOT EXISTS auth_nonces (
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  PRIMARY KEY (wallet_address, nonce)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizer_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT,
  image_url TEXT,
  official_url TEXT,
  social_url TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  submitter_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  problem TEXT,
  solution TEXT,
  image_url TEXT,
  github_url TEXT,
  demo_url TEXT,
  presentation_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS awards (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  organizer_wallet TEXT NOT NULL,
  title TEXT NOT NULL,
  rank TEXT,
  reason TEXT,
  judging_summary TEXT,
  reward_token_address TEXT NOT NULL,
  reward_token_symbol TEXT NOT NULL,
  reward_token_decimals INTEGER NOT NULL,
  total_reward TEXT NOT NULL,
  claim_start TEXT NOT NULL,
  claim_end TEXT NOT NULL,
  metadata_uri TEXT,
  metadata_hash TEXT,
  contract_award_id TEXT,
  status TEXT NOT NULL,
  create_tx_hash TEXT,
  fund_tx_hash TEXT,
  finalize_tx_hash TEXT,
  superseded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS award_members (
  id TEXT PRIMARY KEY,
  award_id TEXT NOT NULL REFERENCES awards(id),
  display_name TEXT NOT NULL,
  email TEXT,
  wallet_address TEXT,
  allocation TEXT NOT NULL,
  invite_status TEXT NOT NULL,
  wallet_connected_at TEXT,
  claimed_at TEXT,
  claim_tx_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claim_invites (
  id TEXT PRIMARY KEY,
  award_member_id TEXT NOT NULL REFERENCES award_members(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_records (
  id TEXT PRIMARY KEY,
  award_id TEXT NOT NULL REFERENCES awards(id),
  transaction_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER,
  created_at TEXT NOT NULL
);
