
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Eraser, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TranscriptionControlsProps {
  isRecording: boolean;
  transcript: string;
  onToggleRecording: () => void;
  onSave: (() => void) | null;
  onClear?: () => void;
}

export const TranscriptionControls = ({
  isRecording,
  transcript,
  onToggleRecording,
  onSave,
  onClear
}: TranscriptionControlsProps) => {
  const [isAccessingMic, setIsAccessingMic] = useState(false);

  const handleMicrophoneClick = async () => {
    if (!isRecording) {
      setIsAccessingMic(true);
      try {
        await onToggleRecording();
      } finally {
        setTimeout(() => setIsAccessingMic(false), 500); // Add slight delay to prevent rapid clicking
      }
    } else {
      onToggleRecording();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording && transcript && (
        <Button
          onClick={onClear}
          variant="outline"
          size="icon"
          className="rounded-full bg-transparent border-white/10 hover:bg-white/10 text-white transition-all duration-300 hover:scale-105"
          aria-label="Clear transcription"
          title="Clear transcription text"
        >
          <Eraser className="w-4 h-4" />
        </Button>
      )}
      <Button
        onClick={handleMicrophoneClick}
        variant={isRecording ? "destructive" : "default"}
        size="icon"
        className={`rounded-full transition-all duration-300 shadow-md ${
          isAccessingMic ? 'opacity-70 pointer-events-none' : ''
        } ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-[#9b87f5] hover:bg-[#8674d4] text-white hover:scale-105'
        }`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        disabled={isAccessingMic}
      >
        {isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <div className={cn(
            "relative",
            isAccessingMic && "animate-spin"
          )}>
            {isAccessingMic ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </div>
        )}
      </Button>
    </div>
  );
};
