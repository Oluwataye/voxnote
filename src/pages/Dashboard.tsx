
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import VoiceInterface from "@/components/VoiceInterface";
import { MessageSquare } from "lucide-react";

const Dashboard = () => {
  const [content, setContent] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const createConsultation = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .insert({
        original_language: 'en',
        status: 'draft',
        user_id: user.id
      })
      .select()
      .single();

    if (consultationError) throw consultationError;

    const { error: contentError } = await supabase
      .from('consultation_contents')
      .insert([
        {
          consultation_id: consultation.id,
          content,
          language: 'en',
          is_original: true
        }
      ]);

    if (contentError) throw contentError;
    
    setConsultationId(consultation.id);
    return consultation.id;
  };

  const { data: transcripts } = useQuery({
    queryKey: ['transcripts', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];
      
      const { data, error } = await supabase
        .from('consultation_contents')
        .select('*')
        .eq('consultation_id', consultationId)
        .eq('is_original', true);
        
      if (error) throw error;
      return data;
    },
    enabled: !!consultationId
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#13151C] text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <MessageSquare className="w-8 h-8 text-[#9b87f5]" />
          <h1 className="text-3xl font-semibold">Medical Consultation Assistant</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-[#222837] rounded-2xl p-6 shadow-lg border border-white/5">
            <h2 className="text-xl font-medium mb-4">Current Consultation</h2>
            <div className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] bg-[#2A3041] border-white/5 focus:border-[#9b87f5] focus-visible:ring-[#9b87f5]/20 text-white placeholder:text-gray-400"
                placeholder="Consultation notes will appear here in real-time..."
              />
            </div>
          </div>

          {transcripts && transcripts.length > 0 && (
            <div className="bg-[#222837] rounded-2xl p-6 shadow-lg border border-white/5">
              <h2 className="text-xl font-medium mb-4">Consultation History</h2>
              <div className="space-y-4">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="p-4 bg-[#2A3041] rounded-xl">
                    <div className="text-sm text-gray-400 mb-2">
                      {new Date(transcript.created_at).toLocaleString()}
                    </div>
                    <div className="text-white/90">{transcript.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <VoiceInterface onSpeakingChange={setIsSpeaking} />
      </div>
    </div>
  );
};

export default Dashboard;
