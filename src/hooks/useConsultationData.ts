
import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChat } from "@/utils/audio";

export interface ConsultationContent {
  content: string;
  language: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  created_at: string;
  consultation_contents?: ConsultationContent[];
  document_url?: string | null;
}

export const useConsultationData = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chat, setChat] = useState<RealtimeChat | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const micPermissionChecked = useRef(false);

  // Add cleanup effect for WebRTC connections
  useEffect(() => {
    return () => {
      if (chat) {
        chat.disconnect();
        setChat(null);
      }
    };
  }, [chat]);

  const { data: consultations, refetch: refetchConsultations, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: async () => {
      try {
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
          
        if (error) {
          console.error("Error fetching consultations:", error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error("Failed to fetch consultations:", error);
        toast.error("Unable to load consultations. Please try again later.");
        return [];
      }
    }
  });

  const handleMessage = useCallback((event: any) => {
    try {
      console.log('Received transcription event:', event);
      
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
  }, []);

  const checkMicrophonePermission = async () => {
    if (micPermissionChecked.current) return true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000
        } 
      });
      
      // Stop the tracks after checking permission
      stream.getTracks().forEach(track => track.stop());
      micPermissionChecked.current = true;
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please enable microphone access to use this feature.");
      } else if (error instanceof DOMException && error.name === 'NotReadableError') {
        toast.error("Unable to access your microphone. Please check your device connections.");
      } else {
        toast.error("Failed to access microphone. Please try again.");
      }
      return false;
    }
  };

  const startRecording = async () => {
    try {
      // Check for microphone permissions first
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return;
      
      // Initialize the real-time chat
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

  const saveConsultation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        throw new Error("Not authenticated");
      }

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

      if (consultationError) {
        console.error("Error creating consultation:", consultationError);
        throw consultationError;
      }

      const { error: contentError } = await supabase
        .from('consultation_contents')
        .insert([{
          consultation_id: consultation.id,
          content: transcript,
          language: 'en',
          is_original: true
        }]);

      if (contentError) {
        console.error("Error adding consultation content:", contentError);
        throw contentError;
      }

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

  const downloadDocument = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) {
        toast.error("Document not available yet");
        throw new Error('Document not found');
      }

      window.open(data.document_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  return {
    isRecording,
    isSpeaking,
    transcript,
    transcriptRef,
    consultations,
    isLoading,
    toggleRecording,
    saveConsultation,
    downloadDocument,
  };
};
