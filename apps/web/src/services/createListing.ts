import { getAuth } from 'firebase/auth'

export interface CreateListingRequest {
  species: string
  grade: 'sushi' | 'A' | 'B'
  quantity: number
  unit: string
  pricePerUnit: number
  freshnessDate: string
  expiresAt: string
  location: {
    latitude: number
    longitude: number
    address: string
  }
  deliveryAvailable: boolean
  deliveryFee?: number
  photos: string[]
  sushiCertNumber?: string
  sushiCertExpiry?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api-eodwatsp5q-uc.a.run.app'

export async function createListing(
  data: CreateListingRequest
): Promise<{ success: boolean; listingId: string }> {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('Must be authenticated to create listing')
  }

  const token = await user.getIdToken()

  const response = await fetch(`${API_URL}/api/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...data,
      sellerId: user.uid,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to create listing')
  }

  return response.json()
}
