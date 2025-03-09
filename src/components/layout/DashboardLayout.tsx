
import { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#13151C] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {children}
      </div>
    </div>
  );
};
