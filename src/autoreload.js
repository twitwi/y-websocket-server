
import fs from 'fs'

export function createFileContentReader(path, loader, onReload=(...args)=>{}) {
    const getFileTime = () => fs.statSync(path).mtimeMs
    let time = getFileTime()
    let content = loader(path)
    return () => {
        const fileTime = getFileTime()
        if (time < fileTime) {
            time = fileTime
            content = loader(path)
            onReload(content, path, time)
        }
        return content
    }
}
