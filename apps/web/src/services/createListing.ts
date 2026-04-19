import { httpsCallable, getFunctions } from 'firebase/functions'
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

const functions = getFunctions()

export async function createListing(
  data: CreateListingRequest
): Promise<{ success: boolean; listingId: string }> {
  const auth = getAuth()
  const user = auth.currentUser
  
  if (!user) {
    throw new Error('Must be authenticated to create listing')
  }
  
  const createListingCallable = httpsCallable<CreateListingRequest & { sellerId: string }, { success: boolean; listingId: string }>(
    functions,
    'createListing'
  )

  const result = await createListingCallable({
    ...data,
    sellerId: user.uid
  })
  return result.data
}
