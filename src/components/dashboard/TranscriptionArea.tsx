
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { Save, Mic, MicOff } from "lucide-react";
import { RefObject } from 'react';

interface TranscriptionAreaProps {
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  transcriptRef: RefObject<HTMLDivElement>;
  onToggleRecording: () => void;
  onSave: () => void;
}

export const TranscriptionArea = ({
  isRecording,
  isSpeaking,
  transcript,
  transcriptRef,
  onToggleRecording,
  onSave,
}: TranscriptionAreaProps) => {
  return (
    <Card className="bg-[#222837] border-white/5">
      <CardHeader className="space-y-0">
        <CardTitle className="flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <span>Live Transcription</span>
            {isRecording && (
              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full animate-pulse">
                Recording
              </span>
            )}
          </div>
          <Button
            onClick={onToggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            className={`rounded-full transition-all duration-200 ${
              isRecording ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-[#9b87f5] hover:bg-[#8674d4]'
            }`}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRecording && (
          <Alert className="bg-[#2A3041] border-[#9b87f5]/20">
            <AlertDescription className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className={`text-sm ${
                  isSpeaking ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isSpeaking ? 'Speech detected' : 'Waiting for speech...'}
                </span>
              </div>
              {isSpeaking && (
                <div className="flex gap-1">
                  <div className="w-1 h-4 bg-green-400/30 animate-pulse" style={{ animationDelay: "0s" }} />
                  <div className="w-1 h-4 bg-green-400/30 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <div className="w-1 h-4 bg-green-400/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div 
          ref={transcriptRef}
          className="min-h-[400px] max-h-[600px] p-6 bg-[#2A3041] rounded-lg border border-white/5 transition-all overflow-y-auto font-mono text-sm leading-relaxed"
        >
          {transcript ? (
            <div className="whitespace-pre-wrap break-words">
              {transcript}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              {isRecording 
                ? "Start speaking to see the transcription in real-time..."
                : "Click the microphone button above to start recording your consultation..."}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          onClick={onSave}
          disabled={!transcript || isRecording}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white transition-all gap-2 disabled:bg-gray-600 disabled:text-gray-400"
        >
          <Save className="w-4 h-4" />
          Save Consultation
        </Button>
      </CardFooter>
    </Card>
  );
};
