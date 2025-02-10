
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { consultationId, type = 'pdf' } = await req.json()

    if (!consultationId) {
      throw new Error('Consultation ID is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch consultation data
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select(`
        *,
        consultation_contents (
          content,
          language,
          created_at
        )
      `)
      .eq('id', consultationId)
      .single()

    if (consultationError) {
      throw consultationError
    }

    // Generate document content
    const content = consultation.consultation_contents
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((content: any) => content.content)
      .join('\n\n')

    // In a real implementation, you would use a proper document generation service
    // This is a simplified example that just creates a text file
    const documentContent = `
VoxNote Consultation Report
Generated on: ${new Date().toLocaleString()}

${content}
    `.trim()

    // Generate unique filename
    const fileName = `${consultation.user_id}/${consultationId}/${crypto.randomUUID()}.${type}`

    // Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, new Blob([documentContent], { type: 'text/plain' }))

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Update consultation with document URL
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        document_url: publicUrl,
        document_type: type
      })
      .eq('id', consultationId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
