import type { Project } from '@/lib/types'

export const PROJECTS: Project[] = [
  {
    id: 'secure-pride', label: 'Secure Pride', scope: 'SP',
    stack: 'Python · FreeRADIUS · step-ca · Mosyle · UniFi · Swift (MacProbe)',
    posture: 'MAX',
    compliance: ['GDPR','CCPA','SOGI','WCAG 2.1 AA'],
    hardStops: [
      'localStorage for sensitive data',
      'innerHTML with untrusted input',
      'SOGI attribute inference from behavioral data',
      'Unmasked identifiers in audit logs',
      'Any remote transmission from MacProbe',
      'WebAuthn bypass or password fallback on sensitive flows',
    ],
    openQuestions: [
      'Secure Pride 802.1x build order: FreeRADIUS+step-ca → UniFi → Mosyle → cert lifecycle validation',
    ],
    tesserae: [],
    root: '~/dev/secure-pride',
  },
  {
    id: 'mazzeleczzare', label: 'mazzeleczzare.com', scope: 'MZ',
    stack: 'Astro 5 · MDX · React 19 · TypeScript · Cloudflare Pages',
    posture: 'HIGH',
    compliance: ['No PII','WCAG 2.1 AA','No CLS'],
    hardStops: [
      'innerHTML with untrusted input',
      'CLS-causing asset loading patterns',
      'Leaking daedalus username in public-facing output',
    ],
    openQuestions: [
      'Signal & Cost essay: three structural questions unresolved from The Signal session',
    ],
    tesserae: [],
    root: '~/dev/mazzeleczzare.com',
  },
  {
    id: 'merchants-of-war', label: 'Merchants of War', scope: 'MOW',
    stack: 'HTML · vanilla JS · WebGL/Canvas · Box assets',
    posture: 'CREATIVE',
    compliance: ['No PII','MIT','Copyright-clean assets'],
    hardStops: ['innerHTML with untrusted input','Copyrighted assets without clearance'],
    openQuestions: [], tesserae: [],
    root: '~/dev/merchants-of-war',
  },
  {
    id: 'context-synapse', label: 'Context Synapse', scope: 'CS',
    stack: 'Swift 6.0+ · Bayesian · Core ML · local-only',
    posture: 'RESEARCH',
    compliance: ['No remote transmission','MIT','Local-only inference'],
    hardStops: [
      'Operational context inference — PERMANENT, ETHICAL BOUNDARY, no exceptions',
      'Any remote data transmission',
      'Collapse/distraction state detection',
    ],
    openQuestions: [
      'Affect vector integration: sync vs. async update behavior and Lighthouse pinning implications',
    ],
    tesserae: [],
    root: '~/dev/context-synapse',
  },
  {
    id: 'thesis-pipeline', label: 'Thesis Pipeline', scope: 'TP',
    stack: 'Python · EEG/ERP · eye tracking · RSA · IAPS · signal proxies',
    posture: 'RESEARCH',
    compliance: ['IRB-adjacent','Spatial masking required','No identifiable output'],
    hardStops: [
      'Identifiable output without spatial masking',
      'IAPS stimulus distribution',
      'Individual ground-truth claims without protocol citation',
    ],
    openQuestions: [], tesserae: [],
    root: '~/dev/thesis',
  },
  {
    id: 'tennis-919', label: 'Tennis 919', scope: 'T919',
    stack: 'Lightweight web · Google Workspace adjacent',
    posture: 'STANDARD',
    compliance: ['WCAG AA','COPPA-aware if youth present'],
    hardStops: ['Account walls on public content'],
    openQuestions: [], tesserae: [],
    root: '~/dev/tennis-919',
  },
  {
    id: 'directive-remixer', label: 'STELE / Directive Remixer', scope: 'DR',
    stack: 'React 19 · TypeScript · Vite · @dnd-kit · Anthropic API (Group 4)',
    posture: 'GUARDIAN',
    compliance: ['No PII','WCAG 2.1 AA','Adversarial input hardening required'],
    hardStops: [
      // Sequencing — non-negotiable, opening attack surface before gate exists
      'InheritPanel or CollaboratorPanel created before security.ts and extraction-schema.ts exist',
      'Any API call without the TOBIRA gate (gate() from security.ts) in front of it',
      'Applying extraction patch without diff-before-apply and per-section confirmation',
      'EPOCHÉ state dismissible without explicit reset through the tool',
      'customAppend written by any automated extraction — KAPU-003',
      'Locked escalation triggers disabled by patch — fire KAPU-002 immediately',
      // Lexicon integrity
      'Using clean/compromise/inherit/failure/safe/breach in compiled output strings or audit codes',
      // Architecture
      'integrityState transitions without appendEntry() to audit trail',
      'escalate() called without scanInput() having run first',
      'CSS hex values hardcoded in component code — use CSS vars only',
    ],
    openQuestions: [
      'Custom modes: SessionMode union → CustomMode data registry in modes.ts — Group 5, not started',
      'CollaboratorPanel: Claude-as-collaborator narrative extractor for project identity/philosophy fields — not started',
      'InheritPanel: paste zone with TOBIRA gate, diff view, per-section confirm, EPOCHÉ lockout chrome — not started',
      'extractor.ts: hardened API call, system prompt, response parser — not started',
      'EPOCHÉ chrome: full UI lockout, red chrome, reset-only path, no override — not started',
    ],
    tesserae: [
      {
        id: 'T-006',
        module: 'scanExtractionResponse() in src/lib/tripwires.ts',
        missingHalf: 'import and call in extractor.ts on API response payload before validatePatch()',
        blockedBy: 'extractor.ts does not exist yet (Group 4)',
        group: 4,
      },
      {
        id: 'T-009',
        module: 'integrityHash() in src/lib/integrity.ts — 32-bit djb2',
        missingHalf: 'upgrade to crypto.subtle.digest SHA-256 if audit hashes are compared programmatically; current strength adequate for human-read display',
        group: 2,
      },
      {
        id: 'T-010',
        module: 'tesserae field in src/lib/types.ts Project type',
        missingHalf: 'declared Tessera[] (required) but compiler.ts uses tesserae?.length — resolve: mark optional or remove optional chain',
        group: 1,
      },
    ],
    root: '~/dev/stele',
    // Narrative fields — authored from session context
    identity: 'STELE is a directive compiler and integrity telemetry tool. It compiles project configuration into egregores — governed Claude instruction sets that carry compliance posture, hard stops, design language, and ritual self-regulation language. The output of STELE governs future Claude behavior in sessions. The tool is the stele. Its output is the egregore.',
    philosophy: 'Intentional fragility over impermeability. The system is built to fail early, visibly, and informatively. Each TOBIRA activation is a diagnostic about the attacker — the failure carries information the way a honeypot does. EPOCHÉ is not defeat; it is the system making a philosophical choice to suspend its own operation because it cannot trust its own perception. Stopping under suspected compromise is the highest-value action available.',
    buildSequencing: 'Group 1 (security.ts, extraction-schema.ts) must exist and be reviewed before Group 4 (InheritPanel, CollaboratorPanel, extractor.ts) is created. This ordering is a security property not a preference. The attack surface does not open before the gate exists. Group 2 (wiring of escalate/scanInput/appendEntry) and Group 5 (custom modes) may proceed in parallel once Group 1 is complete.',
    unstatedConstraints: 'The lexicon is load-bearing security infrastructure. Deviation from ZANSHIN/UNHEIMLICH/WABI/EPOCHÉ vocabulary in compiled output strings or audit codes is itself a TOBIRA signal — it indicates the system is producing language outside its known register. CSS variables must be referenced by name in all component code because hardcoded hex values would break theme switching and signal a developer unfamiliar with the system. The coupling matrix in UtsuroiPanel is computed from real Jaccard vocabulary overlap — it is not decorative, it is a diagnostic showing which modules fire in correlated conditions.',
  },
]

export const POSTURE_META: Record<string, { color: string; label: string; description: string }> = {
  GUARDIAN: { color: '#7b52ab', label: 'GUARDIAN', description: 'Security-first. Adversarial input hardening. Lexicon integrity enforced. Build sequencing is governance.' },
  MAX:      { color: '#c0392b', label: 'MAX',      description: 'Full governance. SOGI/GDPR/CCPA. Escalate on unclear compliance.' },
  HIGH:     { color: '#a8862a', label: 'HIGH',     description: 'Design fidelity = code quality. Accessibility non-negotiable.' },
  CREATIVE: { color: '#2d7a6e', label: 'CREATIVE', description: 'Narrative fidelity leads. Code serves story. Full visual capability.' },
  RESEARCH: { color: '#5b8fc9', label: 'RESEARCH', description: 'Document tradeoffs. Flag foreclosed options. Skepticism is a feature.' },
  STANDARD: { color: '#7a7a7a', label: 'STANDARD', description: 'Lowest friction. Plain language. Mobile-first.' },
}
