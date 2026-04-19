import { } from 'google-auth-library'
import { config } from '../config.js'

/**
 * Verify Firebase Auth / Identity Platform ID token
 * Uses Google Auth Library to validate JWT signature and claims
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email: string | null }> {
  try {
    // For Firebase Auth / Identity Platform, we need to verify the token
    // This uses the Firebase Auth REST API or Google Auth Library

    // Option 1: Use Firebase Auth REST API (simpler, requires no additional deps)
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${config.projectId}:lookup?key=${config.firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    )

    if (!response.ok) {
      throw new Error('Token verification failed')
    }

    const data = await response.json()

    if (!data.users || data.users.length === 0) {
      throw new Error('Invalid token: user not found')
    }

    const user = data.users[0]

    return {
      uid: user.localId,
      email: user.email || null,
    }
  } catch (error) {
    console.error('Error verifying ID token:', error)
    throw new Error('Unauthorized: Invalid token')
  }
}

/**
 * Extract and verify Bearer token from Authorization header
 */
export async function authenticateUser(authHeader: string | undefined): Promise<{ uid: string; email: string | null }> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided')
  }

  const token = authHeader.substring(7)
  return await verifyIdToken(token)
}
