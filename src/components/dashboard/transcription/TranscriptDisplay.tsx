
import { RefObject } from 'react';
import { Mic } from "lucide-react";
import { cn } from '@/lib/utils';

interface TranscriptDisplayProps {
  transcript: string;
  transcriptRef: RefObject<HTMLDivElement>;
  isRecording: boolean;
  isSpeaking: boolean;
}

export const TranscriptDisplay = ({ 
  transcript, 
  transcriptRef, 
  isRecording, 
  isSpeaking 
}: TranscriptDisplayProps) => {
  return (
    <div 
      ref={transcriptRef}
      className={cn(
        "min-h-[400px] max-h-[600px] p-6 bg-[#2A3041] rounded-lg border transition-all duration-300 overflow-y-auto font-mono text-sm leading-relaxed",
        isRecording && !isSpeaking && "border-white/5",
        isRecording && isSpeaking && "border-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.15)]",
        !isRecording && "border-white/5"
      )}
    >
      {transcript ? (
        <div className="whitespace-pre-wrap break-words text-white/90">
          {transcript}
          {isRecording && isSpeaking && (
            <span className="inline-block ml-1 w-1.5 h-4 bg-green-400/70 animate-pulse"></span>
          )}
        </div>
      ) : (
        <div className="text-gray-400 italic flex flex-col items-center justify-center h-full text-center space-y-4">
          {isRecording 
            ? <>
                <div className="relative">
                  <Mic className="w-8 h-8 text-gray-400/50 mb-2 animate-pulse" />
                  <div className="absolute -inset-1 rounded-full bg-gray-400/5 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75"></div>
                </div>
                <p>Start speaking to see the transcription in real-time...</p>
              </>
            : <>
                <div className="relative">
                  <Mic className="w-8 h-8 text-gray-400/50 mb-2 transition-all duration-300 hover:text-[#9b87f5]/50 hover:scale-110" />
                  <div className="absolute -inset-1 rounded-full bg-gray-400/5 opacity-0 group-hover:opacity-100"></div>
                </div>
                <p>Click the microphone button above to start recording your consultation...</p>
              </>
          }
        </div>
      )}
    </div>
  );
};
