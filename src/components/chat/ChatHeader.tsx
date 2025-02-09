
import { MessageSquare } from "lucide-react";

export const ChatHeader = () => {
  return (
    <div className="flex items-center gap-2 mb-6">
      <MessageSquare className="w-6 h-6 text-[#9b87f5]" />
      <h1 className="text-2xl font-semibold text-[#7E69AB]">Chat Assistant</h1>
    </div>
  );
};
