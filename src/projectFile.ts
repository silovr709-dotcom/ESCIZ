import type { SketchProject } from './types'
import { uid } from './types'

const MIME = 'application/vnd.recept.eskiz+json'

export function downloadProjectFile(project: SketchProject) {
  const payload = { format: 'recept-eskiz', exportedAt: new Date().toISOString(), project }
  const blob = new Blob([JSON.stringify(payload)], { type: MIME })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${safeName(project.title)}.eskiz`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export async function readProjectFile(file: File): Promise<SketchProject> {
  if (!file.name.toLowerCase().endsWith('.eskiz') && file.type && !file.type.includes('json')) throw new Error('Выберите файл проекта .eskiz')
  let parsed: unknown
  try { parsed = JSON.parse(await file.text()) } catch { throw new Error('Файл проекта повреждён или имеет неверный формат') }
  const source = parsed as { format?: string; project?: unknown }
  if (source.format !== 'recept-eskiz' || !isProject(source.project)) throw new Error('Это не проект Эскиз PRO или его версия не поддерживается')
  const project = structuredClone(source.project)
  const now = new Date().toISOString()
  return { ...project, id: uid(), title: `${project.title} — импорт`, createdAt: now, updatedAt: now }
}

function isProject(value: unknown): value is SketchProject {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<SketchProject>
  return p.version === 1 && typeof p.title === 'string' && !!p.image && typeof p.image.dataUrl === 'string' && Number.isFinite(p.image.width) && Number.isFinite(p.image.height) && Array.isArray(p.objects) && !!p.header
}

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Проект Эскиз PRO'
}
