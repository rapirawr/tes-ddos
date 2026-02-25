import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set('trust proxy', true)

const traffic = {}

app.use((req, res, next) => {
  const now = Date.now()
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress

  if (!traffic[ip]) {
    traffic[ip] = []
  }

  traffic[ip].push(now)
  traffic[ip] = traffic[ip].filter(time => now - time < 5000)

  req.publicIp = ip

  next()
})

app.get('/', (req, res) => {
  let trafficList = ""

  for (let ip in traffic) {
    let count = traffic[ip].length
    let status = count > 20 ? "SUSPICIOUS" : "NORMAL"
    trafficList += `<p>${ip} - ${count} requests (5s) - ${status}</p>`
  }

  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Express on Vercel</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/api-data">API Data</a>
          <a href="/healthz">Health</a>
        </nav>

        <h1>Welcome to Express on Vercel</h1>
        <p>Your Public IP: <b>${req.publicIp}</b></p>

        <h2>Traffic Monitor (5s window)</h2>
        ${trafficList}

        <img src="/logo.png" alt="Logo" width="120" />
      </body>
    </html>
  `)
})

app.get('/about', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'))
})

app.get('/api-data', (req, res) => {
  res.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
    yourIp: req.publicIp
  })
})

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
