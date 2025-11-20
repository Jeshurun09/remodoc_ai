// Offline storage using IndexedDB
const DB_NAME = 'remodoc-offline'
const DB_VERSION = 1
const STORES = {
  REPORTS: 'symptomReports',
  HOSPITALS: 'hospitals',
  APPOINTMENTS: 'appointments'
}

export async function initOfflineDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores
      if (!db.objectStoreNames.contains(STORES.REPORTS)) {
        db.createObjectStore(STORES.REPORTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.HOSPITALS)) {
        db.createObjectStore(STORES.HOSPITALS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.APPOINTMENTS)) {
        db.createObjectStore(STORES.APPOINTMENTS, { keyPath: 'id' })
      }
    }
  })
}

export async function saveOfflineReport(report: any) {
  const db = await initOfflineDB()
  const transaction = db.transaction([STORES.REPORTS], 'readwrite')
  const store = transaction.objectStore(STORES.REPORTS)
  await store.put({ ...report, synced: false, timestamp: Date.now() })
}

export async function getOfflineReports() {
  const db = await initOfflineDB()
  const transaction = db.transaction([STORES.REPORTS], 'readonly')
  const store = transaction.objectStore(STORES.REPORTS)
  return new Promise<any[]>((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveOfflineHospitals(hospitals: any[]) {
  const db = await initOfflineDB()
  const transaction = db.transaction([STORES.HOSPITALS], 'readwrite')
  const store = transaction.objectStore(STORES.HOSPITALS)
  for (const hospital of hospitals) {
    await store.put({ ...hospital, timestamp: Date.now() })
  }
}

export async function getOfflineHospitals() {
  const db = await initOfflineDB()
  const transaction = db.transaction([STORES.HOSPITALS], 'readonly')
  const store = transaction.objectStore(STORES.HOSPITALS)
  return new Promise<any[]>((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function syncOfflineData() {
  // Sync offline data when connection is restored
  const reports = await getOfflineReports()
  const unsynced = reports.filter(r => !r.synced)

  for (const report of unsynced) {
    try {
      const response = await fetch('/api/symptoms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      })
      if (response.ok) {
        const db = await initOfflineDB()
        const transaction = db.transaction([STORES.REPORTS], 'readwrite')
        const store = transaction.objectStore(STORES.REPORTS)
        await store.put({ ...report, synced: true })
      }
    } catch (error) {
      console.error('Sync error:', error)
    }
  }
}

