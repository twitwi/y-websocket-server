
# What the fork?

This is a fork of y-websocket-server (README below), with

- a configuration file `tokens.yaml` (`TOKENS=tokens.yaml`), to define authentication tokens
- the token can be passed by the client as a suffix in the room name (`roomname?t=....`)

Dev notes

- to run token.js tests: `TEST=1 node src/tokens.js`
- to query tokens: `TOKENS=./tokens_test.yaml FOR="Tfine-bob-BADHASH /FINESHARE/stuff" node src/tokens.js`
- multiple ones is a possibility: `TOKENS=./tokens_test.yaml FOR="Ttest_roBADHASH /DOCS/gabu" node src/tokens.js`
- reconstruct the token: `echo Ttest_$(TOKENS=./tokens_test.yaml FOR="Ttest_BADHASH /DOCS/gabuzomeu" node src/tokens.js )`
- loop it: `for f in stuff other/stuff ; do for w in bob troy abed britta ; do echo example.com::/FINESHARE/$f::Tfine-$w-$(TOKENS=./tokens_test.yaml FOR="Tfine-$w-BADHASH /FINESHARE/$f" node src/tokens.js) ; done ; done`
---

(original README)

---

# y-websocket-server :tophat:
> Simple backend for [y-websocket](https://github.com/yjs/y-websocket)

The Websocket Provider is a solid choice if you want a central source that
handles authentication and authorization. Websockets also send header
information and cookies, so you can use existing authentication mechanisms with
this server.

## Quick Start

### Install dependencies

```sh
npm i @y/websocket-server
```

### Start a y-websocket server

This repository implements a basic server that you can adopt to your specific use-case. [(source code)](./src/)

Start a y-websocket server:

```sh
HOST=localhost PORT=1234 npx y-websocket
```

### Client Code:

```js
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const wsProvider = new WebsocketProvider('ws://localhost:1234', 'my-roomname', doc)

wsProvider.on('status', event => {
  console.log(event.status) // logs "connected" or "disconnected"
})
```

## Websocket Server

Start a y-websocket server:

```sh
HOST=localhost PORT=1234 npx y-websocket
```

Since npm symlinks the `y-websocket` executable from your local `./node_modules/.bin` folder, you can simply run npx. The `PORT` environment variable already defaults to 1234, and `HOST` defaults to `localhost`.

### Websocket Server with Persistence

Persist document updates in a LevelDB database.

See [LevelDB Persistence](https://github.com/yjs/y-leveldb) for more info.

```sh
HOST=localhost PORT=1234 YPERSISTENCE=./dbDir npx y-websocket
```

### Websocket Server with HTTP callback

Send a debounced callback to an HTTP server (`POST`) on document update. Note that this implementation doesn't implement a retry logic in case the `CALLBACK_URL` does not work.

Can take the following ENV variables:

* `CALLBACK_URL` : Callback server URL
* `CALLBACK_DEBOUNCE_WAIT` : Debounce time between callbacks (in ms). Defaults to 2000 ms
* `CALLBACK_DEBOUNCE_MAXWAIT` : Maximum time to wait before callback. Defaults to 10 seconds
* `CALLBACK_TIMEOUT` : Timeout for the HTTP call. Defaults to 5 seconds
* `CALLBACK_OBJECTS` : JSON of shared objects to get data (`'{"SHARED_OBJECT_NAME":"SHARED_OBJECT_TYPE}'`)

```sh
CALLBACK_URL=http://localhost:3000/ CALLBACK_OBJECTS='{"prosemirror":"XmlFragment"}' npm start
```
This sends a debounced callback to `localhost:3000` 2 seconds after receiving an update (default `DEBOUNCE_WAIT`) with the data of an XmlFragment named `"prosemirror"` in the body.

## License

[The MIT License](./LICENSE) © Kevin Jahns
