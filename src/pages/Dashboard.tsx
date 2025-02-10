
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
import { MessageSquare, Download } from "lucide-react";

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

  const { data: consultations } = useQuery({
    queryKey: ['consultations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          consultation_contents (
            content,
            language,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    }
  });

  const downloadDocument = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) throw new Error('No document available');

      window.open(data.document_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#13151C] text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <MessageSquare className="w-8 h-8 text-[#9b87f5]" />
          <div>
            <h1 className="text-3xl font-semibold mb-1">VoxNote</h1>
            <p className="text-sm text-gray-400">Medical Consultation Assistant</p>
          </div>
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

          {consultations && consultations.length > 0 && (
            <div className="bg-[#222837] rounded-2xl p-6 shadow-lg border border-white/5">
              <h2 className="text-xl font-medium mb-4">Consultation History</h2>
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="p-4 bg-[#2A3041] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-400">
                        {new Date(consultation.created_at).toLocaleString()}
                      </div>
                      {consultation.document_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(consultation.id)}
                          className="text-[#9b87f5] hover:text-[#7E69AB]"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                    <div className="text-white/90">
                      {consultation.consultation_contents?.[0]?.content || 'No content available'}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className={`px-2 py-1 rounded-full ${
                        consultation.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400'
                          : consultation.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {consultation.status}
                      </span>
                    </div>
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
