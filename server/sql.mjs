export const SQL = {
  challenge: {
    sqlite: 'INSERT INTO challenges VALUES (?,?,?,?,0) ON CONFLICT(email,purpose) DO UPDATE SET hash=excluded.hash,expires=excluded.expires,attempts=0',
    mysql: 'INSERT INTO challenges VALUES (?,?,?,?,0) ON DUPLICATE KEY UPDATE hash=VALUES(hash),expires=VALUES(expires),attempts=0',
  },
  register: {
    sqlite: 'INSERT OR IGNORE INTO users(id,email,password,created_at) VALUES (?,?,?,?)',
    mysql: 'INSERT IGNORE INTO users(id,email,password,created_at) VALUES (?,?,?,?)',
  },
  stripeEvent: {
    sqlite: 'INSERT OR IGNORE INTO stripe_events VALUES (?,?)',
    mysql: 'INSERT IGNORE INTO stripe_events VALUES (?,?)',
  },
  refundAI: {
    sqlite: 'UPDATE users SET ai_used=MAX(0,ai_used-1) WHERE id=?',
    mysql: 'UPDATE users SET ai_used=GREATEST(0,ai_used-1) WHERE id=?',
  },
  socialConnection: {
    sqlite: 'INSERT INTO social_connections VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET encrypted=excluded.encrypted',
    mysql: 'INSERT INTO social_connections VALUES (?,?) ON DUPLICATE KEY UPDATE encrypted=VALUES(encrypted)',
  },
};
