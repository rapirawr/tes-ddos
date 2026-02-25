import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set('trust proxy', true)

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const traffic: Record<string, number[]> = {}
const messages: string[] = []

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

  let messageList = ""
  messages.forEach(m => {
    messageList += `<p>${m}</p>`
  })

  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Traffic Monitor</title>
        <style>
body {
  font-family: system-ui, sans-serif;
  margin: 2rem;
  line-height: 1.6;
  background-color: #f5f5f5;
  color: #222;
}

h1 {
  margin-bottom: 0.5rem;
}

h2 {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

form {
  margin-bottom: 1rem;
}

input[type="text"] {
  padding: 0.5rem;
  width: 250px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 0.5rem 0.8rem;
  border: none;
  background-color: #333;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #555;
}

p {
  margin: 0.3rem 0;
  background: white;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
        </style>
      </head>
      <body>
        <h1 class="judul">Traffic Monitor</h1>
        <p>Your Public IP: <b>${publicIp}</b></p>

        <h2>Kirim Pesan</h2>
        <form method="POST" action="/submit">
          <input type="text" name="message" placeholder="ketik sesuatu" required />
          <button type="submit">Kirim</button>
        </form>

        <h2>Daftar Pesan</h2>
        ${messageList}

        <h2>Traffic</h2>
        ${trafficList}
      </body>
    </html>
  `)
})

app.post('/submit', (req: Request, res: Response) => {
  const message = req.body.message
  if (message) {
    messages.push(message)
  }
  res.redirect('/')
})

export default app
