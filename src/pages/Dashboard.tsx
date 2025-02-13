
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Download, Save, Mic, MicOff } from "lucide-react";
import VoiceInterface from "@/components/VoiceInterface";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";

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

  const downloadDocument = async (consultationId: string, format: 'pdf' | 'docx') => {
    try {
      // Generate document in the specified format
      const response = await supabase.functions.invoke('generate-document', {
        body: { consultationId, type: format }
      });

      if (response.error) throw response.error;

      // Update consultation with the new document URL
      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) throw new Error('No document available');

      window.open(data.document_url, '_blank');
      toast.success(`Downloaded ${format.toUpperCase()} document successfully`);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(`Failed to download ${format.toUpperCase()} document`);
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
          <Card className="bg-[#222837] border-white/5">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-white">
                <span>Current Consultation</span>
                <VoiceInterface onSpeakingChange={setIsSpeaking} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSpeaking && (
                <Alert className="mb-4 bg-[#2A3041] border-[#9b87f5]/20">
                  <AlertDescription className="text-white">
                    Recording in progress... Speaking detected
                  </AlertDescription>
                </Alert>
              )}
              <div className="min-h-[200px] p-4 bg-[#2A3041] rounded-lg border border-white/5">
                {content || "Consultation notes will appear here in real-time..."}
              </div>
            </CardContent>
          </Card>

          {consultations && consultations.length > 0 && (
            <Card className="bg-[#222837] border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Consultation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="p-4 bg-[#2A3041] rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">
                          {new Date(consultation.created_at).toLocaleString()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(consultation.id, 'pdf')}
                            className="text-[#9b87f5] hover:text-[#7E69AB]"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(consultation.id, 'docx')}
                            className="text-[#9b87f5] hover:text-[#7E69AB]"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Word
                          </Button>
                        </div>
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
