
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { Save, Mic, MicOff, Eraser, Waves } from "lucide-react";
import { RefObject, useEffect } from 'react';

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
  // Auto-scroll effect when transcript updates
  useEffect(() => {
    if (transcriptRef.current && transcript) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcript, transcriptRef]);

  return (
    <Card className="bg-[#222837] border-white/5 fluid-transition hover-lift shadow-lg overflow-hidden">
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
              onClick={onToggleRecording}
              variant={isRecording ? "destructive" : "default"}
              size="icon"
              className={`rounded-full transition-all duration-300 shadow-md ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-[#9b87f5] hover:bg-[#8674d4] text-white hover:scale-105'
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRecording && (
          <Alert className="bg-[#2A3041] border-[#9b87f5]/20 transition-all duration-300">
            <AlertDescription className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className={`text-sm transition-colors duration-300 ${
                  isSpeaking ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isSpeaking ? 'Speech detected' : 'Waiting for speech...'}
                </span>
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-green-400 animate-pulse" />
                  <div className="flex gap-1 items-end h-4">
                    <div className="w-1 h-2 bg-green-400/70 animate-pulse rounded-full" style={{ animationDelay: "0s", animationDuration: "0.8s" }} />
                    <div className="w-1 h-3 bg-green-400/70 animate-pulse rounded-full" style={{ animationDelay: "0.2s", animationDuration: "1s" }} />
                    <div className="w-1 h-4 bg-green-400/70 animate-pulse rounded-full" style={{ animationDelay: "0.4s", animationDuration: "0.7s" }} />
                    <div className="w-1 h-2 bg-green-400/70 animate-pulse rounded-full" style={{ animationDelay: "0.6s", animationDuration: "0.9s" }} />
                    <div className="w-1 h-3 bg-green-400/70 animate-pulse rounded-full" style={{ animationDelay: "0.8s", animationDuration: "0.8s" }} />
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div 
          ref={transcriptRef}
          className={`min-h-[400px] max-h-[600px] p-6 bg-[#2A3041] rounded-lg border border-white/5 transition-all duration-300 overflow-y-auto font-mono text-sm leading-relaxed ${
            isRecording && isSpeaking ? 'shadow-[0_0_15px_rgba(74,222,128,0.2)]' : ''
          }`}
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
                    <Mic className="w-8 h-8 text-gray-400/50 mb-2 animate-pulse" />
                    <p>Start speaking to see the transcription in real-time...</p>
                  </>
                : <>
                    <Mic className="w-8 h-8 text-gray-400/50 mb-2" />
                    <p>Click the microphone button above to start recording your consultation...</p>
                  </>
              }
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          onClick={onSave}
          disabled={!transcript || isRecording}
          className="bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:from-[#8674d4] hover:to-[#6a5992] text-white transition-all duration-300 gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md"
        >
          <Save className="w-4 h-4" />
          Save Consultation
        </Button>
      </CardFooter>
    </Card>
  );
};
