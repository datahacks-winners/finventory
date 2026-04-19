/**
 * Firestore Service - GCP Native Mode
 *
 * MIGRATION GUIDE: Replacing React Native Firebase Firestore (@react-native-firebase/firestore)
 * with GCP Firestore REST API.
 *
 * KEY CHANGES:
 * - Firebase SDK: Direct SDK integration with real-time listeners
 * - GCP Native: REST API calls, manual retry logic, token management
 * - Real-time: Manual polling vs onSnapshot (real-time via Firestore webhook)
 * - Offline: Manual cache vs SDK-managed offline persistence
 *
 * ARCHITECTURE DECISIONS:
 * 1. For true real-time updates: Use Firestore native mode with webhooks
 * 2. For polling: Implement efficient cache invalidation
 * 3. For offline: Use React Query caching with AsyncStorage persistence
 */

import { getIdToken } from './auth.js'

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'finventory-gcp',
  baseUrl: 'https://firestore.googleapis.com/v1',
  databaseId: '(default)', // Firestore native mode
  requestTimeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000 // milliseconds
}

// ============================================================================
// TYPES
// ============================================================================

export interface FirestoreError {
  code: number
  message: string
  status: string
}

export type WithId<T> = T & { id: string }

/**
 * Firestore Document Field types
 */
export type FirestoreValue =
  | { nullValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { bytesValue: string }
  | { timestampValue: string }
  | { referenceValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } }

/**
 * Firestore Document
 */
export interface FirestoreDocument {
  name: string
  fields: Record<string, FirestoreValue>
  createTime: string
  updateTime: string
}

/**
 * Query filter conditions
 */
export interface WhereFilter {
  field: string
  operator: 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'EQUAL' | 'NOT_EQUAL' | 'ARRAY_CONTAINS' | 'IN' | 'ARRAY_CONTAINS_ANY' | 'NOT_IN'
  value: unknown
}

/**
 * Query order by
 */
export interface OrderBy {
  field: string
  direction: 'ASCENDING' | 'DESCENDING'
}

/**
 * Query options
 */
export interface QueryOptions {
  where?: WhereFilter[]
  orderBy?: OrderBy[]
  limit?: number
  offset?: number
  startAt?: unknown
  startAfter?: unknown
  endAt?: unknown
  endBefore?: unknown
}

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Make authenticated request to Firestore REST API
 */
