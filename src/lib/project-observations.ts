import { z } from 'zod'
import { gate } from './security'
import configuredSources from '@/data/project-sources.json'

const Revision = z.string().regex(/^[a-f0-9]{40}$/)
const Observation = z.object({
  projectId: z.string().max(80),
  repository: z.string().regex(/^mazze93\/[a-zA-Z0-9_.-]+$/),
  commit: Revision,
  observedAt: z.iso.datetime({ offset: true }),
  description: z.string().max(2000),
  language: z.string().max(80),
  sources: z.array(z.object({
    path: z.enum(['README.md', 'CLAUDE.md', 'AGENTS.md', 'package.json', 'pyproject.toml', 'Cargo.toml', 'Package.swift', 'AUTHORITY.md']),
    gitBlob: Revision,
    url: z.string(),
  }).strict()).max(8),
}).strict()
const Report = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('stele-project-observations'),
  projects: z.array(Observation).min(1).max(50),
}).strict()
export type ProjectObservation = z.infer<typeof Observation>

export function parseProjectObservations(input: string): ProjectObservation[] {
  if (input.length > 100_000) throw new Error('Observation file exceeds 100,000 characters')
  const report = Report.parse(JSON.parse(input))
  const seen = new Set<string>()
  for (const project of report.projects) {
    const configured = configuredSources.find(source => source.projectId === project.projectId)
    if (configured?.repository !== project.repository || seen.has(project.projectId)) {
      throw new Error('Observation has an unknown or repeated project source')
    }
    seen.add(project.projectId)
    if (gate(JSON.stringify({ description: project.description, language: project.language })).blocked) {
      throw new Error('TOBIRA blocked repository observation content')
    }
    for (const source of project.sources) {
      const expected = `https://github.com/${project.repository}/blob/${project.commit}/${source.path}`
      if (source.url !== expected) throw new Error('Source link does not match the recorded revision')
    }
  }
  return report.projects
}
