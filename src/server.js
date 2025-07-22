#!/usr/bin/env node

import WebSocket from 'ws'
import http from 'http'
import * as number from 'lib0/number'
import { setupWSConnection } from './utils.js'
import { getAccessMode, loadYaml } from './tokens.js'

function log(type, ...m) {
  console.log(`[${type}]`, ...m)
}

const wss = new WebSocket.Server({ noServer: true })
const host = process.env.HOST || 'localhost'
const port = number.parseInt(process.env.PORT || '1234')
const tokensFile = process.env.TOKENS || './tokens.yaml'

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('okay')
})

wss.on('connection', (conn, req, readOnly) => {
  return setupWSConnection(conn, req, { readOnly })
})


log('sv', 'Loading tokens...')
// TODO: consider reload if file changed
let tokens = loadYaml(tokensFile)
log('sv', 'Loaded', Object.values(tokens).length, 'rules')


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
  const access = getAccessMode(tokens, t, urlObject.pathname)
  log('cl', '⇒ access:', access)
  if (!access || access === 'denied') return error()

  wss.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
    wss.emit('connection', ws, request, access !== 'write')
  })
})

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`)
})
