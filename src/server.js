#!/usr/bin/env node

import WebSocket from 'ws'
import fs from 'fs'
import http from 'http'
import * as number from 'lib0/number'
import { setupWSConnection } from './utils.js'
import YAML from 'yaml'
import { z } from 'zod'

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

let tokens = loadTokens() // token -> regexp(ordered) -> mode


server.on('upgrade', (request, socket, head) => {

  const error = () => {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
  }

  // See https://github.com/websockets/ws#client-authentication

  const { url } = request
  if (url === undefined) return error()
  const urlObject = new URL('https://example.com'+url)
  const t = urlObject.searchParams.get('t') ?? ''
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
  if (!access || access === 'denied') return error()

  wss.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
    wss.emit('connection', ws, request, access !== 'write')
  })
})

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`)
})
