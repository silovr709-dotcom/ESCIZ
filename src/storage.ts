import type { ProjectSummary, SketchProject } from './types'

const DB_NAME = 'recept-eskiz-pro'
const STORE = 'projects'
const REVISIONS = 'revisions'
const DB_VERSION = 2

export type ProjectRevision = {
  id: string
  projectId: string
  createdAt: string
  label: string
  project: SketchProject
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
      if (!request.result.objectStoreNames.contains(REVISIONS)) {
        const revisions = request.result.createObjectStore(REVISIONS, { keyPath: 'id' })
        revisions.createIndex('projectId', 'projectId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveProject(project: SketchProject) {
  const database = await db()
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(project)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadProject(id: string): Promise<SketchProject | undefined> {
  const database = await db()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const database = await db()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).getAll()
    request.onsuccess = () => resolve((request.result as SketchProject[])
      .map(({ id, title, createdAt, updatedAt, image }) => ({ id, title, createdAt, updatedAt, thumbnail: image.dataUrl }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
    request.onerror = () => reject(request.error)
  })
}

export async function deleteProject(id: string) {
  const database = await db()
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction([STORE, REVISIONS], 'readwrite')
    tx.objectStore(STORE).delete(id)
    const index = tx.objectStore(REVISIONS).index('projectId')
    const cursor = index.openCursor(IDBKeyRange.only(id))
    cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue() } }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveRevision(project: SketchProject, label = 'Контрольная точка') {
  const database = await db()
  const revision: ProjectRevision = { id: crypto.randomUUID(), projectId: project.id, createdAt: new Date().toISOString(), label, project: structuredClone(project) }
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(REVISIONS, 'readwrite')
    tx.objectStore(REVISIONS).put(revision)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
  const revisions = await listRevisions(project.id)
  if (revisions.length > 12) await Promise.all(revisions.slice(12).map(item => deleteRevision(item.id)))
  return revision
}

export async function listRevisions(projectId: string): Promise<ProjectRevision[]> {
  const database = await db()
  return new Promise((resolve, reject) => {
    const request = database.transaction(REVISIONS).objectStore(REVISIONS).index('projectId').getAll(IDBKeyRange.only(projectId))
    request.onsuccess = () => resolve((request.result as ProjectRevision[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    request.onerror = () => reject(request.error)
  })
}

export async function deleteRevision(id: string) {
  const database = await db()
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(REVISIONS, 'readwrite'); tx.objectStore(REVISIONS).delete(id)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}
