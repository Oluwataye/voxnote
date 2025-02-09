
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <div className="min-h-screen p-4 flex flex-col max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      
      <div className="flex-1 min-h-[500px] bg-card rounded-lg p-4 mb-4 flex flex-col">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-4'
                      : 'bg-muted mr-4'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1"
          rows={1}
        />
        <Button 
          type="submit" 
          disabled={sendMessageMutation.isPending || !input.trim()}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Send'
          )}
        </Button>
      </form>
    </div>
  );
};

export default Chat;