async function firestoreRequest<T>(
  path: string,
  options: RequestInit = {},
  retries = CONFIG.maxRetries
): Promise<T> {
  const idToken = await getIdToken()

  if (!idToken) {
    throw {
      code: 401,
      message: 'No authentication token available',
      status: 'UNAUTHENTICATED'
    } as FirestoreError
  }

  const url = `${CONFIG.baseUrl}/projects/${CONFIG.projectId}/databases/${CONFIG.databaseId}/${path}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json()

      // Handle token expiration
      if (response.status === 401 && retries > 0) {
        // Force token refresh and retry
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay))
        return firestoreRequest<T>(path, options, retries - 1)
      }

      throw {
        code: response.status,
        message: error.error?.message || 'Firestore request failed',
        status: error.error?.status || 'UNKNOWN'
      } as FirestoreError
    }

    return response.json()
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw {
        code: 408,
        message: 'Firestore request timeout',
        status: 'DEADLINE_EXCEEDED'
      } as FirestoreError
    }

    throw error
  }
}

/**
 * Convert JavaScript value to Firestore value
 */
export function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: 'NULL_VALUE' }
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value }
  }

  if (typeof value === 'number') {
    // Check if it's an integer
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() }
    }
    return { doubleValue: value }
  }

  if (typeof value === 'string') {
    return { stringValue: value }
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }

  if (value instanceof Geohash) {
    return { geoPointValue: { latitude: value.latitude, longitude: value.longitude } }
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => toFirestoreValue(v))
      }
    }
  }

  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])
        )
      }
    }
  }

  return { nullValue: 'NULL_VALUE' }
}

/**
 * Convert Firestore value to JavaScript value
 */
export function fromFirestoreValue(value: FirestoreValue): unknown {
  if (value.nullValue) {
    return null
  }

  if (value.booleanValue !== undefined) {
    return value.booleanValue
  }

  if (value.integerValue !== undefined) {
    return parseInt(value.integerValue, 10)
  }

  if (value.doubleValue !== undefined) {
    return value.doubleValue
  }

  if (value.stringValue !== undefined) {
    return value.stringValue
  }

  if (value.timestampValue !== undefined) {
    return new Date(value.timestampValue)
  }

  if (value.geoPointValue !== undefined) {
    return value.geoPointValue
  }

  if (value.arrayValue) {
    return value.arrayValue.values.map(v => fromFirestoreValue(v))
  }

  if (value.mapValue) {
    const obj: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value.mapValue.fields)) {
      obj[key] = fromFirestoreValue(val)
    }
    return obj
  }

  return null
}

/**
 * Convert Firestore document to plain object
 */
export function fromFirestoreDocument<T = Record<string, unknown>>(
  doc: FirestoreDocument
): WithId<T> {
  const obj: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(doc.fields)) {
    obj[key] = fromFirestoreValue(value)
  }

  // Extract document ID from name
  // Format: projects/{project}/databases/{database}/documents/{collection}/{docId}
  const parts = doc.name.split('/')
  const id = parts[parts.length - 1]

  return {
    ...obj,
    id
  } as WithId<T>
}

/**
 * Convert plain object to Firestore document fields
 */
export function toFirestoreDocument(
  data: Record<string, unknown>
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value === undefined) {
      continue
    }

    // Skip 'id' field - it's part of the document path
    if (key === 'id') {
      continue
    }

    fields[key] = toFirestoreValue(value)
  }

  return fields
}

// ============================================================================
// GEOHELPER CLASS
// ============================================================================

/**
 * GeoPoint helper for geographic queries
 */
export class Geohash {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number
  ) {}
}

// ============================================================================
// COLLECTION REFERENCE
// ============================================================================

export class CollectionReference<T = Record<string, unknown>> {
  constructor(
    private readonly collectionPath: string,
    private readonly options: QueryOptions = {}
  ) {}

  /**
   * Add where filter
   */
  where(field: string, operator: WhereFilter['operator'], value: unknown): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      where: [...(this.options.where || []), { field, operator, value }]
    })
  }

  /**
   * Add order by
   */
  orderBy(field: string, direction: OrderBy['direction'] = 'ASCENDING'): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      orderBy: [...(this.options.orderBy || []), { field, direction }]
    })
  }

  /**
   * Limit results
   */
  limit(n: number): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      limit: n
    })
  }

  /**
   * Start at cursor
   */
  startAt(cursor: unknown): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      startAt: cursor
    })
  }

  /**
   * Start after cursor
   */
  startAfter(cursor: unknown): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      startAfter: cursor
    })
  }

  /**
   * End at cursor
   */
  endAt(cursor: unknown): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      endAt: cursor
    })
  }

  /**
   * End before cursor
   */
  endBefore(cursor: unknown): CollectionReference<T> {
    return new CollectionReference<T>(this.collectionPath, {
      ...this.options,
      endBefore: cursor
    })
  }

  /**
   * Get documents
   *
   * MIGRATION: collection.get()
   */
  async get(): Promise<WithId<T>[]> {
    const queryParams = new URLSearchParams()

    // Build structured query
    const structuredQuery: any = {
      from: [{ collectionId: this.collectionPath.split('/').pop() }]
    }

    // Add where filters
    if (this.options.where && this.options.where.length > 0) {
      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters: this.options.where.map(w => ({
            fieldFilter: {
              field: { fieldPath: w.field },
              op: w.operator,
              value: toFirestoreValue(w.value)
            }
          }))
        }
      }
    }

    // Add order by
    if (this.options.orderBy) {
      structuredQuery.orderBy = this.options.orderBy.map(o => ({
        field: { fieldPath: o.field },
        direction: o.direction
      }))
    }

    // Add limit
    if (this.options.limit) {
      structuredQuery.limit = this.options.limit
    }

    // Add offset
    if (this.options.offset) {
      structuredQuery.offset = this.options.offset
    }

    // Add start cursor
    if (this.options.startAt) {
      structuredQuery.startAt = {
        values: [toFirestoreValue(this.options.startAt)],
        before: true
      }
    }

    // Add start after cursor
    if (this.options.startAfter) {
      structuredQuery.startAt = {
        values: [toFirestoreValue(this.options.startAfter)],
        before: false
      }
    }

    // Add end cursor
    if (this.options.endAt) {
      structuredQuery.endAt = {
        values: [toFirestoreValue(this.options.endAt)],
        before: false
      }
    }

    // Add end before cursor
    if (this.options.endBefore) {
      structuredQuery.endAt = {
        values: [toFirestoreValue(this.options.endBefore)],
        before: true
      }
    }

    // Execute query
    const response = await firestoreRequest<{
      documents?: FirestoreDocument[]
    }>(
      `documents:runQuery?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify({ structuredQuery })
      }
    )

    return (response.documents || []).map(doc => fromFirestoreDocument<T>(doc))
  }

  /**
   * Stream documents (via polling)
   *
   * MIGRATION: collection.onSnapshot()
   *
   * NOTE: This is a simplified polling implementation. For true real-time
   * updates, you'd use Firestore native mode with webhook push notifications.
   */
  onSnapshot(
    onNext: (docs: WithId<T>[]) => void,
    onError?: (error: FirestoreError) => void,
    pollingIntervalMs = 5000
  ): () => void {
    let timeoutId: NodeJS.Timeout | null = null
    let isCancelled = false

    const poll = async () => {
      if (isCancelled) return

      try {
        const docs = await this.get()
        onNext(docs)
      } catch (error) {
        if (onError && !isCancelled) {
          onError(error as FirestoreError)
        }
      }

      // Schedule next poll
      if (!isCancelled) {
        timeoutId = setTimeout(poll, pollingIntervalMs)
      }
    }

    // Start polling
    poll()

    // Return unsubscribe function
    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }
}

