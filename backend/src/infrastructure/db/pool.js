import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';
import crypto from 'node:crypto';

// ─── Connection pool ────────────────────────────────────────
const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  // Return DATETIME as JS Date, DECIMAL as number
  decimalNumbers: true,
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) return field.string() === '1';
    return next();
  },
});

// ─── ID Generator (CUID-like) ───────────────────────────────
// Prisma used cuid() — we replicate with a 25-char random id
export function cuid() {
  return 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
}

// ─── Helper: execute ─────────────────────────────────────────
// Returns [rows, fields] for SELECT, or { affectedRows, insertId } for INSERT/UPDATE/DELETE
export async function query(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

// ─── Helper: get one row or null ─────────────────────────────
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// ─── Helper: transaction ─────────────────────────────────────
export async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ─── Helper: execute on a specific connection (within txn) ──
export async function connQuery(conn, sql, params = []) {
  const [result] = await conn.execute(sql, params);
  return result;
}

export async function connQueryOne(conn, sql, params = []) {
  const rows = await connQuery(conn, sql, params);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// ─── Pool accessor (for shutdown, health checks) ─────────────
export { pool as db };
export default pool;
