fetch('http://localhost:4173/')
  .then((r) => r.text())
  .then((t) => {
    console.log('has #app:', t.includes('id="app"'))
    console.log('has js asset:', /\/assets\/[^"]+\.js/.test(t))
  })
  .catch((e) => {
    console.error('ERR', e.message)
    process.exit(1)
  })
