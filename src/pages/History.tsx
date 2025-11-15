import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConsultationStorage } from "@/hooks/consultation/useConsultationStorage";
import { Clock, Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const History = () => {
  const { consultations, isLoading } = useConsultationStorage();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return status;
    }
  };

  const handleDownload = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select("document_url")
        .eq("id", consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) {
        toast.error("No document available for this consultation");
        return;
      }

      // Get signed URL for private bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(data.document_url, 60);

      if (signedUrlError) throw signedUrlError;

      window.open(signedUrlData.signedUrl, "_blank");
      toast.success("Opening document...");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleGeneratePDF = async (consultationId: string) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-generation" });

      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { consultationId, type: "pdf" },
      });

      if (error) throw error;

      toast.success("PDF generated successfully!", { id: "pdf-generation" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", { id: "pdf-generation" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Consultation History</h1>
          <p className="text-gray-400">View and manage all your past consultations</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-[#9b87f5] animate-spin" />
          </div>
        ) : !consultations || consultations.length === 0 ? (
          <Card className="bg-[#222837] border-white/5">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="w-16 h-16 text-gray-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Consultations Yet</h3>
              <p className="text-gray-400 text-center max-w-md">
                Start your first consultation from the dashboard to begin building your medical
                documentation history.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {consultations.map((consultation) => {
              const content =
                consultation.consultation_contents?.[0]?.content || "No content available";
              const createdAt = new Date(consultation.created_at);

              return (
                <Card
                  key={consultation.id}
                  className="bg-[#222837] border-white/5 hover:border-[#9b87f5]/30 transition-all"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg text-white">
                            Consultation
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={getStatusColor(consultation.status)}
                          >
                            {getStatusLabel(consultation.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <time>
                              {format(createdAt, "MMMM d, yyyy 'at' h:mm a")}
                            </time>
                          </div>
                          {consultation.document_url && (
                            <div className="flex items-center gap-1 text-green-400">
                              <FileText className="w-4 h-4" />
                              <span>PDF Available</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePDF(consultation.id)}
                          className="border-white/5 text-white hover:bg-[#2A3041]"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Generate PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(consultation.id)}
                          disabled={!consultation.document_url}
                          className="border-white/5 text-white hover:bg-[#2A3041] disabled:opacity-50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-[#1A1F2C] rounded-lg p-4 border border-white/5">
                      <p className="text-sm text-white/80 line-clamp-3 leading-relaxed">
                        {content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;
