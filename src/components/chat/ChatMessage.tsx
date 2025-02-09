
interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  id: string;
}

export const ChatMessage = ({ content, role, id }: ChatMessageProps) => {
  return (
    <div
      key={id}
      className={`flex ${
        role === 'user' ? 'justify-end' : 'justify-start'
      } animate-fade-in`}
    >
      <div
        className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
          role === 'user'
            ? 'bg-[#9b87f5] text-white ml-4'
            : 'bg-[#F1F0FB] text-[#7E69AB] mr-4'
        }`}
      >
        {content}
      </div>
    </div>
  );
};
