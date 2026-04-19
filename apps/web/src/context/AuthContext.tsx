import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from 'firebase/auth'
import { auth } from '../firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    // Check if Firebase auth is properly initialized
    if (!auth) {
      console.warn('Firebase Auth not initialized - running in demo mode')
      setLoading(false)
      setFirebaseReady(false)
      return
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
        setFirebaseReady(true)
      }, (err) => {
        console.error('Auth state error:', err)
        setError('Authentication service unavailable')
        setLoading(false)
      })
      return unsubscribe
    } catch (err) {
      console.error('Failed to initialize auth:', err)
      setError('Authentication service unavailable')
      setLoading(false)
      return
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setError(null)
    if (!auth || !firebaseReady) {
      setError('Authentication service unavailable')
      throw new Error('Firebase not initialized')
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      throw err
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    setError(null)
    if (!auth || !firebaseReady) {
      setError('Authentication service unavailable')
      throw new Error('Firebase not initialized')
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
      throw err
    }
  }

  const logout = async () => {
    setError(null)
    if (!auth || !firebaseReady) {
      setError('Authentication service unavailable')
      throw new Error('Firebase not initialized')
    }
    try {
      await signOut(auth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
