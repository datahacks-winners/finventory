import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

// ============================================================================
// Photo Requirement Definitions by Grade
// ============================================================================

export interface PhotoRequirement {
  type: string
  description: string
  required: boolean
  aiCheckEnabled: boolean
  exampleUrl?: string
}

export interface GradeRequirements {
  minPhotos: number
  maxPhotos: number
  requiredTypes: string[]
  optionalTypes: string[]
  requirements: PhotoRequirement[]
}

export const PHOTO_REQUIREMENTS_BY_GRADE: Record<string, GradeRequirements> = {
  sushi: {
    minPhotos: 3,
    maxPhotos: 8,
    requiredTypes: ['whole_fish', 'flesh_cut', 'gills_or_eyes'],
    optionalTypes: ['certification_label', 'storage_setup', 'scale_weight'],
    requirements: [
      {
        type: 'whole_fish',
        description: 'Full side view of fish on ice or in container, showing overall condition and color',
        required: true,
        aiCheckEnabled: true
      },
      {
        type: 'flesh_cut',
        description: 'Close-up of flesh color and texture (belly flap or tail cut visible)',
        required: true,
        aiCheckEnabled: true
      },
      {
        type: 'gills_or_eyes',
        description: 'Clear view of gills (bright red preferred) or eyes (clear, not sunken)',
        required: true,
        aiCheckEnabled: false
      },
      {
        type: 'certification_label',
        description: 'Sushi certification tag, temperature log, or flash-freeze documentation',
        required: false,
        aiCheckEnabled: false
      },
      {
        type: 'storage_setup',
        description: 'Photo of ice bed, refrigerated container, or freezer showing storage method',
        required: false,
        aiCheckEnabled: false
      },
      {
        type: 'scale_weight',
        description: 'Fish on scale showing weight (optional but builds trust)',
        required: false,
        aiCheckEnabled: false
      }
    ]
  },
  
  a: {
    minPhotos: 2,
    maxPhotos: 6,
    requiredTypes: ['whole_fish', 'flesh_or_detail'],
    optionalTypes: ['gills', 'eyes', 'storage'],
    requirements: [
      {
        type: 'whole_fish',
        description: 'Full view of fish showing overall condition',
        required: true,
        aiCheckEnabled: true
      },
      {
        type: 'flesh_or_detail',
        description: 'Close-up of flesh, gills, or eyes showing freshness details',
        required: true,
        aiCheckEnabled: false
      },
      {
        type: 'gills',
        description: 'Close-up of gill color',
        required: false,
        aiCheckEnabled: false
      },
      {
        type: 'eyes',
        description: 'Close-up of eye clarity',
        required: false,
        aiCheckEnabled: false
      },
      {
        type: 'storage',
        description: 'Storage method (ice, refrigerated, etc.)',
        required: false,
        aiCheckEnabled: false
      }
    ]
  },
  
  b: {
    minPhotos: 1,
    maxPhotos: 4,
    requiredTypes: ['whole_fish'],
    optionalTypes: ['flesh', 'defects'],
    requirements: [
      {
        type: 'whole_fish',
        description: 'Photo showing overall condition (minor imperfections acceptable for Grade B)',
        required: true,
        aiCheckEnabled: true
      },
      {
        type: 'flesh',
        description: 'Close-up of flesh if quality varies',
        required: false,
        aiCheckEnabled: false
      },
      {
        type: 'defects',
        description: 'Photo clearly showing any defects (transparency builds trust)',
        required: false,
        aiCheckEnabled: false
      }
    ]
  },
  
  c: {
    minPhotos: 1,
    maxPhotos: 3,
    requiredTypes: ['whole_fish'],
    optionalTypes: ['defects'],
    requirements: [
      {
        type: 'whole_fish',
        description: 'Photo showing condition (trim-heavy, freeze-recommended, or stock-grade)',
        required: true,
        aiCheckEnabled: false
      },
      {
        type: 'defects',
        description: 'Clear photo of defects so buyers know what to expect',
        required: false,
        aiCheckEnabled: false
      }
    ]
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface PhotoValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  missingRequired: string[]
  photoCount: number
}

export function validateListingPhotos(
  grade: string,
  photos: Array<{ type: string; url: string }>
): PhotoValidation {
  const requirements = PHOTO_REQUIREMENTS_BY_GRADE[grade.toLowerCase()]
  
  if (!requirements) {
    return {
      valid: false,
      errors: [`Unknown grade: ${grade}`],
      warnings: [],
      missingRequired: [],
      photoCount: photos.length
    }
  }
  
  const errors: string[] = []
  const warnings: string[] = []
  const missingRequired: string[] = []
  
  // Check minimum photos
  if (photos.length < requirements.minPhotos) {
    errors.push(`Grade ${grade.toUpperCase()} requires at least ${requirements.minPhotos} photos. You have ${photos.length}.`)
  }
  
  // Check maximum photos
  if (photos.length > requirements.maxPhotos) {
    warnings.push(`Maximum ${requirements.maxPhotos} photos recommended for Grade ${grade.toUpperCase()}. Extra photos may be ignored.`)
  }
  
  // Check required types
  const photoTypes = photos.map(p => p.type)
  for (const required of requirements.requiredTypes) {
    if (!photoTypes.includes(required)) {
      missingRequired.push(required)
      errors.push(`Required photo missing: ${required}`)
    }
  }
  
  // Check for unknown photo types
  const validTypes = [...requirements.requiredTypes, ...requirements.optionalTypes]
  for (const photo of photos) {
    if (!validTypes.includes(photo.type)) {
      warnings.push(`Photo type "${photo.type}" is not standard for Grade ${grade.toUpperCase()}`)
    }
  }
  
  // Specific validations
  if (grade.toLowerCase() === 'sushi') {
    // Sushi should have certification documentation
    const hasCert = photoTypes.includes('certification_label')
    if (!hasCert) {
      warnings.push('Sushi grade listings should include certification/temperature log documentation for buyer confidence')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingRequired,
    photoCount: photos.length
  }
}

export function getPhotoRequirementsForGrade(grade: string): GradeRequirements | null {
  return PHOTO_REQUIREMENTS_BY_GRADE[grade.toLowerCase()] || null
}

export function getPhotoTypeDescription(grade: string, type: string): string {
  const requirements = PHOTO_REQUIREMENTS_BY_GRADE[grade.toLowerCase()]
  if (!requirements) return ''
  
  const req = requirements.requirements.find(r => r.type === type)
  return req?.description || ''
}

// ============================================================================
// Cloud Function: Validate Photos
// ============================================================================

/**
 * Validate listing photos before creation
 */
export const validatePhotos = functions.https.onCall(
  async (data: {
    grade: string
    photos: Array<{ type: string; url: string }>
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { grade, photos } = data
    
    try {
      const validation = validateListingPhotos(grade, photos)
      
      return {
        validation,
        requirements: getPhotoRequirementsForGrade(grade)
      }
    } catch (error) {
      console.error('Error validating photos:', error)
      throw new functions.https.HttpsError('internal', 'Failed to validate photos')
    }
  }
)

/**
 * Get photo requirements for a grade
 */
export const getPhotoRequirements = functions.https.onCall(
  async (data: { grade: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const requirements = getPhotoRequirementsForGrade(data.grade)
    
    if (!requirements) {
      throw new functions.https.HttpsError('invalid-argument', `Unknown grade: ${data.grade}`)
    }
    
    return { requirements }
  }
)

// ============================================================================
// Photo Compliance Tracking (for seller verification)
// ============================================================================

export async function trackPhotoCompliance(
  db: admin.firestore.Firestore,
  sellerId: string,
  listingId: string,
  validation: PhotoValidation
): Promise<void> {
  const now = admin.firestore.Timestamp.now()
  
  // Update seller's photo compliance stats
  const verificationRef = db.collection('sellerVerifications').doc(sellerId)
  
  // Get current stats
  const verification = await verificationRef.get()
  if (!verification.exists) return
  
  const data = verification.data()
  const currentTotal = data?.metrics?.totalListingsWithPhotos || 0
  const currentCompliant = data?.metrics?.photoCompliantListings || 0
  
  await verificationRef.update({
    'metrics.totalListingsWithPhotos': currentTotal + 1,
    'metrics.photoCompliantListings': validation.valid ? currentCompliant + 1 : currentCompliant,
    'metrics.photoComplianceRate': (validation.valid ? currentCompliant + 1 : currentCompliant) / (currentTotal + 1),
    updatedAt: now
  })
}

// ============================================================================
// Simple AI Check (using Cloud Vision API if available)
// ============================================================================

export interface AIPhotoAnalysis {
  fishDetected: boolean
  confidence: number
  qualityEstimate?: number
  issues: string[]
}

export async function analyzePhotoWithAI(
  _imageUrl: string
): Promise<AIPhotoAnalysis> {
  // This is a placeholder for AI analysis
  // In production, you would:
  // 1. Download image from URL
  // 2. Send to Google Cloud Vision, AWS Rekognition, or custom model
  // 3. Parse results for fish detection, quality indicators
  
  // For now, return a basic structure
  return {
    fishDetected: true, // Assume fish is present (would be checked by AI)
    confidence: 0.85,
    qualityEstimate: undefined, // Would need trained model
    issues: []
  }
}

/**
 * Trigger AI analysis on photo upload (optional enhancement)
 */
export const analyzeListingPhoto = functions.https.onCall(
  async (data: { photoUrl: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    try {
      const analysis = await analyzePhotoWithAI(data.photoUrl)
      return { analysis }
    } catch (error) {
      console.error('Error analyzing photo:', error)
      throw new functions.https.HttpsError('internal', 'Failed to analyze photo')
    }
  }
)
