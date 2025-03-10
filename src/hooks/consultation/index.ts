
import { useEffect } from 'react';
import { useTranscription } from './useTranscription';
import { useConsultationStorage } from './useConsultationStorage';

export const useConsultationData = () => {
  const { 
    isRecording,
    isSpeaking,
    transcript,
    transcriptRef,
    toggleRecording,
    resetTranscript,
    clearTranscript,
    cleanup
  } = useTranscription();

  const {
    consultations,
    isLoading,
    saveConsultation,
    downloadDocument
  } = useConsultationStorage();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const handleSave = async () => {
    const saved = await saveConsultation(transcript);
    if (saved) {
      resetTranscript();
    }
  };

  return {
    // Transcription related
    isRecording,
    isSpeaking,
    transcript,
    transcriptRef,
    toggleRecording,
    clearTranscript,
    
    // Consultation storage related
    consultations,
    isLoading,
    saveConsultation: handleSave,
    downloadDocument
  };
};

// Re-export types
export type { Consultation, ConsultationContent } from './useConsultationStorage';
