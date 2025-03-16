
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { RealtimeChat } from "@/utils/audio";

export const useTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chat, setChat] = useState<RealtimeChat | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
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
        toast.error("Error in transcription: " + (event.error?.message || "Unknown error"));
      }
    } catch (error) {
      console.error('Error handling transcription message:', error);
    }
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // Request microphone with high-quality settings for better transcription
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000
        } 
      });
      
      // Test if we can actually access the mic by checking track readiness
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error('Could not enable audio track');
      }
      
      // Only stop tracks after successfully confirming mic access
      stream.getTracks().forEach(track => track.stop());
      micPermissionChecked.current = true;
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please enable microphone access in your browser settings.");
      } else if (error instanceof DOMException && error.name === 'NotReadableError') {
        toast.error("Unable to access your microphone. Please check your device connections or try using another microphone.");
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        toast.error("No microphone detected. Please connect a microphone to your device.");
      } else {
        toast.error("Failed to access microphone. Please try again or check your device settings.");
      }
      return false;
    }
  };

  const startRecording = async () => {
    if (isInitializing) {
      toast.info("Initializing, please wait...");
      return false;
    }
    
    try {
      setIsInitializing(true);
      
      // Check for microphone permissions first
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return false;
      
      // Initialize the real-time chat
      const newChat = new RealtimeChat(handleMessage);
      
      toast.loading("Connecting to AI service...");
      
      try {
        // Initialize will throw an error if something goes wrong
        await newChat.init();
        
        setChat(newChat);
        setIsRecording(true);
        setTranscript('');
        
        console.log('Recording started successfully');
        toast.success("Recording started");
        return true;
      } catch (error) {
        let errorMessage = "Failed to start recording. Please try again.";
        
        if (error instanceof Error) {
          // Network related errors
          if (error.message.includes("Network connection")) {
            errorMessage = "Network connection error. Please check your internet connection and try again.";
          } 
          // Authentication errors
          else if (error.message.includes("Authentication") || error.message.includes("API key")) {
            errorMessage = "Authentication error. Please try signing out and signing back in.";
          }
          // Microphone errors
          else if (error.message.includes("microphone")) {
            errorMessage = error.message;
          }
        }
        
        console.error('Error starting recording:', error);
        toast.error(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Failed to start recording. Please try again.");
      return false;
    } finally {
      setIsInitializing(false);
      toast.dismiss();
    }
  };

  const stopRecording = () => {
    if (chat) {
      chat.disconnect();
      setChat(null);
      setIsRecording(false);
      setIsSpeaking(false);
      toast.success("Recording completed");
      return true;
    }
    return false;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      return stopRecording();
    } else {
      return startRecording();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  const clearTranscript = () => {
    setTranscript('');
    toast.success("Transcription cleared");
  };

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
    clearTranscript,
    cleanup
  };
};
