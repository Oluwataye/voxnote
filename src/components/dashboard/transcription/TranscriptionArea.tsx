
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefObject, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { RecordingStatus } from './RecordingStatus';
import { TranscriptDisplay } from './TranscriptDisplay';
import { TranscriptionControls } from './TranscriptionControls';

interface TranscriptionAreaProps {
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  transcriptRef: RefObject<HTMLDivElement>;
  onToggleRecording: () => void;
  onSave: () => void;
  onClear?: () => void;
}

export const TranscriptionArea = ({
  isRecording,
  isSpeaking,
  transcript,
  transcriptRef,
  onToggleRecording,
  onSave,
  onClear,
}: TranscriptionAreaProps) => {
  const [isCardAnimated, setIsCardAnimated] = useState(false);

  // Auto-scroll effect when transcript updates
  useEffect(() => {
    if (transcriptRef.current && transcript) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcript, transcriptRef]);

  // Add animation effect when recording status changes
  useEffect(() => {
    if (isRecording) {
      setIsCardAnimated(true);
      const timer = setTimeout(() => setIsCardAnimated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);

  return (
    <Card 
      className={cn(
        "bg-[#222837] border-white/5 fluid-transition hover-lift shadow-lg overflow-hidden",
        isCardAnimated && "animate-[pulse_0.5s_ease-in-out]",
        isRecording && isSpeaking && "shadow-[0_0_20px_rgba(74,222,128,0.15)]"
      )}
    >
      <CardHeader className="space-y-0">
        <CardTitle className="flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <span>Live Transcription</span>
            {isRecording && (
              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full animate-pulse flex items-center gap-1">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                Recording
              </span>
            )}
          </div>
          <TranscriptionControls
            isRecording={isRecording}
            transcript={transcript}
            onToggleRecording={onToggleRecording}
            onSave={onSave}
            onClear={onClear}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RecordingStatus isRecording={isRecording} isSpeaking={isSpeaking} />
        <TranscriptDisplay 
          transcript={transcript}
          transcriptRef={transcriptRef}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
        />
      </CardContent>
    </Card>
  );
};
