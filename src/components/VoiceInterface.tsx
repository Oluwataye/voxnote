
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  StopCircle, 
  Mic,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInterfaceProps {
  onSpeakingChange: (speaking: boolean) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onSpeakingChange }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const chatRef = useRef<RealtimeChat | null>(null);

  useEffect(() => {
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        toast({
          title: "Authentication Required",
          description: "Please sign in to use the voice features",
          variant: "destructive",
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleMessage = (event: any) => {
    console.log('Received message:', event);
    
    if (event.type === 'response.audio.delta') {
      onSpeakingChange(true);
    } else if (event.type === 'response.audio.done') {
      onSpeakingChange(false);
    }
  };

  const startConsultation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        toast({
          title: "Authentication Required",
          description: "Please sign in to use the voice features",
          variant: "destructive",
        });
        return;
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
      
      toast({
        title: "Connected",
        description: "Voice interface is ready",
      });
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start consultation',
        variant: "destructive",
      });
    }
  };

  const pauseConsultation = async () => {
    if (!consultationId) return;

    try {
      chatRef.current?.pause();
      setIsPaused(true);

      const { error } = await supabase
        .from('consultations')
        .update({ is_paused: true })
        .eq('id', consultationId);

      if (error) throw error;

      toast.success("Consultation paused");
    } catch (error) {
      console.error('Error pausing consultation:', error);
      toast.error("Failed to pause consultation");
    }
  };

  const resumeConsultation = async () => {
    if (!consultationId) return;

    try {
      chatRef.current?.resume();
      setIsPaused(false);

      const { error } = await supabase
        .from('consultations')
        .update({ is_paused: false })
        .eq('id', consultationId);

      if (error) throw error;

      toast.success("Consultation resumed");
    } catch (error) {
      console.error('Error resuming consultation:', error);
      toast.error("Failed to resume consultation");
    }
  };

  const endConsultation = async () => {
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

  const downloadDocument = async () => {
    if (!consultationId) return;

    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) throw new Error('No document available');

      window.open(data.document_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <Button 
          onClick={startConsultation}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
        >
          <Mic className="w-4 h-4 mr-2" />
          Start Consultation
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
      {isPaused ? (
        <Button
          onClick={resumeConsultation}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
        >
          <Play className="w-4 h-4 mr-2" />
          Resume
        </Button>
      ) : (
        <Button
          onClick={pauseConsultation}
          className="bg-[#2A3041] hover:bg-[#1A1F2C] text-white"
        >
          <Pause className="w-4 h-4 mr-2" />
          Pause
        </Button>
      )}

      <Button
        onClick={endConsultation}
        variant="secondary"
        className="bg-[#2A3041] text-white hover:bg-[#1A1F2C]"
      >
        <StopCircle className="w-4 h-4 mr-2" />
        End
      </Button>

      {consultationId && (
        <Button
          onClick={downloadDocument}
          variant="outline"
          className="border-white/5 text-white hover:bg-[#2A3041]"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      )}
    </div>
  );
};

export default VoiceInterface;
