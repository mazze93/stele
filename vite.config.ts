import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { createRequire } from 'module'
import path from 'path'

// package.json is the single source of truth for the version, because it is
// what `git tag v*` and release.yml actually publish against. src/lib/version.ts
// used to hold a hand-maintained copy and it silently missed the 1.1.0 bump, so
// every narrative export from that build was stamped with the previous version.
// Injecting it here means the constant cannot drift from the released artifact.
const pkg = createRequire(import.meta.url)('./package.json') as { version: string }

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  define: { __STELE_VERSION__: JSON.stringify(pkg.version) },
})
