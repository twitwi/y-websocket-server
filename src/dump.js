import { writeFileSync } from "fs";
import { LeveldbPersistence } from "y-leveldb"
import { AbstractType, applyUpdate, applyUpdateV2, ContentFormat, ContentString, Doc, encodeStateAsUpdate, encodeStateAsUpdateV2, Map, Text } from "yjs"

// unreliable, see https://github.com/yjs/yjs-inspector/blob/52e2b53e5a451ca1cb5a816e0fb5c4d700238701/src/y-shape.ts#L11C8-L42C2
function guessType(abstractType) {
  if (abstractType.constructor === Array) {
    return Array;
  }
  if (abstractType.constructor === Map) {
    return Map;
  }
  if (abstractType._map.size) {
    return Map;
  }
  if (abstractType._length > 0) {
    const firstItem = abstractType._first;
    if (!firstItem) {
      console.error(
        "The length is greater than 0 but _first is not set",
        abstractType,
      );
      return AbstractType;
    }

    // Try distinguish between Text and Array
    // Only check the first element, it's unreliable!
    if (
      firstItem.content instanceof ContentString ||
      firstItem.content instanceof ContentFormat
    ) {
      return Text;
    }
    return Array;
  }
  return AbstractType;
}

function getTypedValue(doc, key) {
    return doc.get(key, guessType(doc.get(key)))
}

async function main(persistenceDir, outputFile) {
    const ldb = new LeveldbPersistence(persistenceDir)
    const docNames = await ldb.getAllDocNames()
    const res = {}
    for (const docName of docNames) {
        console.info("# Document", docName)
        const doc = await ldb.getYDoc(docName)

        res[docName] = {}
        for (const key of Array.from(doc.share.keys())) {
            const value = getTypedValue(doc, key)
            res[docName][key] = value.toJSON()
        }
    }
    const json = JSON.stringify(res, null, 2)
    writeFileSync(outputFile, json)
    console.info("# Dumped to", outputFile)
}

const args = process.argv.slice(2)
console.log(args)
if (args.length == 2) {
    const [persistenceDir, outputFile] = args
    console.info('# Loading documents from "' + persistenceDir + '"')
    main(persistenceDir, outputFile).catch(console.error).then(() => console.info("# END"))
} else {
    console.info(`Usage: y-ldb-dump <persistence-dir/> <output-file.json>`)
    process.exit(1)
}


