
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mic } from "lucide-react";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";

interface ChatInputProps {
  onSubmit: (content: string) => Promise<void>;
  isLoading: boolean;
}

export const ChatInput = ({ onSubmit, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await onSubmit(input);
      setInput("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceStart = () => {
    toast.info("Voice recording started");
  };

  const handleVoiceStop = (duration: number) => {
    toast.success(`Recording stopped after ${duration} seconds`);
  };

  if (isVoiceMode) {
    return (
      <AIVoiceInput
        onStart={handleVoiceStart}
        onStop={handleVoiceStop}
        className="mb-4"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 resize-none rounded-xl border-[#D6BCFA]/30 focus:border-[#9b87f5] focus-visible:ring-[#9b87f5]/20 shadow-sm"
        rows={1}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsVoiceMode(true)}
          className="rounded-xl border-[#D6BCFA]/30 hover:bg-[#F1F0FB] transition-colors"
        >
          <Mic className="h-5 w-5 text-[#9b87f5]" />
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-[#9b87f5] hover:bg-[#7E69AB] transition-colors shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};