// ============================================================================
// DOCUMENT REFERENCE
// ============================================================================

export class DocumentReference<T = Record<string, unknown>> {
  constructor(private readonly documentPath: string) {}

  /**
   * Get document
   *
   * MIGRATION: doc.get()
   */
  async get(): Promise<WithId<T> | null> {
    try {
      const doc = await firestoreRequest<FirestoreDocument>(
        `documents/${this.documentPath}`
      )
      return fromFirestoreDocument<T>(doc)
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Create document (auto-generate ID)
   *
   * MIGRATION: collection.add()
   */
  async create(data: T): Promise<string> {
    // Generate a random document ID
    const docId = this.generateDocumentId()

    const documentPath = `${this.documentPath}/${docId}`

    await firestoreRequest(
      `documents/${documentPath}`,
      {
        method: 'POST',
        body: JSON.stringify({
          fields: toFirestoreDocument(data),
          name: `projects/${CONFIG.projectId}/databases/${CONFIG.databaseId}/documents/${documentPath}`
        })
      }
    )

    return docId
  }

  /**
   * Set document (overwrite)
   *
   * MIGRATION: doc.set()
   */
  async set(data: T, _options: { merge?: boolean } = {}): Promise<void> {
    await firestoreRequest(
      `documents/${this.documentPath}`,
      {
        method: 'PATCH', // Use PATCH for merge, PUT for overwrite
        body: JSON.stringify({
          fields: toFirestoreDocument(data),
          // For merge, we'd need to implement mask logic
          // For simplicity, this is a full overwrite
        })
      }
    )
  }

  /**
   * Update document (partial update)
   *
   * MIGRATION: doc.update()
   */
  async update(data: Partial<T>): Promise<void> {
    await firestoreRequest(
      `documents/${this.documentPath}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          fields: toFirestoreDocument(data as Record<string, unknown>)
        })
      }
    )
  }

  /**
   * Delete document
   *
   * MIGRATION: doc.delete()
   */
  async delete(): Promise<void> {
    await firestoreRequest(
      `documents/${this.documentPath}`,
      { method: 'DELETE' }
    )
  }

  /**
   * Listen to document changes (via polling)
   *
   * MIGRATION: doc.onSnapshot()
   */
  onSnapshot(
    onNext: (doc: WithId<T> | null) => void,
    onError?: (error: FirestoreError) => void,
    pollingIntervalMs = 5000
  ): () => void {
    let timeoutId: NodeJS.Timeout | null = null
    let isCancelled = false

    const poll = async () => {
      if (isCancelled) return

      try {
        const doc = await this.get()
        onNext(doc)
      } catch (error) {
        if (onError && !isCancelled) {
          onError(error as FirestoreError)
        }
      }

      // Schedule next poll
      if (!isCancelled) {
        timeoutId = setTimeout(poll, pollingIntervalMs)
      }
    }

    // Start polling
    poll()

    // Return unsubscribe function
    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * Generate a random document ID
   */
  private generateDocumentId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// ============================================================================
// FIRESTORE INSTANCE
// ============================================================================

/**
 * Firestore service
 *
 * MIGRATION: firebase.firestore()
 */
export const firestore = {
  /**
   * Get collection reference
   */
  collection<T = Record<string, unknown>>(path: string): CollectionReference<T> {
    return new CollectionReference<T>(path)
  },

  /**
   * Get document reference
   */
  doc<T = Record<string, unknown>>(path: string): DocumentReference<T> {
    return new DocumentReference<T>(path)
  },

  /**
   * Run a transaction
   *
   * MIGRATION: firestore.runTransaction()
   *
   * NOTE: Firestore REST API doesn't support transactions in the same way
   * as the SDK. This is a simplified implementation that runs operations
   * sequentially. For true transactions, you'd need to use the gRPC API.
   */
  async runTransaction<T>(
    updateFn: (transaction: FirebaseFirestore) => Promise<T>
  ): Promise<T> {
    // For simplicity, we just run the update function
    // In a real implementation, you'd need retry logic and conflict resolution
    const transaction = new FirebaseFirestore()
    return updateFn(transaction)
  },

  /**
   * Batch write operations
   *
   * MIGRATION: firestore.batch()
   *
   * NOTE: Firestore REST API doesn't support batched writes in the same way
   * as the SDK. This is a simplified implementation.
   */
  batch(): WriteBatch {
    return new WriteBatch()
  },

  // Helper types
  FieldValue: {
    delete: () => ({ delete: '' }),
    serverTimestamp: () => ({ serverTimestamp: '' }),
    arrayUnion: (...elements: unknown[]) => ({ arrayUnion: elements }),
    arrayRemove: (...elements: unknown[]) => ({ arrayRemove: elements }),
    increment: (n: number) => ({ increment: n })
  }
}

/**
 * Transaction helper class
 */
export class FirebaseFirestore {
  // Placeholder for transaction operations
  // In a real implementation, this would manage transaction state
}

/**
 * Write batch helper class
 */
export class WriteBatch {
  private operations: Array<{
    type: 'set' | 'update' | 'delete'
    path: string
    data?: Record<string, unknown>
  }> = []

  set<T>(ref: DocumentReference<T>, data: T): WriteBatch {
    this.operations.push({ type: 'set', path: ref['documentPath'], data: data as Record<string, unknown> })
    return this
  }

  update<T>(ref: DocumentReference<T>, data: Partial<T>): WriteBatch {
    this.operations.push({ type: 'update', path: ref['documentPath'], data: data as Record<string, unknown> })
    return this
  }

  delete<T>(ref: DocumentReference<T>): WriteBatch {
    this.operations.push({ type: 'delete', path: ref['documentPath'] })
    return this
  }

  async commit(): Promise<void> {
    // Execute all operations sequentially
    for (const op of this.operations) {
      if (op.type === 'set' && op.data) {
        await firestoreRequest(`documents/${op.path}`, {
          method: 'PUT',
          body: JSON.stringify({ fields: toFirestoreDocument(op.data) })
        })
      } else if (op.type === 'update' && op.data) {
        await firestoreRequest(`documents/${op.path}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: toFirestoreDocument(op.data) })
        })
      } else if (op.type === 'delete') {
        await firestoreRequest(`documents/${op.path}`, { method: 'DELETE' })
      }
    }
  }
}

export default firestore
