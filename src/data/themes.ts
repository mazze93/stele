export type ThemeId = 'cipher-gothic' | 'secure-pride' | 'operators-terminal' | 'vellum-smoke' | 'signal-blue'

export type Theme = {
  id: ThemeId; label: string; description: string
  projectHint?: string; moodTags: string[]
  fonts: { headingFamily: string; monoFamily: string; googleUrl: string }
  vars: Record<string, string>
}

export const THEMES: Theme[] = [
  {
    id: 'cipher-gothic', label: 'Cipher Gothic',
    description: 'Obsidian depth. Teal signal. Gold accent. The default register.',
    projectHint: 'mazzeleczzare.com', moodTags: ['personal','literary','precise'],
    fonts: {
      headingFamily: '"Cormorant Garamond", Georgia, serif',
      monoFamily: '"Martian Mono", "Courier New", monospace',
      googleUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Martian+Mono:wght@300;400;500&display=swap',
    },
    vars: {
      '--cipher':'#1a1714','--cipher-raised':'#201d19','--surface':'#242019','--surface-raised':'#2c2820',
      '--vellum':'#f4f0e8','--vellum-dim':'rgba(244,240,232,0.58)','--vellum-faint':'rgba(244,240,232,0.28)',
      '--teal':'#2d7a6e','--teal-bright':'#5ccfcf','--gold':'#a8862a','--gold-bright':'#c9a83c',
      '--coral':'#f07178','--border-color':'rgba(244,240,232,0.10)',
      '--heading-font':'"Cormorant Garamond", Georgia, serif','--mono-font':'"Martian Mono", "Courier New", monospace',
    },
  },
  {
    id: 'secure-pride', label: 'Secure Pride',
    description: 'Deep slate. Amber trust. Rose inclusion. Live edge table quality.',
    projectHint: 'secure-pride', moodTags: ['trustworthy','warm','inclusive','accessible'],
    fonts: {
      headingFamily: '"Libre Baskerville", Georgia, serif',
      monoFamily: '"IBM Plex Mono", "Courier New", monospace',
      googleUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap',
    },
    vars: {
      '--cipher':'#111c27','--cipher-raised':'#172030','--surface':'#1c2a38','--surface-raised':'#243448',
      '--vellum':'#e8f0f7','--vellum-dim':'rgba(232,240,247,0.60)','--vellum-faint':'rgba(232,240,247,0.30)',
      '--teal':'#2a7a8a','--teal-bright':'#4db8c4','--gold':'#d4872a','--gold-bright':'#f0a030',
      '--coral':'#c85080','--border-color':'rgba(232,240,247,0.10)',
      '--heading-font':'"Libre Baskerville", Georgia, serif','--mono-font':'"IBM Plex Mono", "Courier New", monospace',
    },
  },
  {
    id: 'operators-terminal', label: 'Operators Terminal',
    description: 'Near-black. Phosphor green. Zero ceremony. Infra ops register.',
    projectHint: 'secure-pride (infra)', moodTags: ['technical','ops','infra','no-nonsense'],
    fonts: {
      headingFamily: '"Share Tech Mono", "Courier New", monospace',
      monoFamily: '"Share Tech Mono", "Courier New", monospace',
      googleUrl: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap',
    },
    vars: {
      '--cipher':'#080b08','--cipher-raised':'#0c110c','--surface':'#101810','--surface-raised':'#162016',
      '--vellum':'#33ff57','--vellum-dim':'rgba(51,255,87,0.55)','--vellum-faint':'rgba(51,255,87,0.25)',
      '--teal':'#009933','--teal-bright':'#00e040','--gold':'#ccaa00','--gold-bright':'#ffdd00',
      '--coral':'#ff3333','--border-color':'rgba(51,255,87,0.12)',
      '--heading-font':'"Share Tech Mono", "Courier New", monospace','--mono-font':'"Share Tech Mono", "Courier New", monospace',
    },
  },
  {
    id: 'vellum-smoke', label: 'Vellum & Smoke',
    description: 'Parchment ground. Ink text. Smoke accents. Editorial reading mode.',
    projectHint: 'mazzeleczzare.com (writing)', moodTags: ['editorial','light','literary','writing'],
    fonts: {
      headingFamily: '"Playfair Display", Georgia, serif',
      monoFamily: '"Courier Prime", "Courier New", monospace',
      googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap',
    },
    vars: {
      '--cipher':'#f0ebe0','--cipher-raised':'#e8e1d4','--surface':'#e0d9ca','--surface-raised':'#d6cdb8',
      '--vellum':'#261a0a','--vellum-dim':'rgba(38,26,10,0.60)','--vellum-faint':'rgba(38,26,10,0.35)',
      '--teal':'#1a5e52','--teal-bright':'#197060','--gold':'#7a5210','--gold-bright':'#9a6818',
      '--coral':'#a03040','--border-color':'rgba(38,26,10,0.12)',
      '--heading-font':'"Playfair Display", Georgia, serif','--mono-font':'"Courier Prime", "Courier New", monospace',
    },
  },
  {
    id: 'signal-blue', label: 'Signal Blue',
    description: 'Neutral dark. Blue signal. Amber alert. Analytical precision.',
    projectHint: 'thesis-pipeline', moodTags: ['analytical','neutral','data','research'],
    fonts: {
      headingFamily: '"DM Sans", system-ui, sans-serif',
      monoFamily: '"JetBrains Mono", "Courier New", monospace',
      googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap',
    },
    vars: {
      '--cipher':'#0d1117','--cipher-raised':'#131920','--surface':'#161b22','--surface-raised':'#1c2128',
      '--vellum':'#e6edf3','--vellum-dim':'rgba(230,237,243,0.55)','--vellum-faint':'rgba(230,237,243,0.28)',
      '--teal':'#1c5fa8','--teal-bright':'#58a6ff','--gold':'#9a6a00','--gold-bright':'#d29922',
      '--coral':'#c03030','--border-color':'rgba(230,237,243,0.08)',
      '--heading-font':'"DM Sans", system-ui, sans-serif','--mono-font':'"JetBrains Mono", "Courier New", monospace',
    },
  },
]

export const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t])) as Record<ThemeId, Theme>
export const DEFAULT_THEME_ID: ThemeId = 'cipher-gothic'
