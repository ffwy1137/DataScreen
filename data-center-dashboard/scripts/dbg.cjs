const dns = require('dns')
dns.lookup('127.0.0.1', (e, a, f) => console.log('lookup 127.0.0.1:', e && e.code, a, f))
const net = require('net')
const s = net.connect(3307, '127.0.0.1')
s.on('connect', () => {
  console.log('TCP connect 127.0.0.1:3307 OK')
  s.destroy()
})
s.on('error', (er) => console.log('TCP err:', er.code))
