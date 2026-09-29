import type { ProjectSummary, SketchProject } from './types'

const DB_NAME = 'recept-eskiz-pro'
const STORE = 'projects'
const DB_VERSION = 1

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
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
    const tx = database.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
