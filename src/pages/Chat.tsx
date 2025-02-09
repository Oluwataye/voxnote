import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

const Chat = () => {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  // Fetch chat history
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert user message
      const { error: insertError } = await supabase
        .from('messages')
        .insert([{ content, role: 'user', user_id: user.id }]);

      if (insertError) throw insertError;

      // Get conversation history
      const conversationHistory = messages.map(({ content, role }) => ({
        content,
        role
      }));

      // Add current message
      conversationHistory.push({ content, role: 'user' });

      // Call OpenAI via Edge Function
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { messages: conversationHistory }
      });

      if (error) throw error;

      // Insert AI response
      const { error: aiInsertError } = await supabase
        .from('messages')
        .insert([{
          content: data.response.content,
          role: 'assistant',
          user_id: user.id
        }]);

      if (aiInsertError) throw aiInsertError;

      return await refetchMessages();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await sendMessageMutation.mutateAsync(input);
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
    // Here you would typically process the voice recording
    // and convert it to text using a speech-to-text service
  };

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col max-w-4xl mx-auto bg-gradient-to-b from-[#F1F0FB] to-white">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-[#9b87f5]" />
        <h1 className="text-2xl font-semibold text-[#7E69AB]">Chat Assistant</h1>
      </div>
      
      <div className="flex-1 min-h-[500px] bg-white rounded-2xl p-4 md:p-6 mb-4 flex flex-col shadow-lg border border-[#D6BCFA]/20">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-[#9b87f5] text-white ml-4'
                      : 'bg-[#F1F0FB] text-[#7E69AB] mr-4'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {isVoiceMode ? (
        <AIVoiceInput
          onStart={handleVoiceStart}
          onStop={handleVoiceStop}
          className="mb-4"
        />
      ) : (
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
              disabled={sendMessageMutation.isPending || !input.trim()}
              className="rounded-xl bg-[#9b87f5] hover:bg-[#7E69AB] transition-colors shadow-sm"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Chat;
