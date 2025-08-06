import { readFileSync } from "fs"
import { LeveldbPersistence } from "y-leveldb"
import { createYMapFromObject } from "./converttools.js"
import { encodeStateAsUpdate, encodeStateAsUpdateV2 } from "yjs"

async function main(persistenceDir, docname, inputJsonPath, docnameInJson) {
  const ldb = new LeveldbPersistence(persistenceDir)
  const docNames = await ldb.getAllDocNames()
  if (docNames.includes(docname)) {
    throw "Cannot load " + docname + ", it already exists"
  }
  const json = JSON.parse(readFileSync(inputJsonPath, "utf8"))[docnameInJson]
  if (json === undefined) {
    throw "Key not found in JSON"
  }
  //console.log(JSON.stringify(json, null, 2))
  const doc = await ldb.getYDoc(docname)
  for (const k in json) {
    //console.log("key: ", k)
    if (Array.isArray(json[k])) {
      throw "TODO implement root arrays"
    } else if (typeof json[k] === "object") {
        doc.transact(() => {
            const map = doc.getMap(k)
            //console.log("before: ", map.toJSON())
            createYMapFromObject(json[k], map)
            //console.log("after: ", map.toJSON())
        })
        ldb.storeUpdate(docname, encodeStateAsUpdate(doc))
    } else {
      throw "TODO implement root non-objects???"
    }
  }
  console.info("# Imported into ", docname)
}

const args = process.argv.slice(2)

if (args.length == 3 || args.length == 4) {
  const [persistenceDir, docname, inputJsonPath] = args
  const docnameInJson = args.length == 4 ? args[3] : docname
  console.info(`# Working on "${persistenceDir}", will import into ${docname} from JSON ${inputJsonPath} key ${docnameInJson}`)
  main(persistenceDir, docname, inputJsonPath, docnameInJson)
    .catch((...a) => { console.error("### EXCEPTION:", ...a) ; console.log("# Abort because of exception") })
    .then(() => console.info("# END"))
} else {
  console.info(
    `Usage: y-ldb-load <persistence-dir/> <docname> <input-file.json> [<docnameInJson>]`
  )
  process.exit(1)
}
