
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { RealtimeChat } from "@/utils/audio";

export const useTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chat, setChat] = useState<RealtimeChat | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const micPermissionChecked = useRef(false);

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

  const resetTranscript = () => {
    setTranscript('');
  };

  // Cleanup for WebRTC connections
  const cleanup = () => {
    if (chat) {
      chat.disconnect();
      setChat(null);
    }
  };

  return {
    isRecording,
    isSpeaking,
    transcript,
    transcriptRef,
    toggleRecording,
    resetTranscript,
    cleanup
  };
};
