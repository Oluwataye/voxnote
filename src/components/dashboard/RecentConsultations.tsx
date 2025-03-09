
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Clock, Download } from "lucide-react";

interface ConsultationContent {
  content: string;
  language: string;
  created_at: string;
}

interface Consultation {
  id: string;
  created_at: string;
  consultation_contents?: ConsultationContent[];
  document_url?: string | null;
}

interface RecentConsultationsProps {
  consultations: Consultation[];
  onDownload: (id: string) => void;
  isLoading?: boolean;
}

export const RecentConsultations = ({ 
  consultations, 
  onDownload,
  isLoading = false
}: RecentConsultationsProps) => {
  const hasConsultations = consultations?.length > 0;

  return (
    <Card className="bg-[#222837] border-white/5 h-fit fluid-transition">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Consultations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-[#9b87f5]/30 border-t-[#9b87f5] rounded-full animate-spin"></div>
          </div>
        ) : !hasConsultations ? (
          <div className="text-center py-8 text-gray-400">
            <p>No consultations yet</p>
            <p className="text-sm mt-2">Start recording to create your first consultation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {consultations.slice(0, 5).map((consultation) => {
              const content = consultation.consultation_contents?.[0]?.content || 'No content available';
              
              return (
                <div 
                  key={consultation.id} 
                  className="p-4 bg-[#2A3041] rounded-xl border border-white/5 transition-all hover:border-[#9b87f5]/30 hover-lift"
                >
                  <div className="flex items-center justify-between mb-3">
                    <time className="text-xs text-gray-400 font-mono">
                      {new Date(consultation.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(consultation.id)}
                      className="h-8 w-8 text-[#9b87f5] hover:text-[#7E69AB] hover:bg-[#9b87f5]/10"
                      disabled={!consultation.document_url}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-white/90 line-clamp-3">
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
