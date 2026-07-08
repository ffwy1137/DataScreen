/**
 * 将 4 张原始 .dat（Tab 分隔，GBK 编码）导入 MySQL。
 * 用法：先起 MySQL 容器，再设置环境变量后运行：
 *   DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=*** DB_NAME=dc_monitor node scripts/importMysql.cjs
 * 依赖：mysql2、iconv-lite（npm i -D mysql2 iconv-lite）
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const iconv = require('iconv-lite')

const DAT_DIR = 'F:/scsx/data'
const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dc_monitor'
}

/** 读取 .dat（GBK）并按 Tab 解析为 { header, rows } */
function parseDat(file) {
  const buf = fs.readFileSync(path.join(DAT_DIR, file))
  const text = iconv.decode(buf, 'gbk')
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const header = lines[0].split('\t')
  const rows = lines.slice(1).map((line) => line.split('\t'))
  return { header, rows }
}

async function batchInsert(pool, table, columns, rows, toValues) {
  if (!rows.length) return 0
  const escapedColumns = columns.map(c => `\`${c}\``).join(',')
  const sql = `INSERT IGNORE INTO ${table} (${escapedColumns}) VALUES ?`
  const data = rows.map((r) => toValues(r))
  const [res] = await pool.query(sql, [data])
  return res.affectedRows
}

async function main() {
  const pool = await mysql.createPool({ ...DB, waitForConnections: true, connectionLimit: 10 })

  // 1) mod_detail
  {
    const { rows } = parseDat('mod_detail.dat')
    const n = await batchInsert(pool, 'mod_detail', ['mod', 'type', 'desc', 'unit', 'tag'], rows, (r) => [
      r[0], r[1], r[2], r[3], r[4]
    ])
    console.log('mod_detail inserted:', n)
  }

  // 2) host_detail
  {
    const { rows } = parseDat('host_detail.dat')
    const n = await batchInsert(
      pool,
      'host_detail',
      ['hostid', 'hostname', 'owner', 'model', 'location1', 'location2'],
      rows,
      (r) => [r[0], r[1], r[2], r[3], r[4], r[5]]
    )
    console.log('host_detail inserted:', n)
  }

  // 3) pref_tsar
  {
    const { rows } = parseDat('pref_tsar.dat')
    const n = await batchInsert(
      pool,
      'pref_tsar',
      ['ts', 'hostid', 'type', 'mod', 'value', 'tag'],
      rows,
      (r) => [Number(r[0]), r[1], r[2], r[3], Number(r[4]), r[5]]
    )
    console.log('pref_tsar inserted:', n)
  }

  // 4) disk_tsar
  {
    const { rows } = parseDat('disk_tsar.dat')
    const n = await batchInsert(
      pool,
      'disk_tsar',
      ['ts', 'hostid', 'type', 'mod', 'value', 'tag'],
      rows,
      (r) => [Number(r[0]), r[1], r[2], r[3], Number(r[4]), r[5]]
    )
    console.log('disk_tsar inserted:', n)
  }

  await pool.end()
  console.log('import done.')
}

main().catch((e) => {
  console.error('import failed:', e.message)
  process.exit(1)
})
