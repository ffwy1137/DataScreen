import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dc_monitor',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function getMaxTs() {
  const rows = await query('SELECT MAX(ts) as max_ts FROM pref_tsar')
  return rows[0]?.max_ts || 0
}

export async function countTable(table) {
  const rows = await query(`SELECT COUNT(*) as cnt FROM ${table}`)
  return rows[0]?.cnt || 0
}

export default pool
