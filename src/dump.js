import { writeFileSync } from "fs"
import { LeveldbPersistence } from "y-leveldb"
import { getTypedYjsValue } from "./converttools.js"

async function main(persistenceDir, outputFile) {
    const ldb = new LeveldbPersistence(persistenceDir)
    const docNames = await ldb.getAllDocNames()
    const res = {}
    for (const docName of docNames) {
        console.info("# Document", docName)
        const doc = await ldb.getYDoc(docName)

        res[docName] = {}
        for (const key of Array.from(doc.share.keys())) {
            const value = getTypedYjsValue(doc, key)
            res[docName][key] = value.toJSON()
        }
    }
    const json = JSON.stringify(res, null, 2)
    writeFileSync(outputFile, json)
    console.info("# Dumped to", outputFile)
}

const args = process.argv.slice(2)

if (args.length == 2) {
    const [persistenceDir, outputFile] = args
    console.info('# Loading documents from "' + persistenceDir + '"')
    main(persistenceDir, outputFile).catch(console.error).then(() => console.info("# END"))
} else {
    console.info(`Usage: y-ldb-dump <persistence-dir/> <output-file.json>`)
    process.exit(1)
}


