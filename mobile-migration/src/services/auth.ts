/**
 * Authentication Service - GCP Identity Platform
 *
 * MIGRATION GUIDE: Replacing Firebase Auth (@react-native-firebase/auth)
 * with Cloud Identity Platform via Google Identity Toolkit API.
 *
 * KEY CHANGES:
 * - Firebase SDK: Direct SDK integration
 * - GCP Native: REST API calls to Identity Toolkit
 * - Token management: Manual token refresh vs SDK-managed
 * - Auth state: Manual persistence vs SDK-persisted
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'finventory-gcp',
  apiKey: process.env.EXPO_PUBLIC_GCP_API_KEY || '',
  identityToolkitBaseUrl: 'https://identitytoolkit.googleapis.com/v1',
  storageKeys: {
    idToken: '@finventory_auth_idToken',
    refreshToken: '@finventory_auth_refreshToken',
    user: '@finventory_auth_user'
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  providerId: string
  metadata: {
    creationTime?: number
    lastSignInTime?: number
  }
}

export interface AuthCredentials {
  idToken: string
  refreshToken: string
  user: User
}

export interface AuthError {
  code: string
  message: string
}

export type AuthProvider = 'google.com' | 'password' | 'apple.com'

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Make authenticated request to Identity Toolkit API
 */
