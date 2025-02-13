
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Download, Save, Mic, MicOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const { data: consultations, refetch: refetchConsultations } = useQuery({
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

  const createConsultationMutation = useMutation({
    mutationFn: async (content: string) => {
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
        .insert([{
          consultation_id: consultation.id,
          content,
          language: 'en',
          is_original: true
        }]);

      if (contentError) throw contentError;
      return consultation.id;
    },
    onSuccess: (consultationId) => {
      setConsultationId(consultationId);
      refetchConsultations();
      toast.success("Consultation saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save consultation");
      console.error("Error saving consultation:", error);
    }
  });

  const downloadDocument = async (consultationId: string) => {
    try {
      const response = await supabase.functions.invoke('generate-document', {
        body: { consultationId, type: 'docx' }
      });

      if (response.error) throw response.error;

      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) throw new Error('No document available');

      window.open(data.document_url, '_blank');
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTranscript('');
      setConsultationId(null);
    }
  };

  const saveConsultation = async () => {
    if (transcript) {
      await createConsultationMutation.mutateAsync(transcript);
      setTranscript('');
      setIsRecording(false);
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
                <span>Medical Consultation Transcription</span>
                <button
                  onClick={toggleRecording}
                  className={`p-2 rounded-full bg-[#2A3041] hover:bg-[#343B4F] transition-colors`}
                >
                  {isRecording ? (
                    <MicOff className="w-6 h-6 text-red-400" />
                  ) : (
                    <Mic className="w-6 h-6 text-[#9b87f5]" />
                  )}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRecording && (
                <Alert className="mb-4 bg-[#2A3041] border-[#9b87f5]/20">
                  <AlertDescription className="text-white">
                    Recording in progress... Speaking detected
                  </AlertDescription>
                </Alert>
              )}
              <div className="min-h-[200px] p-4 bg-[#2A3041] rounded-lg border border-white/5">
                {transcript || "Consultation notes will appear here in real-time..."}
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={saveConsultation}
                disabled={!transcript}
                className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Consultation
              </Button>
            </CardFooter>
          </Card>

          {consultations && consultations.length > 0 && (
            <Card className="bg-[#222837] border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Previous Consultations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="p-4 bg-[#2A3041] rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">
                          {new Date(consultation.created_at).toLocaleString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(consultation.id)}
                          className="text-[#9b87f5] hover:text-[#7E69AB]"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Word
                        </Button>
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
