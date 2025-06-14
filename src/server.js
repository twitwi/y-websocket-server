#!/usr/bin/env node

import WebSocket from 'ws'
import fs from 'fs'
import http from 'http'
import * as number from 'lib0/number'
import { setupWSConnection } from './utils.js'
import YAML from 'yaml'
import { z } from 'zod'

function log(type, ...m) {
  console.log(`[${type}]`, ...m)
}

const wss = new WebSocket.Server({ noServer: true })
const host = process.env.HOST || 'localhost'
const port = number.parseInt(process.env.PORT || '1234')

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('okay')
})

wss.on('connection', (conn, req, readOnly) => {
  return setupWSConnection(conn, req, { readOnly })
})

const zToken = z.string()
const zAccessType = z.union([z.literal('read'), z.literal('write'), z.literal('denied')])
const zTokenMap = z.record(z.string(), z.record(zAccessType)) // token -> regexp -> mode

function loadTokens(path='tokens.yaml') {
  const file = fs.readFileSync(path, 'utf8')
  return zTokenMap.parse(YAML.parse(file))
}

log('sv', 'Loading tokens...')
let tokens = loadTokens() // token -> regexp(ordered) -> mode
log('sv', 'Loaded', Object.values(tokens).length, 'tokens with', Object.values(tokens).map(o => Object.values(o).length).reduce((a,b)=>a+b, 0), 'rules')


server.on('upgrade', (request, socket, head) => {

  const error = () => {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
  }

  // See https://github.com/websockets/ws#client-authentication

  log('cl', 'Receiving connection…')
  const { url } = request
  if (url === undefined) return error()
  const urlObject = new URL('https://example.com'+url)
  const t = urlObject.searchParams.get('t') ?? ''
  log('cl', '| path:', urlObject.pathname, '; token length:', t.length)
  if (!(t in tokens)) return error()
  let access = undefined
  for (const [regex, mode] of Object.entries(tokens[t])) {
    const re = new RegExp(regex)
    const match = re.test(urlObject.pathname)
    if (match) {
      access = mode
      break
    }
  }
  log('cl', '⇒ access:', access)
  if (!access || access === 'denied') return error()

  wss.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
    wss.emit('connection', ws, request, access !== 'write')
  })
})

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`)
})
