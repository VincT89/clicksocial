// Ordine usato anche dalla migrazione: le tabelle figlie seguono users.
export const TABLES = ['users', 'sessions', 'challenges', 'posts', 'files', 'ai_logs', 'social_connections', 'oauth_states', 'oauth_identities', 'stripe_events', 'mail'];

export const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT, verified INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user', plan TEXT NOT NULL DEFAULT 'free', ai_used INTEGER NOT NULL DEFAULT 0,
    profile TEXT NOT NULL DEFAULT '{}', stripe_customer_id TEXT, stripe_subscription_id TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS challenges (email TEXT NOT NULL, purpose TEXT NOT NULL, hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(email,purpose));
  CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS posts_user ON posts(user_id,created_at);
  CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, mime TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS ai_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS social_connections (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, encrypted TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS oauth_states (hash TEXT PRIMARY KEY, provider TEXT NOT NULL, data TEXT NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS oauth_identities (provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(provider,subject));
  CREATE TABLE IF NOT EXISTS stripe_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS mail (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
  PRAGMA user_version=1;
`;

const engine = 'ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
const id = 'VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const hash = 'VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin';
const date = 'VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin';
export const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS clicksocial_meta (id INT PRIMARY KEY, schema_version INT NOT NULL, key_hash ${hash} NOT NULL) ${engine}`,
  `CREATE TABLE IF NOT EXISTS users (
    id ${id} PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password VARCHAR(255), verified TINYINT NOT NULL DEFAULT 0,
    role VARCHAR(20) NOT NULL DEFAULT 'user', plan VARCHAR(20) NOT NULL DEFAULT 'free', ai_used INT NOT NULL DEFAULT 0,
    profile LONGTEXT NOT NULL DEFAULT ('{}'), stripe_customer_id VARCHAR(255), stripe_subscription_id VARCHAR(255), created_at ${date} NOT NULL,
    CHECK (JSON_VALID(profile))
  ) ${engine}`,
  `CREATE TABLE IF NOT EXISTS sessions (hash ${hash} PRIMARY KEY, user_id ${id} NOT NULL, expires BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX sessions_expires (expires)) ${engine}`,
  `CREATE TABLE IF NOT EXISTS challenges (email VARCHAR(254) NOT NULL, purpose VARCHAR(32) NOT NULL, hash ${hash} NOT NULL,
    expires BIGINT NOT NULL, attempts INT NOT NULL DEFAULT 0, PRIMARY KEY(email,purpose)) ${engine}`,
  `CREATE TABLE IF NOT EXISTS posts (id ${id} PRIMARY KEY, user_id ${id} NOT NULL, data LONGTEXT NOT NULL,
    created_at ${date} NOT NULL, updated_at ${date} NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX posts_user (user_id,created_at), CHECK (JSON_VALID(data))) ${engine}`,
  `CREATE TABLE IF NOT EXISTS files (id ${id} PRIMARY KEY, user_id ${id} NOT NULL, mime VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL,
    size BIGINT NOT NULL, created_at ${date} NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${engine}`,
  `CREATE TABLE IF NOT EXISTS ai_logs (id ${id} PRIMARY KEY, user_id ${id} NOT NULL, data LONGTEXT NOT NULL, created_at ${date} NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX ai_logs_created (created_at), CHECK (JSON_VALID(data))) ${engine}`,
  `CREATE TABLE IF NOT EXISTS social_connections (user_id ${id} PRIMARY KEY, encrypted LONGTEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${engine}`,
  `CREATE TABLE IF NOT EXISTS oauth_states (hash ${hash} PRIMARY KEY, provider VARCHAR(32) NOT NULL, data LONGTEXT NOT NULL,
    expires BIGINT NOT NULL, CHECK (JSON_VALID(data))) ${engine}`,
  `CREATE TABLE IF NOT EXISTS oauth_identities (provider VARCHAR(32) NOT NULL, subject VARCHAR(255) NOT NULL, user_id ${id} NOT NULL,
    PRIMARY KEY(provider,subject), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${engine}`,
  `CREATE TABLE IF NOT EXISTS stripe_events (id VARCHAR(255) PRIMARY KEY, created_at ${date} NOT NULL) ${engine}`,
  `CREATE TABLE IF NOT EXISTS mail (id ${id} PRIMARY KEY, recipient VARCHAR(254) NOT NULL, subject TEXT NOT NULL, body LONGTEXT NOT NULL,
    created_at ${date} NOT NULL, INDEX mail_created (created_at)) ${engine}`,
];
