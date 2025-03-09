import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TranscriptionArea } from "@/components/dashboard/TranscriptionArea";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";
import { useConsultationData } from "@/hooks/useConsultationData";
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
  } = useConsultationData();

  // Clean up WebRTC connections (moved from previous useEffect)
  useEffect(() => {
    return () => {
      // This is handled inside the hook now, but we keep this for any future cleanup
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
