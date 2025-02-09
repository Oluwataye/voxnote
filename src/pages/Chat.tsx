
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

const Chat = () => {
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

  const handleSubmit = async (content: string) => {
    await sendMessageMutation.mutateAsync(content);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col max-w-4xl mx-auto bg-gradient-to-b from-[#F1F0FB] to-white">
      <ChatHeader />
      
      <div className="flex-1 min-h-[500px] bg-white rounded-2xl p-4 md:p-6 mb-4 flex flex-col shadow-lg border border-[#D6BCFA]/20">
        <MessageList messages={messages} />
      </div>

      <ChatInput 
        onSubmit={handleSubmit}
        isLoading={sendMessageMutation.isPending}
      />
    </div>
  );
};

export default Chat;
