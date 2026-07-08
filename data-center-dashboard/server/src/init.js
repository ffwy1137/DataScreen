import fs from 'fs'
import path from 'path'
import db from './db.js'

const DATA_DIR = path.join(process.cwd(), 'data')

async function ensureData() {
  const cnt = await db.query('SELECT COUNT(*) as cnt FROM host_detail')
  if (cnt[0]?.cnt > 0) {
    console.log(`Data already initialized (host_detail=${cnt[0].cnt} rows)`)
    return
  }

  console.log('Initializing database from JSON data...')

  const mods = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'mod_detail.json'), 'utf-8'))
  const hosts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'host_detail.json'), 'utf-8'))
  const pref = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'pref_tsar.json'), 'utf-8'))
  const disk = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'disk_tsar.json'), 'utf-8'))

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      'INSERT IGNORE INTO `mod_detail` (`mod`, `type`, `desc`, `unit`, `tag`) VALUES ?',
      [mods.map(m => [m.mod, m.type, m.desc, m.unit, m.tag])]
    )
    console.log(`mod_detail inserted: ${mods.length}`)

    await conn.query(
      'INSERT IGNORE INTO `host_detail` (`hostid`, `hostname`, `owner`, `model`, `location1`, `location2`) VALUES ?',
      [hosts.map(h => [h.hostid, h.hostname, h.owner, h.model, h.location1, h.location2])]
    )
    console.log(`host_detail inserted: ${hosts.length}`)

    const prefChunks = chunkArray(pref, 5000)
    for (const chunk of prefChunks) {
      await conn.query(
        'INSERT IGNORE INTO `pref_tsar` (`ts`, `hostid`, `type`, `mod`, `value`, `tag`) VALUES ?',
        [chunk.map(r => [r.ts, r.hostid, r.type, r.mod, r.value, r.tag])]
      )
    }
    console.log(`pref_tsar inserted: ${pref.length}`)

    const diskChunks = chunkArray(disk, 5000)
    for (const chunk of diskChunks) {
      await conn.query(
        'INSERT IGNORE INTO `disk_tsar` (`ts`, `hostid`, `type`, `mod`, `value`, `tag`) VALUES ?',
        [chunk.map(r => [r.ts, r.hostid, r.type, r.mod, r.value, r.tag])]
      )
    }
    console.log(`disk_tsar inserted: ${disk.length}`)

    await conn.commit()
    console.log('Data initialization complete.')
  } catch (err) {
    await conn.rollback()
    console.error('Data initialization failed:', err)
    throw err
  } finally {
    conn.release()
  }
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export { ensureData }