async function identityToolkitRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  idToken?: string
): Promise<T> {
  const url = `${CONFIG.identityToolkitBaseUrl}${endpoint}?key=${CONFIG.apiKey}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json()
    throw {
      code: error.error?.message || 'unknown',
      message: error.error?.message || 'An unknown error occurred'
    } as AuthError
  }

  return response.json()
}

/**
 * Refresh ID token using refresh token
 */
async function refreshIdToken(refreshToken: string): Promise<AuthCredentials> {
  const response = await identityToolkitRequest<{
    id_token: string
    refresh_token: string
    user: {
      localId: string
      email: string
      displayName?: string
      photoUrl?: string
      emailVerified: boolean
    }
  }>('/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })

  const user = mapIdentityToolkitUser(response.user)

  return {
    idToken: response.id_token,
    refreshToken: response.refresh_token,
    user
  }
}

/**
 * Map Identity Toolkit user to our User type
 */
function mapIdentityToolkitUser(iu: {
  localId: string
  email?: string
  displayName?: string
  photoUrl?: string
  emailVerified?: boolean
}): User {
  return {
    uid: iu.localId,
    email: iu.email || null,
    displayName: iu.displayName || null,
    photoURL: iu.photoUrl || null,
    emailVerified: iu.emailVerified || false,
    providerId: 'identity-toolkit',
    metadata: {}
  }
}

// ============================================================================
// AUTH STATE MANAGEMENT
// ============================================================================

/**
 * Save auth credentials to AsyncStorage
 */
async function saveCredentials(credentials: AuthCredentials): Promise<void> {
  await AsyncStorage.multiSet([
    [CONFIG.storageKeys.idToken, credentials.idToken],
    [CONFIG.storageKeys.refreshToken, credentials.refreshToken],
    [CONFIG.storageKeys.user, JSON.stringify(credentials.user)]
  ])
}

/**
 * Load auth credentials from AsyncStorage
 */
async function loadCredentials(): Promise<AuthCredentials | null> {
  try {
    const [idToken, refreshToken, userJson] = await AsyncStorage.multiGet([
      CONFIG.storageKeys.idToken,
      CONFIG.storageKeys.refreshToken,
      CONFIG.storageKeys.user
    ])

    if (!idToken[1] || !refreshToken[1] || !userJson[1]) {
      return null
    }

    return {
      idToken: idToken[1],
      refreshToken: refreshToken[1],
      user: JSON.parse(userJson[1]) as User
    }
  } catch {
    return null
  }
}

/**
 * Clear auth credentials from AsyncStorage
 */
async function clearCredentials(): Promise<void> {
  await AsyncStorage.multiRemove([
    CONFIG.storageKeys.idToken,
    CONFIG.storageKeys.refreshToken,
    CONFIG.storageKeys.user
  ])
}

// ============================================================================
// AUTH METHODS
// ============================================================================

/**
 * Sign in with email and password
 *
 * MIGRATION: firebase.auth().signInWithEmailAndPassword()
 */
export async function signInWithEmailAndPassword(
  email: string,
  password: string
): Promise<AuthCredentials> {
  const response = await identityToolkitRequest<{
    idToken: string
    refreshToken: string
    email: string
    localId: string
    displayName?: string
    photoUrl?: string
    emailVerified: boolean
  }>('/accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true
  })

  const credentials: AuthCredentials = {
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    user: {
      uid: response.localId,
      email: response.email,
      displayName: response.displayName || null,
      photoURL: response.photoUrl || null,
      emailVerified: response.emailVerified,
      providerId: 'password',
      metadata: {}
    }
  }

  await saveCredentials(credentials)
  return credentials
}

/**
 * Create user with email and password
 *
 * MIGRATION: firebase.auth().createUserWithEmailAndPassword()
 */
export async function createUserWithEmailAndPassword(
  email: string,
  password: string
): Promise<AuthCredentials> {
  const response = await identityToolkitRequest<{
    idToken: string
    refreshToken: string
    email: string
    localId: string
    displayName?: string
    photoUrl?: string
    emailVerified: boolean
  }>('/accounts:signUp', {
    email,
    password,
    returnSecureToken: true
  })

  const credentials: AuthCredentials = {
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    user: {
      uid: response.localId,
      email: response.email,
      displayName: response.displayName || null,
      photoURL: response.photoUrl || null,
      emailVerified: response.emailVerified,
      providerId: 'password',
      metadata: {}
    }
  }

  await saveCredentials(credentials)
  return credentials
}

/**
 * Sign in with Google OAuth
 *
 * MIGRATION: firebase.auth().signInWithCredential(googleCredential)
 */
export async function signInWithGoogle(): Promise<AuthCredentials> {
  try {
    await GoogleSignin.hasPlayServices()
    const userInfo = await GoogleSignin.signIn()

    // Exchange Google ID token for Identity Platform token
    const response = await identityToolkitRequest<{
      idToken: string
      refreshToken: string
      email: string
      localId: string
      displayName?: string
      photoUrl?: string
      emailVerified: boolean
    }>('/accounts:signInWithIdp', {
      postBody: `id_token=${userInfo.idToken}&providerId=google.com`,
      requestUri: 'http://localhost', // Mobile app context
      returnSecureToken: true,
      returnIdpCredential: true
    })

    const credentials: AuthCredentials = {
      idToken: response.idToken,
      refreshToken: response.refreshToken,
      user: {
        uid: response.localId,
        email: response.email,
        displayName: response.displayName || null,
        photoURL: response.photoUrl || null,
        emailVerified: response.emailVerified,
        providerId: 'google.com',
        metadata: {}
      }
    }

    await saveCredentials(credentials)
    return credentials
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw { code: 'auth/cancelled-popup-request', message: 'Sign in was cancelled' } as AuthError
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw { code: 'auth/popup-closed-by-user', message: 'Sign in already in progress' } as AuthError
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw { code: 'auth/no-google-play-services', message: 'Google Play Services not available' } as AuthError
    }
    throw error
  }
}

/**
 * Sign out current user
 *
 * MIGRATION: firebase.auth().signOut()
 */
export async function signOut(): Promise<void> {
  await GoogleSignin.signOut()
  await clearCredentials()
}

/**
 * Send password reset email
 *
 * MIGRATION: firebase.auth().sendPasswordResetEmail()
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  await identityToolkitRequest('/accounts:sendOobCode', {
    email,
    requestType: 'PASSWORD_RESET'
  })
}

/**
 * Verify password reset code
 *
 * MIGRATION: firebase.auth().verifyPasswordResetCode()
 */
export async function verifyPasswordResetCode(code: string): Promise<string> {
  const response = await identityToolkitRequest<{
    email: string
  }>('/accounts:resetPassword', {
    oobCode: code
  })

  return response.email
}

/**
 * Confirm password reset
 *
 * MIGRATION: firebase.auth().confirmPasswordReset()
 */
export async function confirmPasswordReset(
  code: string,
  newPassword: string
): Promise<void> {
  await identityToolkitRequest('/accounts:resetPassword', {
    oobCode: code,
    newPassword
  })
}

/**
 * Update user profile
 *
 * MIGRATION: user.updateProfile()
 */
export async function updateUserProfile(
  idToken: string,
  updates: {
    displayName?: string
    photoURL?: string
  }
): Promise<void> {
  await identityToolkitRequest('/accounts:update', {
    idToken,
    displayName: updates.displayName,
    photoUrl: updates.photoURL,
    returnSecureToken: true
  })
}

/**
 * Get current user (from storage)
 *
 * MIGRATION: firebase.auth().currentUser
 */
export async function getCurrentUser(): Promise<User | null> {
  const credentials = await loadCredentials()
  return credentials?.user || null
}

/**
 * Get current ID token (auto-refresh if needed)
 *
 * MIGRATION: user.getIdToken()
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const credentials = await loadCredentials()

  if (!credentials) {
    return null
  }

  // Simple check: if token is older than 50 minutes, refresh it
  // JWT tokens typically expire after 1 hour
  if (forceRefresh || shouldRefreshToken(credentials.idToken)) {
    try {
      const newCredentials = await refreshIdToken(credentials.refreshToken)
      await saveCredentials(newCredentials)
      return newCredentials.idToken
    } catch (error) {
      // Refresh failed, clear credentials
      await clearCredentials()
      throw error
    }
  }

  return credentials.idToken
}

/**
 * Check if JWT token needs refresh (simple heuristic)
 */
function shouldRefreshToken(token: string): boolean {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.')
    if (parts.length !== 3) return true

    // Decode payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString()
    )

    // Check expiration (exp is in seconds)
    const now = Math.floor(Date.now() / 1000)
    const fiveMinutes = 5 * 60
    return payload.exp < (now + fiveMinutes)
  } catch {
    return true
  }
}

/**
 * Initialize auth state on app startup
 *
 * MIGRATION: firebase.auth().onAuthStateChanged()
 */
export async function initializeAuth(): Promise<User | null> {
  const credentials = await loadCredentials()

  if (!credentials) {
    return null
  }

  // Try to refresh the token to ensure it's valid
  try {
    const newCredentials = await refreshIdToken(credentials.refreshToken)
    await saveCredentials(newCredentials)
    return newCredentials.user
  } catch (_error) {
    // Token refresh failed, clear credentials
    await clearCredentials()
    return null
  }
}

/**
 * Listen to auth state changes
 *
 * MIGRATION: firebase.auth().onAuthStateChanged(callback)
 *
 * NOTE: In the GCP native implementation, this is a simplified version
 * that checks AsyncStorage. For true real-time auth state, you'd need
 * to implement token refresh monitoring.
 */
export function onAuthStateChanged(
  callback: (user: User | null) => void
): () => void {
  const timeoutId: NodeJS.Timeout | null = null

  const checkAuthState = async () => {
    const user = await initializeAuth()
    callback(user)
  }

  // Check immediately
  checkAuthState()

  // Poll every 30 seconds for token changes
  // In production, you might want to implement a more sophisticated
  // token refresh strategy
  const intervalId = setInterval(() => {
    checkAuthState()
  }, 30000)

  // Return unsubscribe function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    clearInterval(intervalId)
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const auth = {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithGoogle,
  signOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  getCurrentUser,
  getIdToken,
  initializeAuth,
  onAuthStateChanged,
  updateUserProfile
}

export default auth
