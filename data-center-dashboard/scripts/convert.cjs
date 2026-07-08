const fs = require('fs');
const path = require('path');

const SRC = 'F:/scsx/data';
const OUT = 'F:/scsx/data/data-center-dashboard/src/mock';

function parseDat(file, cols) {
  const text = fs.readFileSync(path.join(SRC, file), 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines[0].split('\t');
  const rows = lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cells[i];
    });
    return obj;
  });
  return rows;
}

// pref_tsar + disk_tsar: numeric value, number ts
const pref = parseDat('pref_tsar.dat');
const disk = parseDat('disk_tsar.dat');
const hosts = parseDat('host_detail.dat');
const mods = parseDat('mod_detail.dat');

const numPref = pref.map((r) => ({ ts: Number(r.ts), hostid: r.hostid, type: r.type, mod: r.mod, value: Number(r.value), tag: r.tag }));
const numDisk = disk.map((r) => ({ ts: Number(r.ts), hostid: r.hostid, type: r.type, mod: r.mod, value: Number(r.value), tag: r.tag }));

function writeJson(name, data) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data));
  console.log(name, data.length, 'rows');
}

writeJson('pref_tsar.json', numPref);
writeJson('disk_tsar.json', numDisk);
writeJson('host_detail.json', hosts);
writeJson('mod_detail.json', mods);
