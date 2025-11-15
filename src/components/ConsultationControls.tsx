
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, StopCircle, Download, FileText } from 'lucide-react';

interface ConsultationControlsProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onDownload: () => void;
  onGeneratePDF: () => void;
  consultationId: string | null;
}

const ConsultationControls: React.FC<ConsultationControlsProps> = ({
  isPaused,
  onPause,
  onResume,
  onEnd,
  onDownload,
  onGeneratePDF,
  consultationId
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
      {isPaused ? (
        <Button
          onClick={onResume}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
        >
          <Play className="w-4 h-4 mr-2" />
          Resume
        </Button>
      ) : (
        <Button
          onClick={onPause}
          className="bg-[#2A3041] hover:bg-[#1A1F2C] text-white"
        >
          <Pause className="w-4 h-4 mr-2" />
          Pause
        </Button>
      )}

      <Button
        onClick={onEnd}
        variant="secondary"
        className="bg-[#2A3041] text-white hover:bg-[#1A1F2C]"
      >
        <StopCircle className="w-4 h-4 mr-2" />
        End
      </Button>

      {consultationId && (
        <>
          <Button
            onClick={onGeneratePDF}
            variant="outline"
            className="border-white/5 text-white hover:bg-[#2A3041]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
          
          <Button
            onClick={onDownload}
            variant="outline"
            className="border-white/5 text-white hover:bg-[#2A3041]"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </>
      )}
    </div>
  );
};

export default ConsultationControls;
