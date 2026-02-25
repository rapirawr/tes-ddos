import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set('trust proxy', true)

const traffic: Record<string, number[]> = {}

app.use((req: Request, res: Response, next: NextFunction) => {
  const now = Date.now()

  let ip = ''

  const forwarded = req.headers['x-forwarded-for']

  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim()
  } else if (Array.isArray(forwarded)) {
    ip = forwarded[0]
  } else {
    ip = req.socket.remoteAddress || 'unknown'
  }

  if (!traffic[ip]) {
    traffic[ip] = []
  }

  traffic[ip].push(now)
  traffic[ip] = traffic[ip].filter(time => now - time < 5000)

  ;(req as any).publicIp = ip

  next()
})

app.get('/', (req: Request, res: Response) => {
  const publicIp = (req as any).publicIp

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
      </head>
      <body>
        <h1>Traffic Monitor</h1>
        <p>Your Public IP: <b>${publicIp}</b></p>
        ${trafficList}
      </body>
    </html>
  `)
})

export default app
