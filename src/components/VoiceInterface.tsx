
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RealtimeChat } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Mic, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useConsultation } from '@/hooks/useConsultation';
import ConsultationControls from './ConsultationControls';

interface VoiceInterfaceProps {
  onSpeakingChange: (speaking: boolean) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onSpeakingChange }) => {
  const navigate = useNavigate();
  const chatRef = useRef<RealtimeChat | null>(null);
  const {
    isConnected,
    isPaused,
    isStarting,
    consultationId,
    startConsultation,
    pauseConsultation,
    resumeConsultation,
    endConsultation
  } = useConsultation(onSpeakingChange);

  useEffect(() => {
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        toast.error("Authentication required. Please sign in to use the voice features");
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
  }, [navigate]);

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  const handleStartConsultation = () => {
    startConsultation(chatRef);
  };

  const handlePauseConsultation = async () => {
    chatRef.current?.pause();
    await pauseConsultation();
  };

  const handleResumeConsultation = async () => {
    chatRef.current?.resume();
    await resumeConsultation();
  };

  const handleEndConsultation = () => {
    endConsultation(chatRef);
  };

  const generatePDF = async () => {
    if (!consultationId) return;

    try {
      toast.loading('Generating PDF...', { id: 'pdf-generation' });

      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { consultationId, type: 'pdf' }
      });

      if (error) throw error;

      toast.success('PDF generated successfully!', { id: 'pdf-generation' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-generation' });
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

  if (!isConnected) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <Button 
          onClick={handleStartConsultation}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
          disabled={isStarting}
        >
          <Mic className="w-4 h-4 mr-2" />
          {isStarting ? 'Requesting Access...' : 'Start Consultation'}
        </Button>
      </div>
    );
  }

  return (
    <ConsultationControls
      isPaused={isPaused}
      onPause={handlePauseConsultation}
      onResume={handleResumeConsultation}
      onEnd={handleEndConsultation}
      onDownload={downloadDocument}
      onGeneratePDF={generatePDF}
      consultationId={consultationId}
    />
  );
};

export default VoiceInterface;
