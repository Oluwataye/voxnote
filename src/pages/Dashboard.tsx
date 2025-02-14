import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChat } from "@/utils/audio";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TranscriptionArea } from "@/components/dashboard/TranscriptionArea";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";

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
        <DashboardHeader />

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <TranscriptionArea
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            transcript={transcript}
            transcriptRef={transcriptRef}
            onToggleRecording={toggleRecording}
            onSave={saveConsultation}
          />

          <RecentConsultations
            consultations={consultations || []}
            onDownload={downloadDocument}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
