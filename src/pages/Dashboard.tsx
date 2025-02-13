
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Save, Mic, MicOff } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { RealtimeChat } from "@/utils/audio";

const Dashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chat, setChat] = useState<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    if (event.type === 'response.audio_transcript.delta') {
      setTranscript(prev => prev + event.delta);
    } else if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      const newChat = new RealtimeChat(handleMessage);
      await newChat.init();
      setChat(newChat);
      setIsRecording(true);
      setTranscript('');
      toast.success("Recording started");
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (chat) {
      chat.disconnect();
      setChat(null);
      setIsRecording(false);
      setIsSpeaking(false);
      toast.success("Recording stopped");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const saveConsultation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .insert({
          original_language: 'en',
          status: 'completed',
          user_id: user.id
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

      // Generate document
      await supabase.functions.invoke('generate-document', {
        body: { consultationId: consultation.id, type: 'docx' }
      });

      setConsultationId(consultation.id);
      setTranscript('');
      toast.success("Consultation saved and document generated");
    } catch (error) {
      console.error("Error saving consultation:", error);
      toast.error("Failed to save consultation");
    }
  };

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

        <Card className="bg-[#222837] border-white/5">
          <CardHeader>
            <CardTitle className="flex justify-between items-center text-white">
              <span>Medical Consultation Transcription</span>
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-full bg-[#2A3041] hover:bg-[#343B4F] transition-colors ${
                  isRecording ? 'ring-2 ring-red-400' : ''
                }`}
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
                  {isSpeaking ? "Speaking detected..." : "Recording in progress..."}
                </AlertDescription>
              </Alert>
            )}
            <div className="min-h-[400px] p-6 bg-[#2A3041] rounded-lg border border-white/5 transition-all">
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
          <CardFooter className="justify-end">
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
      </div>
    </div>
  );
};

export default Dashboard;
