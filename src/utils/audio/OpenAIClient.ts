
import { supabase } from "@/integrations/supabase/client";

export interface EphemeralTokenResponse {
  client_secret?: {
    value: string;
  };
  model?: string;
  error?: string;
}

export class OpenAIClient {
  async getEphemeralToken(): Promise<{token: string, model: string}> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Authentication required");
    }

    const tokenResponse = await supabase.functions.invoke("realtime-chat");
    const data = await tokenResponse.data as EphemeralTokenResponse;
    
    if (!data.client_secret?.value) {
      throw new Error("Failed to get ephemeral token");
    }

    const EPHEMERAL_KEY = data.client_secret.value;
    const model = data.model || "gpt-4o"; // Get the model from the session or use gpt-4o as fallback
    
    console.log("Got ephemeral token, connecting to OpenAI...");
    return { token: EPHEMERAL_KEY, model };
  }
}
