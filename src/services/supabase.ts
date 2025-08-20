import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://afsmkbuspfmhenrccwru.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmc21rYnVzcGZtaGVucmNjd3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODcxNzUsImV4cCI6MjA3MTI2MzE3NX0.x2RCn4DBe10CKNC9LZ6CIvwuj__IU5cbxPJd7JJIU-U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Replicate proxy functions
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