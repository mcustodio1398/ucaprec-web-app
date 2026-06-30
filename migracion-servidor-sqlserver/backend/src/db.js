import sql from "mssql";

const config = {
  server: process.env.SQLSERVER_HOST,
  port: Number(process.env.SQLSERVER_PORT || 1433),
  database: process.env.SQLSERVER_DATABASE,
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  options: {
    encrypt: process.env.SQLSERVER_ENCRYPT === "true",
    trustServerCertificate: process.env.SQLSERVER_TRUST_CERT !== "false",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

export function getPool() {
  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

export { sql };

export async function runQuery(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  return request.query(text);
}

export async function withTransaction(callback) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export function txRequest(transaction, params = {}) {
  const request = new sql.Request(transaction);
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  return request;
}
