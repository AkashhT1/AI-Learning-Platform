const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'vidyaai_db',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,           // Required for Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;
let usingMockData = false;

async function getPool() {
  if (usingMockData) return null;
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');
    return pool;
  } catch (err) {
    console.warn('⚠️  Database connection failed — using mock data for demo');
    console.warn('   Error:', err.message);
    usingMockData = true;
    return null;
  }
}

async function query(queryString, params = {}) {
  const p = await getPool();
  if (!p) return null; // caller should fall back to mock

  const request = p.request();
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  return request.query(queryString);
}

function isMockMode() {
  return usingMockData || !process.env.DB_SERVER;
}

module.exports = { getPool, query, isMockMode, sql };
