
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TranscriptionArea } from "@/components/dashboard/transcription";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";
import { TemplateSelector } from "@/components/TemplateSelector";
import { useConsultationData } from "@/hooks/consultation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ConsultationTemplate, QuestionSet } from "@/types/templates";
import { VoiceQuestionGuide } from "@/utils/audio/VoiceQuestionGuide";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";

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
  const [voiceGuide, setVoiceGuide] = useState<VoiceQuestionGuide | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionProgress, setQuestionProgress] = useState({ current: 0, total: 0, percentage: 0 });

  // Show template selector when starting a new consultation
  useEffect(() => {
    if (isRecording && !currentConsultationId && !selectedTemplate) {
      setShowTemplateSelector(true);
    }
  }, [isRecording, currentConsultationId, selectedTemplate]);

  const handleSelectTemplate = async (template: ConsultationTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);

    // Initialize voice guide
    const guide = new VoiceQuestionGuide((question) => {
      setCurrentQuestion(question);
      if (guide.isActive()) {
        setQuestionProgress(guide.getProgress());
      }
    });
    setVoiceGuide(guide);
    
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
        
        // Start voice-guided questions
        guide.startGuide(template);
        toast.success(`Applied ${template.name} template with voice-guided questions`);
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
    voiceGuide?.stopGuide();
    setVoiceGuide(null);
    setCurrentQuestion(null);
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
        <div className="space-y-6">
          {/* Voice-Guided Questions Panel */}
          {voiceGuide?.isActive() && currentQuestion && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">
                      {voiceGuide.getCurrentCategory()}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Question {questionProgress.current} of {questionProgress.total}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        voiceGuide.previousQuestion();
                        setQuestionProgress(voiceGuide.getProgress());
                      }}
                      disabled={questionProgress.current === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        voiceGuide.nextQuestion();
                        setQuestionProgress(voiceGuide.getProgress());
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        voiceGuide.skipToNextSet();
                        setQuestionProgress(voiceGuide.getProgress());
                      }}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-foreground">{currentQuestion}</p>
                <Progress value={questionProgress.percentage} className="h-1" />
              </CardContent>
            </Card>
          )}

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
        </div>
        
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

