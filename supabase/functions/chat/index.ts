
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format')
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Initialize OpenAI client
    const configuration = new Configuration({
      apiKey: openAIApiKey,
    })
    const openai = new OpenAIApi(configuration)

    // Create chat completion
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages.map(({ content, role }) => ({
        role,
        content,
      })),
    })

    if (!completion.data.choices[0].message) {
      throw new Error('No response from OpenAI')
    }

    const response = completion.data.choices[0].message

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in chat function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
