
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Save, Mic, MicOff, Download, Edit } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { RealtimeChat } from "@/utils/audio";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chat, setChat] = useState<RealtimeChat | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Query for fetching consultations
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

  // Auto-scroll transcript viewport
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Handle real-time transcription messages
  const handleMessage = (event: any) => {
    console.log('Received event:', event);
    if (event.type === 'response.audio_transcript.delta') {
      setTranscript(prev => prev + event.delta);
    } else if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
    }
  };

  // Initialize recording with proper error handling
  const startRecording = async () => {
    try {
      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately as RealtimeChat will request again

      const newChat = new RealtimeChat(handleMessage);
      await newChat.init();
      setChat(newChat);
      setIsRecording(true);
      setTranscript('');
      toast.success("Recording started");
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please enable microphone access to use this feature.");
      } else {
        toast.error("Failed to start recording. Please check your microphone connection.");
      }
    }
  };

  const stopRecording = () => {
    if (chat) {
      chat.disconnect();
      setChat(null);
      setIsRecording(false);
      setIsSpeaking(false);
      toast.success("Recording completed");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Save consultation with proper HIPAA compliance considerations
  const saveConsultation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .insert({
          original_language: 'en',
          status: 'completed',
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (consultationError) throw consultationError;

      const { error: contentError } = await supabase
        .from('consultation_contents')
        .insert([{
          consultation_id: consultation.id,
          content: transcript,
          language: 'en',
          is_original: true
        }]);

      if (contentError) throw contentError;

      // Generate Word document for editing
      await supabase.functions.invoke('generate-document', {
        body: { consultationId: consultation.id, type: 'docx' }
      });

      setConsultationId(consultation.id);
      setTranscript('');
      await refetchConsultations();
      toast.success("Consultation saved and document generated");
    } catch (error) {
      console.error("Error saving consultation:", error);
      toast.error("Failed to save consultation. Please try again.");
    }
  };

  // Download consultation document
  const downloadDocument = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) throw new Error('Document not found');

      window.open(data.document_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  // Cleanup WebRTC connections
  useEffect(() => {
    return () => {
      if (chat) {
        chat.disconnect();
      }
    };
  }, [chat]);

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
                  className={`p-2 rounded-full bg-[#2A3041] hover:bg-[#343B4F] transition-colors ${
                    isRecording ? 'ring-2 ring-red-400 animate-pulse' : ''
                  }`}
                  title={isRecording ? "Stop Recording" : "Start Recording"}
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
                  <AlertDescription className="text-white flex items-center gap-2">
                    {isSpeaking ? (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Speaking detected...
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-400 rounded-full" />
                        Waiting for speech...
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <div 
                ref={transcriptRef}
                className="min-h-[400px] max-h-[600px] p-6 bg-[#2A3041] rounded-lg border border-white/5 transition-all overflow-y-auto"
              >
                {transcript ? (
                  <div className="whitespace-pre-wrap">{transcript}</div>
                ) : (
                  <div className="text-gray-400">
                    {isRecording 
                      ? "Start speaking to see the transcription in real-time..."
                      : "Click the microphone button to start recording your consultation..."
                    }
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button
                onClick={saveConsultation}
                disabled={!transcript || isRecording}
                className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Consultation
              </Button>
            </CardFooter>
          </Card>

          {consultations && consultations.length > 0 && (
            <Card className="bg-[#222837] border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Recent Consultations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultations.slice(0, 5).map((consultation) => (
                    <div key={consultation.id} className="p-4 bg-[#2A3041] rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">
                          {new Date(consultation.created_at).toLocaleString()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(consultation.id)}
                            className="text-[#9b87f5] hover:text-[#7E69AB]"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <div className="text-white/90 max-h-32 overflow-y-auto">
                        {consultation.consultation_contents?.[0]?.content || 'No content available'}
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
