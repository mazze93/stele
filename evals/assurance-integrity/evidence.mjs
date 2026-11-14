// Evidence is recorded at emission time; never walk and reopen mutable paths.
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

export function createEvidenceWriter(directory) {
  const root = resolve(directory)
  mkdirSync(dirname(root), { recursive: true })
  // Atomic creation rejects existing directories, files, and directory symlinks.
  // The caller chooses a trusted parent; this is not same-user process isolation.
  mkdirSync(root, { mode: 0o700 })
  const files = Object.create(null)
  function emit(name, content, includeInManifest) {
    const target = resolve(root, name)
    const local = relative(root, target)
    if (!local || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) {
      throw new Error('EPOCHÉ: evidence path leaves the run directory')
    }
    const bytes = Buffer.from(content)
    // No existence check before creation: wx is O_CREAT|O_EXCL and rejects links.
    writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 })
    if (includeInManifest) files[local] = createHash('sha256').update(bytes).digest('hex')
  }
  return {
    write(name, content) {
      if (name === 'manifest.json') throw new Error('EPOCHÉ: reserved manifest path')
      emit(name, content, true)
    },
    finalize() {
      emit('manifest.json', JSON.stringify({ algorithm: 'sha256', files }, null, 2) + '\n', false)
    },
  }
}
