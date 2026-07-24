import type { DrawingResult } from './api'

const DATABASE_NAME = 'tinyapi-drawing'
const DATABASE_VERSION = 1
const SESSION_STORE = 'sessions'
const MAX_SESSIONS = 6

export type PersistedDrawingTurn = {
  id: string
  prompt: string
  referenceName?: string
  referenceBlob?: Blob
  results: DrawingResult[]
  status: 'loading' | 'success' | 'error'
  error?: string
  current: number
  total: number
}

export type DrawingSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  turns: PersistedDrawingTurn[]
}

function openDrawingDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SESSION_STORE)) {
        database.createObjectStore(SESSION_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getAllSessions(database: IDBDatabase) {
  return new Promise<DrawingSession[]>((resolve, reject) => {
    const transaction = database.transaction(SESSION_STORE, 'readonly')
    const request = transaction.objectStore(SESSION_STORE).getAll()

    request.onsuccess = () => {
      resolve(
        (request.result as DrawingSession[]).sort(
          (left, right) => right.updatedAt - left.updatedAt
        )
      )
    }
    request.onerror = () => reject(request.error)
  })
}

export async function loadDrawingSessions() {
  const database = await openDrawingDatabase()
  try {
    return await getAllSessions(database)
  } finally {
    database.close()
  }
}

export async function saveDrawingSession(session: DrawingSession) {
  const database = await openDrawingDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).put(session)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })

    const sessions = await getAllSessions(database)
    const expired = sessions.slice(MAX_SESSIONS)
    if (expired.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(SESSION_STORE, 'readwrite')
        const store = transaction.objectStore(SESSION_STORE)
        expired.forEach((item) => store.delete(item.id))
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    }

    return sessions.slice(0, MAX_SESSIONS)
  } finally {
    database.close()
  }
}

export async function deleteDrawingSession(sessionId: string) {
  const database = await openDrawingDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).delete(sessionId)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    return await getAllSessions(database)
  } finally {
    database.close()
  }
}
