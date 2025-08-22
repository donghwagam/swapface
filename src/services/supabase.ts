import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://afsmkbuspfmhenrccwru.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmc21rYnVzcGZtaGVucmNjd3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODcxNzUsImV4cCI6MjA3MTI2MzE3NX0.x2RCn4DBe10CKNC9LZ6CIvwuj__IU5cbxPJd7JJIU-U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// AIFaceSwap proxy functions
export async function callAIFaceSwapAPI(action: string, data: any) {
  console.log('🚀 Calling AIFaceSwap API via Supabase proxy')
  console.log('Action:', action)
  console.log('Data keys:', Object.keys(data || {}))

  // Method 1: Try direct fetch to Edge Function
  const functionUrl = `${supabaseUrl}/functions/v1/aifaceswap-proxy`
  console.log('Direct function URL:', functionUrl)

  try {
    console.log('🔄 Attempting direct fetch to Edge Function...')
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        data
      })
    })

    console.log('Direct fetch response status:', response.status)
    console.log('Direct fetch response headers:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('Direct fetch response body:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse response:', parseError)
      throw new Error(`Invalid JSON response: ${responseText}`)
    }

    // Check if the response is actually successful based on content, not just HTTP status
    if (result.code && result.code === 200) {
      console.log('🎉 AIFaceSwap API successful:', result)
      return result
    } else if (result.message) {
      console.log('🔍 AIFaceSwap API error message:', result.message)
      // Don't throw error immediately - let's see what the actual error is
      if (result.message === 'image url exception') {
        throw new Error('AIFaceSwap API: Invalid image URL. Images must be publicly accessible URLs, not base64 data.')
      } else {
        throw new Error(`AIFaceSwap API error: ${result.message}`)
      }
    }

    console.log('🎉 Direct fetch successful:', result)
    return result

  } catch (directError) {
    console.error('💥 Direct fetch failed:', directError)
    
    // Method 2: Fallback to Supabase client invoke
    console.log('🔄 Attempting Supabase client invoke as fallback...')
    try {
      const { data: result, error } = await supabase.functions.invoke('aifaceswap-proxy', {
        body: {
          action,
          data
        }
      })

      console.log('✅ Supabase invoke result:', { result, error })

      if (error) {
        console.error('❌ Supabase function error:', error)
        throw new Error(`Supabase function error: ${error.message}`)
      }

      console.log('🎉 Supabase invoke successful:', result)
      return result
    } catch (supabaseError) {
      console.error('💥 Both methods failed:', { directError, supabaseError })
      throw supabaseError
    }
  }
}

// Image upload to Supabase Storage
export async function uploadImageToSupabase(file: File, bucket: string = 'faceswap-images'): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `uploads/${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Image upload error: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return publicUrl
}

// Create storage bucket if it doesn't exist
export async function createStorageBucket(bucket: string = 'faceswap-images') {
  const { data, error } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 10485760 // 10MB
  })

  if (error && error.message !== 'Bucket already exists') {
    console.error('Bucket creation error:', error)
  }

  return data
}

// Replicate proxy functions (legacy)
export async function callReplicateAPI(method: string, endpoint: string, body?: any) {
  const { data, error } = await supabase.functions.invoke('replicate-proxy', {
    body: {
      method,
      endpoint,
      body
    }
  })

  if (error) {
    throw new Error(`Supabase function error: ${error.message}`)
  }

  return data
}