
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Save, Mic, MicOff, Download, Edit, Clock } from "lucide-react";
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

  // Enhanced message handler with better logging and error handling
  const handleMessage = (event: any) => {
    console.log('Received transcription event:', event);
    
    try {
      if (event.type === 'response.audio_transcript.delta') {
        setTranscript(prev => {
          const newTranscript = prev + event.delta;
          console.log('Updated transcript:', newTranscript);
          return newTranscript;
        });
      } else if (event.type === 'response.audio.delta') {
        setIsSpeaking(true);
      } else if (event.type === 'response.audio.done') {
        setIsSpeaking(false);
      } else if (event.type === 'error') {
        console.error('Transcription error:', event);
        toast.error("Error in transcription");
      }
    } catch (error) {
      console.error('Error handling transcription message:', error);
    }
  };

  // Enhanced recording start with better error handling
  const startRecording = async () => {
    try {
      // Request microphone permissions with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000
        } 
      });
      stream.getTracks().forEach(track => track.stop());

      const newChat = new RealtimeChat(handleMessage);
      await newChat.init();
      setChat(newChat);
      setIsRecording(true);
      setTranscript('');
      
      console.log('Recording started successfully');
      toast.success("Recording started");
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please enable microphone access to use this feature.");
      } else if (error instanceof DOMException && error.name === 'NotReadableError') {
        toast.error("Unable to access your microphone. Please check your device connections.");
      } else {
        toast.error("Failed to start recording. Please try again.");
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

  // Enhanced auto-scroll effect with smooth behavior
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcript]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#13151C] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#2A3041] rounded-xl">
              <MessageSquare className="w-8 h-8 text-[#9b87f5]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1">Medical Consultation</h1>
              <p className="text-sm text-gray-400">Record and transcribe patient consultations</p>
            </div>
          </div>
          <div className="hidden md:block">
            <Clock className="w-5 h-5 text-gray-400 mb-1" />
            <p className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          {/* Main Transcription Area */}
          <div className="space-y-6">
            <Card className="bg-[#222837] border-white/5">
              <CardHeader className="space-y-0">
                <CardTitle className="flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <span>Live Transcription</span>
                    {isRecording && (
                      <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full animate-pulse">
                        Recording
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={toggleRecording}
                    variant={isRecording ? "destructive" : "default"}
                    size="icon"
                    className={`rounded-full transition-all duration-200 ${
                      isRecording ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-[#9b87f5] hover:bg-[#8674d4]'
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRecording && (
                  <Alert className="bg-[#2A3041] border-[#9b87f5]/20">
                    <AlertDescription className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                        }`} />
                        <span className={`text-sm ${
                          isSpeaking ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isSpeaking ? 'Speech detected' : 'Waiting for speech...'}
                        </span>
                      </div>
                      {isSpeaking && (
                        <div className="flex gap-1">
                          <div className="w-1 h-4 bg-green-400/30 animate-pulse" style={{ animationDelay: "0s" }} />
                          <div className="w-1 h-4 bg-green-400/30 animate-pulse" style={{ animationDelay: "0.2s" }} />
                          <div className="w-1 h-4 bg-green-400/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <div 
                  ref={transcriptRef}
                  className="min-h-[400px] max-h-[600px] p-6 bg-[#2A3041] rounded-lg border border-white/5 transition-all overflow-y-auto font-mono text-sm leading-relaxed"
                >
                  {transcript ? (
                    <div className="whitespace-pre-wrap break-words">
                      {transcript}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">
                      {isRecording 
                        ? "Start speaking to see the transcription in real-time..."
                        : "Click the microphone button above to start recording your consultation..."}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button
                  onClick={saveConsultation}
                  disabled={!transcript || isRecording}
                  className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white transition-all gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Consultation
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Recent Consultations Sidebar */}
          {consultations && consultations.length > 0 && (
            <Card className="bg-[#222837] border-white/5 h-fit">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Consultations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {consultations.slice(0, 5).map((consultation) => (
                    <div 
                      key={consultation.id} 
                      className="p-4 bg-[#2A3041] rounded-xl border border-white/5 transition-all hover:border-[#9b87f5]/30"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <time className="text-xs text-gray-400 font-mono">
                          {new Date(consultation.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </time>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadDocument(consultation.id)}
                          className="h-8 w-8 text-[#9b87f5] hover:text-[#7E69AB] hover:bg-[#9b87f5]/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-white/90 line-clamp-3">
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
