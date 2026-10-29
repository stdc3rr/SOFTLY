import Dexie, { type Table } from 'dexie'

type StoredValue = { key: string; value: unknown }

class SoftlyDatabase extends Dexie {
  values!: Table<StoredValue, string>
  constructor() {
    super('softly')
    this.version(1).stores({ values: '&key' })
  }
}

export const database = new SoftlyDatabase()

export async function readStored<T>(key: string, fallback: T): Promise<T> {
  const existing = await database.values.get(key)
  if (existing) return existing.value as T
  const legacy = localStorage.getItem(key)
  if (legacy) {
    try {
      const value = JSON.parse(legacy) as T
      await database.values.put({ key, value })
      return value
    } catch {
      return fallback
    }
  }
  return fallback
}

export async function writeStored<T>(key: string, value: T): Promise<void> {
  await database.values.put({ key, value })
  localStorage.setItem(key, JSON.stringify(value))
}

export async function exportStoredData(): Promise<Blob> {
  const values = await database.values.toArray()
  return new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), values }, null, 2)], { type: 'application/json' })
}

export async function importStoredData(file: File): Promise<void> {
  const parsed: unknown = JSON.parse(await file.text())
  if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('values' in parsed) || !Array.isArray(parsed.values)) {
    throw new Error('This backup is not a valid softly export.')
  }
  const values = parsed.values as StoredValue[]
  if (values.some(item => !item || typeof item.key !== 'string')) throw new Error('This backup contains invalid records.')
  await database.transaction('rw', database.values, async () => {
    await database.values.bulkPut(values)
  })
  values.forEach(item => localStorage.setItem(item.key, JSON.stringify(item.value)))
}
