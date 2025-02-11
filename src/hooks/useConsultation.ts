
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChat } from '@/utils/audio';
import { toast } from 'sonner';

interface ConsultationHookResult {
  isConnected: boolean;
  isPaused: boolean;
  isStarting: boolean;
  consultationId: string | null;
  startConsultation: (chatRef: React.MutableRefObject<RealtimeChat | null>) => Promise<void>;
  pauseConsultation: () => Promise<void>;
  resumeConsultation: () => Promise<void>;
  endConsultation: (chatRef: React.MutableRefObject<RealtimeChat | null>) => Promise<void>;
}

interface MessageEvent {
  type: string;
  [key: string]: any;
}

export const useConsultation = (onSpeakingChange: (speaking: boolean) => void): ConsultationHookResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const handleMessage = (event: MessageEvent) => {
    console.log('Received message:', event);
    
    if (event.type === 'response.audio.delta') {
      onSpeakingChange(true);
    } else if (event.type === 'response.audio.done') {
      onSpeakingChange(false);
    }
  };

  const startConsultation = async (chatRef: React.MutableRefObject<RealtimeChat | null>) => {
    try {
      setIsStarting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Authentication required");
      }

      // Create new consultation
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .insert({
          user_id: session.user.id,
          status: 'in_progress'
        })
        .select()
        .single();

      if (consultationError) throw consultationError;

      setConsultationId(consultation.id);

      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      setIsConnected(true);
      setIsPaused(false);
      
      toast.success("Connected! Voice interface is ready");
    } catch (error) {
      console.error('Error starting consultation:', error);
      if (error instanceof Error && error.message.includes('microphone')) {
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to start consultation');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const pauseConsultation = async () => {
    if (!consultationId) return;

    try {
      const { error } = await supabase
        .from('consultations')
        .update({ is_paused: true })
        .eq('id', consultationId);

      if (error) throw error;
      setIsPaused(true);
      toast.success("Consultation paused");
    } catch (error) {
      console.error('Error pausing consultation:', error);
      toast.error("Failed to pause consultation");
    }
  };

  const resumeConsultation = async () => {
    if (!consultationId) return;

    try {
      const { error } = await supabase
        .from('consultations')
        .update({ is_paused: false })
        .eq('id', consultationId);

      if (error) throw error;
      setIsPaused(false);
      toast.success("Consultation resumed");
    } catch (error) {
      console.error('Error resuming consultation:', error);
      toast.error("Failed to resume consultation");
    }
  };

  const endConsultation = async (chatRef: React.MutableRefObject<RealtimeChat | null>) => {
    if (!consultationId) return;

    try {
      chatRef.current?.disconnect();
      setIsConnected(false);
      setIsPaused(false);
      onSpeakingChange(false);

      const { error } = await supabase
        .from('consultations')
        .update({ status: 'completed' })
        .eq('id', consultationId);

      if (error) throw error;

      // Generate document
      const response = await supabase.functions.invoke('generate-document', {
        body: { consultationId, type: 'pdf' }
      });

      if (response.error) throw response.error;

      toast.success("Consultation completed and document generated");
      setConsultationId(null);
    } catch (error) {
      console.error('Error ending consultation:', error);
      toast.error("Failed to end consultation");
    }
  };

  return {
    isConnected,
    isPaused,
    isStarting,
    consultationId,
    startConsultation,
    pauseConsultation,
    resumeConsultation,
    endConsultation
  };
};
