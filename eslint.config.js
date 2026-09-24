import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// shadcn/ui primitives are generated, not authored. They export variant objects
// alongside components (which react-refresh/only-export-components flags) and
// carry upstream's effect patterns. Hand-editing them to satisfy lint means
// losing the ability to regenerate, so the rules are scoped off here rather
// than the files being rewritten. hooks/use-toast.ts ships with the toast
// component and belongs to the same vendored surface.
const VENDORED = ['src/components/ui/**', 'src/hooks/use-toast.ts']

export default defineConfig([
  globalIgnores(['dist', 'stele-core/generated', 'stele-core/dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // A leading underscore is how this codebase already marks a binding as
      // deliberately discarded (see the destructure in src/lib/audit.ts).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],

      // Restored to 'error' 2026-09-19. It was 'warn' because App.tsx read
      // auditTrailRef during render — not reactive, and the source of the
      // audit-counter drift. The trail is now held in state and published
      // after each queued write, so nothing reads a ref while rendering and
      // the rule has no remaining exceptions to tolerate.
      //
      // Verified by probe that this rule does error on a plain ref read during
      // render. It does NOT flag a read through an accessor on the ref's value
      // (`queueRef.current.current()`), so that form is gated in evals/ instead
      // — lint alone would stay clean while the drift came back.
      'react-hooks/refs': 'error',
    },
  },
  {
    files: VENDORED,
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
