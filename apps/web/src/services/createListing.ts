import { httpsCallable, getFunctions } from 'firebase/functions'

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
  const createListingCallable = httpsCallable<CreateListingRequest, { success: boolean; listingId: string }>(
    functions,
    'createListing'
  )

  const result = await createListingCallable(data)
  return result.data
}
