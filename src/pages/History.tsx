import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/TagInput";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useConsultationHistory } from "@/hooks/consultation/useConsultationHistory";
import { Clock, Download, FileText, Loader2, Search, Filter, Trash2, Eye, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const History = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState<string[]>([]);
  const pageSize = 10;

  const { consultations, totalCount, totalPages, isLoading, refetch } = useConsultationHistory(
    {
      status: statusFilter,
      searchQuery,
      dateFrom,
      dateTo,
    },
    {
      page: currentPage,
      pageSize,
    }
  );

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
      await refetch();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", { id: "pdf-generation" });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (consultationId: string) => {
    setConsultationToDelete(consultationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!consultationToDelete) return;

    try {
      toast.loading("Deleting consultation...", { id: "delete-consultation" });

      const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", consultationToDelete);

      if (error) throw error;

      toast.success("Consultation deleted successfully", { id: "delete-consultation" });
      await refetch();
    } catch (error) {
      console.error("Error deleting consultation:", error);
      toast.error("Failed to delete consultation", { id: "delete-consultation" });
    } finally {
      setDeleteDialogOpen(false);
      setConsultationToDelete(null);
    }
  };

  const handleViewDetails = (consultation: any) => {
    setSelectedConsultation(consultation);
    setDetailModalOpen(true);
  };

  const handleEditTags = (consultationId: string, currentTags: string[]) => {
    setEditingTags(consultationId);
    setTempTags(currentTags || []);
  };

  const handleSaveTags = async (consultationId: string) => {
    try {
      toast.loading("Updating tags...", { id: "update-tags" });

      const { error } = await supabase
        .from("consultations")
        .update({ tags: tempTags })
        .eq("id", consultationId);

      if (error) throw error;

      toast.success("Tags updated successfully", { id: "update-tags" });
      await refetch();
      setEditingTags(null);
    } catch (error) {
      console.error("Error updating tags:", error);
      toast.error("Failed to update tags", { id: "update-tags" });
    }
  };

  const handleCancelEditTags = () => {
    setEditingTags(null);
    setTempTags([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Consultation History</h1>
          <p className="text-muted-foreground">View and manage all your past consultations</p>
        </div>

        {/* Search and Filter Controls */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 bg-background border-border"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <Input
                type="date"
                placeholder="From date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border-border"
              />

              {/* Date To */}
              <Input
                type="date"
                placeholder="To date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border-border"
              />
            </div>

            {/* Active Filters Summary */}
            {(searchQuery || statusFilter !== "all" || dateFrom || dateTo) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary">Search: {searchQuery}</Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary">Status: {statusFilter}</Badge>
                )}
                {dateFrom && <Badge variant="secondary">From: {dateFrom}</Badge>}
                {dateTo && <Badge variant="secondary">To: {dateTo}</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDateFrom("");
                    setDateTo("");
                    setCurrentPage(1);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Results Count */}
            <p className="text-sm text-muted-foreground">
              Showing {consultations.length} of {totalCount} consultation{totalCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !consultations || consultations.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {totalCount === 0 ? "No Consultations Yet" : "No Results Found"}
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {totalCount === 0
                  ? "Start your first consultation from the dashboard to begin building your medical documentation history."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => {
              const content =
                consultation.consultation_contents?.[0]?.content || "No content available";
              const createdAt = new Date(consultation.created_at);

              return (
                <Card
                  key={consultation.id}
                  className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => handleViewDetails(consultation)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg text-foreground">
                            Consultation
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={getStatusColor(consultation.status)}
                          >
                            {getStatusLabel(consultation.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(consultation)}
                          className="border-border"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePDF(consultation.id)}
                          className="border-border"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Generate PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(consultation.id)}
                          disabled={!consultation.document_url}
                          className="border-border disabled:opacity-50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(consultation.id)}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border mb-4">
                      <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
                        {content}
                      </p>
                    </div>

                    {/* Tags Section */}
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="w-4 h-4" />
                          <span>Tags</span>
                        </div>
                        {editingTags !== consultation.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTags(consultation.id, consultation.tags || []);
                            }}
                          >
                            Edit Tags
                          </Button>
                        )}
                      </div>

                      {editingTags === consultation.id ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <TagInput
                            tags={tempTags}
                            onTagsChange={setTempTags}
                            placeholder="Add tags (e.g., cardiology, pediatrics...)"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveTags(consultation.id)}>
                              Save Tags
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEditTags}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {consultation.tags && consultation.tags.length > 0 ? (
                            consultation.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No tags added</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const shouldShow =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      if (!shouldShow) {
                        // Show ellipsis for gaps
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          );
                        }
                        return null;
                      }

                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. This will permanently delete the consultation
                and all associated data including documents and transcripts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Consultation Detail Modal */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="bg-card border-border max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Consultation Details
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedConsultation && format(new Date(selectedConsultation.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>

            {selectedConsultation && (
              <div className="space-y-6 pt-4">
                {/* Metadata Section */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                    <Badge
                      variant="outline"
                      className={getStatusColor(selectedConsultation.status)}
                    >
                      {getStatusLabel(selectedConsultation.status)}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                    <p className="text-sm text-foreground">
                      {format(new Date(selectedConsultation.created_at), "PPP")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Language</h4>
                    <p className="text-sm text-foreground">
                      {selectedConsultation.original_language?.toUpperCase() || "EN"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Document</h4>
                    {selectedConsultation.document_url ? (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <FileText className="w-4 h-4" />
                        <span>Available</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not generated</p>
                    )}
                  </div>
                </div>

                {/* Full Transcript Section */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Full Transcript</h4>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {selectedConsultation.consultation_contents?.[0]?.content || "No content available"}
                    </p>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => handleGeneratePDF(selectedConsultation.id)}
                    className="border-border flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedConsultation.id)}
                    disabled={!selectedConsultation.document_url}
                    className="border-border flex-1 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleDeleteClick(selectedConsultation.id);
                      setDetailModalOpen(false);
                    }}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default History;
