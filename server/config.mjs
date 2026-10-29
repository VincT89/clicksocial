import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { isPrivateAddress } from '../shared/mobile-config.mjs';

export function loadConfig(overrides = {}) {
  const root = resolve(import.meta.dirname, '..');
  if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
  const env = process.env;
  const dataDir = resolve(root, overrides.dataDir || env.DATA_DIR || 'data');
  const config = {
    root, dataDir, port: Number(env.PORT || 8787), host: '127.0.0.1',
    origin: env.APP_ORIGIN || 'http://127.0.0.1:5180',
    localMode: env.LOCAL_MODE === undefined ? env.NODE_ENV !== 'production' : env.LOCAL_MODE !== 'false',
    lanMode: false,
    proxyMode: env.PROXY_MODE || 'none',
    scheduler: env.SCHEDULER_ENABLED !== 'false',
    openaiKey: env.OPENAI_API_KEY || '', textModel: env.AI_TEXT_MODEL || '', imageModel: env.AI_IMAGE_MODEL || '',
    stripeKey: env.STRIPE_SECRET_KEY || '', stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '', stripePriceId: env.STRIPE_PRICE_ID || '',
    googleId: env.GOOGLE_CLIENT_ID || '', googleSecret: env.GOOGLE_CLIENT_SECRET || '',
    metaId: env.META_APP_ID || '', metaSecret: env.META_APP_SECRET || '', metaVersion: env.META_GRAPH_VERSION || 'v25.0',
    metaLoginConfigId: env.META_LOGIN_CONFIG_ID || '',
    instagramId: env.INSTAGRAM_APP_ID || '', instagramSecret: env.INSTAGRAM_APP_SECRET || '',
    tiktokKey: env.TIKTOK_CLIENT_KEY || '', tiktokSecret: env.TIKTOK_CLIENT_SECRET || '',
    smtpHost: env.SMTP_HOST || '', smtpPort: Number(env.SMTP_PORT || 587), smtpSecure: env.SMTP_SECURE === 'true',
    smtpUser: env.SMTP_USER || '', smtpPass: env.SMTP_PASSWORD || '', mailFrom: env.MAIL_FROM || '',
    ...overrides,
  };
  if (env.LOCAL_MODE !== undefined && !['true', 'false'].includes(env.LOCAL_MODE)) throw new Error('LOCAL_MODE deve essere true oppure false.');
  if (env.SCHEDULER_ENABLED !== undefined && !['true', 'false'].includes(env.SCHEDULER_ENABLED)) throw new Error('SCHEDULER_ENABLED deve essere true oppure false.');
  if (env.NODE_ENV === 'production' && config.localMode) throw new Error('In produzione imposta LOCAL_MODE=false e APP_ORIGIN con il dominio HTTPS.');
  if (!['none', 'passenger'].includes(config.proxyMode)) throw new Error('PROXY_MODE deve essere none oppure passenger.');
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) throw new Error('PORT deve essere una porta numerica valida.');
  let origin;
  try { origin = new URL(config.origin); } catch { throw new Error('APP_ORIGIN deve contenere un indirizzo HTTP o HTTPS completo.'); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN deve contenere solo protocollo e dominio, senza credenziali, percorsi o parametri.');
  config.origin = origin.origin;
  const publicDataPath = relative(join(config.root, 'dist'), config.dataDir);
  if (!config.localMode && (publicDataPath === '' || !isAbsolute(publicDataPath) && publicDataPath !== '..' && !publicDataPath.startsWith('..' + sep))) throw new Error('DATA_DIR deve restare fuori dalla cartella pubblica dist.');
  config.dbDriver = String(overrides.dbDriver ?? env.DB_DRIVER ?? 'sqlite').toLowerCase();
  config.mysql = {
    host: env.MYSQL_HOST || '127.0.0.1', port: Number(env.MYSQL_PORT || 3306),
    database: env.MYSQL_DATABASE || '', user: env.MYSQL_USER || '', password: env.MYSQL_PASSWORD || '',
    ssl: env.MYSQL_SSL === 'true', ca: env.MYSQL_SSL_CA || '', ...overrides.mysql,
  };
  if (!['sqlite', 'mysql'].includes(config.dbDriver)) throw new Error('DB_DRIVER deve essere sqlite oppure mysql.');
  if (config.lanMode && (!config.localMode || !isPrivateAddress(new URL(config.origin).hostname) || !isPrivateAddress(config.host))) throw new Error('Il collaudo Wi-Fi richiede un indirizzo privato esplicito.');
  if (config.localMode && !config.lanMode && !['localhost', '127.0.0.1'].includes(new URL(config.origin).hostname)) throw new Error('LOCAL_MODE richiede un indirizzo localhost.');
  if (!config.localMode && !config.origin.startsWith('https://')) throw new Error('Fuori dalla modalita locale serve APP_ORIGIN HTTPS.');
  /** Valida prima di creare file: un avvio di produzione errato non deve inizializzare dati. */
  mkdirSync(join(dataDir, 'uploads'), { recursive: true });
  const keyFile = join(dataDir, '.encryption-key');
  if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
  const key = readFileSync(keyFile, 'utf8').trim();
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Chiave di cifratura locale non valida.');
  config.encryptionKey = overrides.encryptionKey ?? Buffer.from(key, 'hex');
  if (config.encryptionKey.length !== 32) throw new Error('Chiave di cifratura locale non valida.');
  return config;
}
