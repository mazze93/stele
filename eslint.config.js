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

      // Warn, not error, and deliberately not off. App.tsx reads auditTrailRef
      // during render — the ref itself is intentional (the audit trail must not
      // re-render the app on every appended entry), but reading it during
      // render is not reactive, which is the known audit-counter drift. That
      // fix is a UI-layer refactor tracked separately; until it lands the rule
      // stays visible in lint output instead of being silenced. Restore to
      // 'error' once App.tsx no longer reads the ref during render.
      'react-hooks/refs': 'warn',
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
