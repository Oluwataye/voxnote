
import { Clock, MessageSquare } from "lucide-react";

export const DashboardHeader = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#2A3041] rounded-xl">
          <MessageSquare className="w-8 h-8 text-[#9b87f5]" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold mb-1">Medical Consultation</h1>
          <p className="text-sm text-gray-400">Record and transcribe patient consultations</p>
        </div>
      </div>
      <div className="hidden md:block">
        <Clock className="w-5 h-5 text-gray-400 mb-1" />
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
    </div>
  );
};
