
import { MessageSquare } from "lucide-react";

export const ChatHeader = () => {
  return (
    <div className="flex items-center gap-3 mb-6">
      <MessageSquare className="w-6 h-6 text-[#9b87f5]" />
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">VoxNote Chat</h1>
        <p className="text-sm text-gray-400">Ask questions or get assistance</p>
      </div>
    </div>
  );
};

