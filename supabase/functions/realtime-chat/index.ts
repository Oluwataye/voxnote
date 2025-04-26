
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    // Request an ephemeral token from OpenAI with specific medical transcription instructions
    // Using gpt-4o model which has best performance for transcription
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      console.log("Requesting OpenAI session token...");
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          voice: "alloy",
          instructions: "You are a medical transcription assistant specialized in real-time medical consultation transcription. Focus on accurately capturing medical terminology, diagnoses, treatments, and patient information. Maintain professional medical language and proper formatting. Ensure high accuracy in medical terms and maintain HIPAA compliance by not including any personally identifiable information unless explicitly stated."
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Session created:", data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error("Request to OpenAI timed out. Please try again.");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error:", error);
    
    // Provide better error messaging
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes("OPENAI_API_KEY")) {
      errorMessage = "Server configuration error: API key missing";
      statusCode = 500;
    } else if (error.message.includes("timed out")) {
      errorMessage = "Connection to AI service timed out. Please try again.";
      statusCode = 504;
    } else if (error instanceof TypeError && error.message.includes("fetch")) {
      errorMessage = "Network error when connecting to OpenAI API. Please try again later.";
      statusCode = 503;
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
