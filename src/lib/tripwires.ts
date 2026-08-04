// === TOBIRA REGISTRY ===
// 13 named tripwires. Adding attack surface = adding a TOBIRA here.
// Never patch ad-hoc. Coupling matrix derived from vocabulary Jaccard overlap.

import type { StateTransition } from './integrity'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type Tobira = {
  id: string
  name: string
  glyph: string
  description: string
  pattern: RegExp | ((input: string) => boolean)
  confidence: ConfidenceLevel
  transition: StateTransition
  message: string
  auditCode: string
  moduleId: string
  vocabulary: string[]
}

export const TOBIRA_REGISTRY: Tobira[] = [
  {
    id: 'TW-001', name: 'KAPU-OVERRIDE', glyph: 'K',
    description: 'Explicit instruction to ignore, override, or bypass directives',
    pattern: /ignore\s+(previous|all|prior|above)|override\s+(this|all|the)|bypass\s+(filter|restrict|govern|safe|lock)/i,
    confidence: 'high', transition: 'EPOCHÉ',
    message: 'Explicit governance override detected in input.',
    auditCode: 'KAPU-001', moduleId: 'kapu-enforcer',
    vocabulary: ['override','bypass','ignore','instruction','filter','restrict'],
  },
  {
    id: 'TW-002', name: 'KAPU-LOCKED', glyph: 'K',
    description: 'Patch attempting to disable a locked escalation trigger',
    pattern: (input: string) => {
      try {
        const p = JSON.parse(input)
        return Array.isArray(p?.escalationTriggers) &&
          p.escalationTriggers.some((t: {locked?:boolean;enabled?:boolean}) => t.locked === true && t.enabled === false)
      } catch { return false }
    },
    confidence: 'high', transition: 'EPOCHÉ',
    message: 'Patch attempted to disable a locked governance trigger.',
    auditCode: 'KAPU-002', moduleId: 'kapu-enforcer',
    vocabulary: ['locked','enabled','trigger','patch','disable','governance'],
  },
  {
    id: 'TW-003', name: 'KAPU-CUSTOMPATCH', glyph: 'K',
    description: 'Extraction patch writing directly to customAppend',
    pattern: (input: string) => {
      try { const p = JSON.parse(input); return typeof p?.customAppend === 'string' && p.customAppend.trim().length > 0 }
      catch { return false }
    },
    confidence: 'high', transition: 'EPOCHÉ',
    message: 'Extraction attempted to write instructions to customAppend.',
    auditCode: 'KAPU-003', moduleId: 'kapu-enforcer',
    vocabulary: ['customAppend','append','inject','write','patch'],
  },
  {
    id: 'TW-004', name: 'NARIKIRI-SYSTEM', glyph: 'N',
    description: 'SYSTEM role claim or authority impersonation',
    pattern: /<\|im_start\||<\|system\||SYSTEM:|system prompt:|as (an? )?(ai|assistant|claude|anthropic)|you are now|from this point|new persona/i,
    confidence: 'high', transition: 'EPOCHÉ',
    message: 'Identity or authority impersonation detected.',
    auditCode: 'NARIKIRI-001', moduleId: 'narikiri-detector',
    vocabulary: ['system','persona','identity','role','authority','impersonate'],
  },
  {
    id: 'TW-005', name: 'NARIKIRI-ADMIN', glyph: 'N',
    description: 'False admin or developer authority claim',
    pattern: /admin (override|mode|access|key)|developer mode|anthropic (staff|team|engineer|override)|authorized by|pre-?authorized/i,
    confidence: 'high', transition: 'WABI',
    message: 'False administrative authority claim detected.',
    auditCode: 'NARIKIRI-002', moduleId: 'narikiri-detector',
    vocabulary: ['admin','authority','authorized','developer','override','staff'],
  },
  {
    id: 'TW-006', name: 'PALIMPSEST-COMMENT', glyph: 'P',
    description: 'Instructions hidden in HTML/XML comment blocks',
    pattern: /<!--[\s\S]*?(instruction|ignore|system|override|bypass|directive)[\s\S]*?-->/i,
    confidence: 'high', transition: 'WABI',
    message: 'Instruction hidden in comment block detected.',
    auditCode: 'PALIMPSEST-001', moduleId: 'palimpsest-scanner',
    vocabulary: ['comment','hidden','instruction','directive','embedded'],
  },
  {
    id: 'TW-007', name: 'PALIMPSEST-ENCODED', glyph: 'P',
    description: 'Base64 or encoded blocks that may conceal instructions',
    pattern: /[A-Za-z0-9+/]{40,}={0,2}(?:\s|$)/,
    confidence: 'low', transition: 'UNHEIMLICH',
    message: 'Encoded content block detected — may conceal instructions.',
    auditCode: 'PALIMPSEST-002', moduleId: 'palimpsest-scanner',
    vocabulary: ['encoded','base64','hidden','obfuscated','concealed'],
  },
  {
    id: 'TW-008', name: 'KOTODAMA-FILTER', glyph: '言',
    description: 'Governance-adjacent language attempting to act as directive',
    pattern: /this project (requires?|needs?|must have|depends on)\s+.*(disabl|remov|bypass|ignor|permissiv|unrestrict)/i,
    confidence: 'medium', transition: 'UNHEIMLICH',
    message: 'Natural language attempting to function as governance directive.',
    auditCode: 'KOTODAMA-001', moduleId: 'kotodama-watcher',
    vocabulary: ['requires','directive','governance','language','instruction','filter'],
  },
  {
    id: 'TW-009', name: 'APOCRYPHA-APIKEY', glyph: 'Λ',
    description: 'API key or token pattern in pasted content',
    // `-` is last in the class, so it is a literal and needs no escape. This is
    // a lint fix, not a detection change — the matched language is identical.
    pattern: /(?:sk-|pk_|rk_|ghp_|gho_|ghu_|ghs_|ghr_|eyJ)[A-Za-z0-9_-]{20,}|(?:api[_-]?key|api[_-]?secret|access[_-]?token)\s*[:=]\s*[^\s]{16,}/i,
    confidence: 'high', transition: 'WABI',
    message: 'Credential or API key pattern detected. Content blocked.',
    auditCode: 'APOCRYPHA-001', moduleId: 'apocrypha-scanner',
    vocabulary: ['credential','secret','token','key','api','sensitive'],
  },
  {
    id: 'TW-010', name: 'APOCRYPHA-PRIVKEY', glyph: 'Λ',
    description: 'Private key or certificate material',
    pattern: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----|-----BEGIN CERTIFICATE-----/,
    confidence: 'high', transition: 'EPOCHÉ',
    message: 'Private key or certificate material detected. Full stop.',
    auditCode: 'APOCRYPHA-002', moduleId: 'apocrypha-scanner',
    vocabulary: ['private','key','certificate','credential','sensitive','secret'],
  },
  {
    id: 'TW-011', name: 'FJÚKA-SELFREFERENCE', glyph: 'F',
    description: 'Extraction model speaking about itself or its constraints',
    pattern: /as (an? )?(ai|language model|llm|assistant)|my (training|guidelines?|constraints?|values?)|i (cannot|can't|am not able|am unable|should not)/i,
    confidence: 'medium', transition: 'UNHEIMLICH',
    message: 'Extraction model self-referential drift detected in response.',
    auditCode: 'FJÚKA-001', moduleId: 'fjuka-monitor',
    vocabulary: ['self-reference','model','drift','constraint','training','guidelines'],
  },
  {
    id: 'TW-012', name: 'YUGAMI-SCHEMA', glyph: '歪',
    description: 'API response deviates from expected DirectiveStatePatch schema',
    pattern: (input: string) => {
      try {
        const p = JSON.parse(input)
        const ALLOWED = new Set(['activeProjectIds','sessionMode','verbosity','openQuestions','themeId','hygieneTrigger'])
        const FORBIDDEN = ['escalationTriggers','outputSections','customAppend','outputTarget','integrityState','firedTobiraIds']
        return Object.keys(p).some(k => FORBIDDEN.includes(k) || !ALLOWED.has(k))
      } catch { return false }
    },
    confidence: 'medium', transition: 'WABI',
    message: 'Extraction response contains unexpected or forbidden schema fields.',
    auditCode: 'YUGAMI-001', moduleId: 'yugami-validator',
    vocabulary: ['schema','structure','field','validation','format','response'],
  },
  {
    id: 'TW-013', name: 'TESSITURA-DENSITY', glyph: 'T',
    description: 'Extraction response contains more structure than source warrants',
    pattern: (input: string) => {
      try { return Object.keys(JSON.parse(input)).length > 4 }
      catch { return false }
    },
    confidence: 'low', transition: 'UNHEIMLICH',
    message: 'Extraction density exceeds source material scope.',
    auditCode: 'TESSITURA-001', moduleId: 'tessitura-meter',
    vocabulary: ['density','field','scope','extraction','volume','structure'],
  },
]

export type UtsuroiModule = {
  id: string; name: string; nameGlyph: string
  category: string; description: string; tobiraIds: string[]
}

export const UTSUROI_MODULES: UtsuroiModule[] = [
  { id:'kapu-enforcer',     name:'KAPU',       nameGlyph:'禁', category:'Boundary',    description:'Hard limit enforcement. The sacred prohibition layer.',           tobiraIds:['TW-001','TW-002','TW-003'] },
  { id:'narikiri-detector', name:'NARIKIRI',   nameGlyph:'な', category:'Identity',    description:'Authority and identity impersonation detection.',                 tobiraIds:['TW-004','TW-005'] },
  { id:'palimpsest-scanner',name:'PALIMPSEST', nameGlyph:'P',  category:'Concealment', description:'Hidden instruction detection. The text beneath the text.',        tobiraIds:['TW-006','TW-007'] },
  { id:'kotodama-watcher',  name:'KOTODAMA',   nameGlyph:'言', category:'Language',    description:'Language-as-spell detection. Words attempting to act.',           tobiraIds:['TW-008'] },
  { id:'apocrypha-scanner', name:'APOCRYPHA',  nameGlyph:'Λ',  category:'Secrets',     description:'Credential and sensitive material detection.',                    tobiraIds:['TW-009','TW-010'] },
  { id:'fjuka-monitor',     name:'FJÚKA',      nameGlyph:'F',  category:'Drift',       description:"Model drift detection. Watching for the wind that moves the ship.",tobiraIds:['TW-011'] },
  { id:'yugami-validator',  name:'YUGAMI',     nameGlyph:'歪', category:'Structure',   description:'Schema distortion detection. The warping of expected form.',       tobiraIds:['TW-012'] },
  { id:'tessitura-meter',   name:'TESSITURA',  nameGlyph:'T',  category:'Density',     description:'Extraction density anomaly. Voice exceeding its natural range.',  tobiraIds:['TW-013'] },
]

function jaccardSimilarity(a: string[], b: string[]): number {
  const sa = new Set(a); const sb = new Set(b)
  const intersection = [...sa].filter(x => sb.has(x)).length
  const union = new Set([...a,...b]).size
  return union === 0 ? 0 : intersection / union
}

function buildModuleVocabulary(mod: UtsuroiModule): string[] {
  return TOBIRA_REGISTRY.filter(t => mod.tobiraIds.includes(t.id)).flatMap(t => t.vocabulary)
}

export function computeCouplingMatrix(): number[][] {
  const size = UTSUROI_MODULES.length
  const vocabs = UTSUROI_MODULES.map(buildModuleVocabulary)
  const m = Array(size).fill(null).map(() => Array(size).fill(0))
  for (let i = 0; i < size; i++) {
    for (let j = i; j < size; j++) {
      const s = i === j ? 1.0 : parseFloat(jaccardSimilarity(vocabs[i], vocabs[j]).toFixed(3))
      m[i][j] = s; m[j][i] = s
    }
  }
  return m
}

export type ScanResult = {
  fired: Tobira[]
  clean: boolean
  secretsDetected: boolean   // boolean only — never store what was found
}

// TW-001–TW-011: adversarial text detection for user paste content
const PASTE_IDS = new Set(['TW-001','TW-002','TW-003','TW-004','TW-005','TW-006','TW-007','TW-008','TW-009','TW-010','TW-011'])
// TW-012–TW-013: schema/density validation for extraction API responses only
const EXTRACTION_IDS = new Set(['TW-012','TW-013'])

function runScan(input: string, ids: Set<string>): ScanResult {
  const fired: Tobira[] = []
  let secretsDetected = false
  for (const t of TOBIRA_REGISTRY) {
    if (!ids.has(t.id)) continue
    const matched = t.pattern instanceof RegExp ? t.pattern.test(input) : t.pattern(input)
    if (matched) {
      fired.push(t)
      if (t.moduleId === 'apocrypha-scanner') secretsDetected = true
    }
  }
  return { fired, clean: fired.length === 0, secretsDetected }
}

// Call from gate() on raw user paste input
export function scanPasteInput(input: string): ScanResult { return runScan(input, PASTE_IDS) }

// Call from extractor.ts on API response payloads — never on user paste
export function scanExtractionResponse(input: string): ScanResult { return runScan(input, EXTRACTION_IDS) }
