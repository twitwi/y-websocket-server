import { LeveldbPersistence } from "y-leveldb"

async function main(persistenceDir, docname) {
    const ldb = new LeveldbPersistence(persistenceDir)
    const docNames = await ldb.getAllDocNames()
    if (!docNames.includes(docname)) {
        console.log("# Cannot delete "+docname+", it does not exist")
        console.log("# Doc names:", docNames)
        return
    }
    ldb.clearDocument(docname)
    console.info("# Deleted ", docname)
}

const args = process.argv.slice(2)

if (args.length == 2) {
    const [persistenceDir, docname] = args
    console.info('# Working on "' + persistenceDir + '", will delete ' + docname)
    main(persistenceDir, docname).catch(console.error).then(() => console.info("# END"))
} else {
    console.info(`Usage: y-ldb-drop <persistence-dir/> <docname>`)
    process.exit(1)
}


