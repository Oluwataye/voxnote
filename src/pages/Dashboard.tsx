
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TranscriptionArea } from "@/components/dashboard/TranscriptionArea";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";
import { useConsultationData } from "@/hooks/useConsultationData";
import { ErrorBoundary } from "@/components/ui/error-boundary";

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
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#13151C] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
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
      </div>
    </div>
  );
};

export default Dashboard;
