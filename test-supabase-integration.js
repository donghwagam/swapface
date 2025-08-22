/**
 * Test script to verify Supabase integration for AIFaceSwap proxy
 * Run this from the browser console to test the integration
 */

// Test Supabase functions import
import { callAIFaceSwapAPI, uploadImageToSupabase, createStorageBucket } from './src/services/supabase.js';

async function testSupabaseIntegration() {
  console.log('🧪 Testing Supabase AIFaceSwap integration...');
  
  try {
    // Test 1: Create storage bucket
    console.log('1. Testing storage bucket creation...');
    await createStorageBucket();
    console.log('✅ Storage bucket created/verified');
    
    // Test 2: Test API proxy with mock data
    console.log('2. Testing AIFaceSwap API proxy...');
    const testData = {
      source_image: 'https://example.com/source.jpg',
      face_image: 'https://example.com/face.jpg'
    };
    
    const result = await callAIFaceSwapAPI('faceswap', testData);
    console.log('✅ API proxy test result:', result);
    
    console.log('🎉 All tests passed! Supabase integration is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('Function not deployed')) {
      console.log('💡 Next steps:');
      console.log('1. Login to Supabase: npx supabase login');
      console.log('2. Deploy Edge Function: npx supabase functions deploy aifaceswap-proxy');
    }
  }
}

// Instructions for running the test
console.log(`
🧪 Supabase Integration Test

To run this test:
1. Open your browser console
2. Navigate to your app (http://localhost:5173)
3. Run: testSupabaseIntegration()

Or test individual components:
- callAIFaceSwapAPI('faceswap', {source_image: 'url1', face_image: 'url2'})
- createStorageBucket()
`);

// Export for browser console
if (typeof window !== 'undefined') {
  window.testSupabaseIntegration = testSupabaseIntegration;
}