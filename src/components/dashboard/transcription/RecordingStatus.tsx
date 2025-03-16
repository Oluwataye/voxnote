
import { Waves } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RecordingStatusProps {
  isRecording: boolean;
  isSpeaking: boolean;
}

export const RecordingStatus = ({ isRecording, isSpeaking }: RecordingStatusProps) => {
  if (!isRecording) return null;
  
  return (
    <Alert 
      className={cn(
        "bg-[#2A3041] border-[#9b87f5]/20 transition-all duration-300",
        isSpeaking && "border-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.1)]"
      )}
    >
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
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1 bg-green-400/70 animate-pulse rounded-full"
                  style={{
                    height: `${Math.max(2, Math.random() * 4)}rem`,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: `${0.7 + Math.random() * 0.5}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
