
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TranscriptionArea } from "@/components/dashboard/transcription";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";
import { useConsultationData } from "@/hooks/consultation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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

  // This is kept as a placeholder for any future cleanup
  useEffect(() => {
    return () => {
      // This is handled inside the hook now
    };
  }, []);

  return (
    <DashboardLayout>
      <ErrorBoundary componentName="Dashboard Header">
        <DashboardHeader />
      </ErrorBoundary>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <ErrorBoundary componentName="Transcription Area">
          <TranscriptionArea
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            transcript={transcript}
            transcriptRef={transcriptRef}
            onToggleRecording={toggleRecording}
            onSave={saveConsultation}
            onClear={clearTranscript}
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
