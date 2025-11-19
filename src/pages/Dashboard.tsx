
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TranscriptionArea } from "@/components/dashboard/transcription";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";
import { TemplateSelector } from "@/components/TemplateSelector";
import { useConsultationData } from "@/hooks/consultation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConsultationTemplate } from "@/types/templates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const {
    isRecording,
    isSpeaking,
    transcript,
    transcriptRef,
    consultations,
    isLoading,
    toggleRecording,
    saveConsultation,
    downloadDocument,
    clearTranscript,
  } = useConsultationData();

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null);

  // Show template selector when starting a new consultation
  useEffect(() => {
    if (isRecording && !currentConsultationId && !selectedTemplate) {
      setShowTemplateSelector(true);
    }
  }, [isRecording, currentConsultationId, selectedTemplate]);

  const handleSelectTemplate = async (template: ConsultationTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    
    // Apply template tags to current consultation
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the most recent in_progress consultation
      const { data: consultation, error } = await supabase
        .from('consultations')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !consultation) {
        console.error("Error finding consultation:", error);
        return;
      }

      // Update consultation with template tags
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ tags: template.tags })
        .eq('id', consultation.id);

      if (updateError) {
        console.error("Error updating tags:", updateError);
        toast.error("Failed to apply template tags");
      } else {
        setCurrentConsultationId(consultation.id);
        toast.success(`Applied ${template.name} template`);
      }
    } catch (error) {
      console.error("Error applying template:", error);
    }
  };

  const handleSkipTemplate = () => {
    setShowTemplateSelector(false);
  };

  const handleClearTranscript = () => {
    clearTranscript();
    setSelectedTemplate(null);
    setCurrentConsultationId(null);
  };

  return (
    <DashboardLayout>
      <ErrorBoundary componentName="Dashboard Header">
        <DashboardHeader />
      </ErrorBoundary>

      {showTemplateSelector && (
        <div className="mb-6">
          <TemplateSelector
            onSelectTemplate={handleSelectTemplate}
            onSkip={handleSkipTemplate}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <ErrorBoundary componentName="Transcription Area">
          <TranscriptionArea
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            transcript={transcript}
            transcriptRef={transcriptRef}
            onToggleRecording={toggleRecording}
            onSave={saveConsultation}
            onClear={handleClearTranscript}
          />
        </ErrorBoundary>

        <ErrorBoundary componentName="Recent Consultations">
          <RecentConsultations
            consultations={consultations || []}
            onDownload={downloadDocument}
            isLoading={isLoading}
          />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

