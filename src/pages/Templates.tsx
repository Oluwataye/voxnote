import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagInput } from "@/components/TagInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Loader2, Save, X, Download, Upload, History, RotateCcw, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface QuestionSet {
  id?: string;
  category: string;
  questions: string[];
  order_index: number;
}

interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  specialty: string;
  tags: string[];
  icon: string;
  question_sets?: QuestionSet[];
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  name: string;
  description: string;
  specialty: string;
  tags: string[];
  icon: string;
  question_sets: QuestionSet[];
  created_at: string;
  created_by: string;
}

const Templates = () => {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<CustomTemplate>>({
    name: "",
    description: "",
    specialty: "",
    tags: [],
    icon: "Stethoscope",
  });
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [currentCategory, setCurrentCategory] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedTemplateForVersions, setSelectedTemplateForVersions] = useState<CustomTemplate | null>(null);

  // Fetch template versions
  const { data: versions } = useQuery({
    queryKey: ["template-versions", selectedTemplateForVersions?.id],
    queryFn: async () => {
      if (!selectedTemplateForVersions) return [];

      const { data, error } = await supabase
        .from("template_versions")
        .select("*")
        .eq("template_id", selectedTemplateForVersions.id)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        question_sets: v.question_sets as unknown as QuestionSet[]
      }));
    },
    enabled: !!selectedTemplateForVersions,
  });

  // Fetch custom templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["custom-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: templatesData, error: templatesError } = await supabase
        .from("custom_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch question sets for each template
      const templatesWithQuestions = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: questionSetsData } = await supabase
            .from("template_question_sets")
            .select("*")
            .eq("template_id", template.id)
            .order("order_index");

          return {
            ...template,
            question_sets: questionSetsData || [],
          };
        })
      );

      return templatesWithQuestions as CustomTemplate[];
    },
  });

  // Create or update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { template: Partial<CustomTemplate>; questionSets: QuestionSet[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (selectedTemplate?.id) {
        // Update existing template
        const { error: updateError } = await supabase
          .from("custom_templates")
          .update({
            name: data.template.name,
            description: data.template.description,
            specialty: data.template.specialty,
            tags: data.template.tags,
            icon: data.template.icon,
          })
          .eq("id", selectedTemplate.id);

        if (updateError) throw updateError;

        // Delete existing question sets
        await supabase
          .from("template_question_sets")
          .delete()
          .eq("template_id", selectedTemplate.id);

        // Insert new question sets
        if (data.questionSets.length > 0) {
          const { error: questionSetsError } = await supabase
            .from("template_question_sets")
            .insert(
              data.questionSets.map((qs, index) => ({
                template_id: selectedTemplate.id,
                category: qs.category,
                questions: qs.questions,
                order_index: index,
              }))
            );

          if (questionSetsError) throw questionSetsError;
        }
      } else {
        // Create new template
        const { data: newTemplate, error: insertError } = await supabase
          .from("custom_templates")
          .insert({
            user_id: user.id,
            name: data.template.name,
            description: data.template.description,
            specialty: data.template.specialty,
            tags: data.template.tags,
            icon: data.template.icon,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert question sets
        if (data.questionSets.length > 0) {
          const { error: questionSetsError } = await supabase
            .from("template_question_sets")
            .insert(
              data.questionSets.map((qs, index) => ({
                template_id: newTemplate.id,
                category: qs.category,
                questions: qs.questions,
                order_index: index,
              }))
            );

          if (questionSetsError) throw questionSetsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      toast.success(selectedTemplate ? "Template updated" : "Template created");
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("custom_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      toast.success("Template deleted");
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    },
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      description: "",
      specialty: "",
      tags: [],
      icon: "Stethoscope",
    });
    setQuestionSets([]);
    setEditDialogOpen(true);
  };

  const handleEdit = (template: CustomTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      specialty: template.specialty,
      tags: template.tags,
      icon: template.icon,
    });
    setQuestionSets(template.question_sets || []);
    setEditDialogOpen(true);
  };

  const handleDelete = (template: CustomTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedTemplate(null);
    setFormData({
      name: "",
      description: "",
      specialty: "",
      tags: [],
      icon: "Stethoscope",
    });
    setQuestionSets([]);
    setCurrentCategory("");
    setCurrentQuestion("");
  };

  const handleSave = () => {
    if (!formData.name || !formData.specialty || questionSets.length === 0) {
      toast.error("Please fill in all required fields and add at least one question set");
      return;
    }

    saveTemplateMutation.mutate({ template: formData, questionSets });
  };

  const handleAddQuestionSet = () => {
    if (!currentCategory) {
      toast.error("Please enter a category name");
      return;
    }

    const existingSet = questionSets.find((qs) => qs.category === currentCategory);
    if (existingSet) {
      toast.error("A question set with this category already exists");
      return;
    }

    setQuestionSets([
      ...questionSets,
      {
        category: currentCategory,
        questions: [],
        order_index: questionSets.length,
      },
    ]);
    setCurrentCategory("");
  };

  const handleAddQuestion = (setIndex: number) => {
    if (!currentQuestion) {
      toast.error("Please enter a question");
      return;
    }

    const updatedSets = [...questionSets];
    updatedSets[setIndex].questions.push(currentQuestion);
    setQuestionSets(updatedSets);
    setCurrentQuestion("");
  };

  const handleRemoveQuestion = (setIndex: number, questionIndex: number) => {
    const updatedSets = [...questionSets];
    updatedSets[setIndex].questions.splice(questionIndex, 1);
    setQuestionSets(updatedSets);
  };

  const handleRemoveQuestionSet = (setIndex: number) => {
    const updatedSets = questionSets.filter((_, index) => index !== setIndex);
    setQuestionSets(updatedSets);
  };

  const handleExportTemplate = (template: CustomTemplate) => {
    const exportData = {
      name: template.name,
      description: template.description,
      specialty: template.specialty,
      tags: template.tags,
      icon: template.icon,
      question_sets: template.question_sets,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, "_")}_template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template exported successfully");
  };

  const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate the imported data
      if (!importedData.name || !importedData.specialty || !importedData.question_sets) {
        toast.error("Invalid template file format");
        return;
      }

      // Set the form data and question sets
      setFormData({
        name: importedData.name,
        description: importedData.description || "",
        specialty: importedData.specialty,
        tags: importedData.tags || [],
        icon: importedData.icon || "Stethoscope",
      });
      setQuestionSets(importedData.question_sets || []);
      setSelectedTemplate(null);
      setEditDialogOpen(true);
      setImportDialogOpen(false);
      toast.success("Template imported successfully");
    } catch (error) {
      console.error("Error importing template:", error);
      toast.error("Failed to import template. Please check the file format.");
    }

    // Reset the file input
    event.target.value = "";
  };

  const handleBulkExportJSON = () => {
    if (!templates || templates.length === 0) {
      toast.error("No templates to export");
      return;
    }

    const exportData = templates.map((template) => ({
      name: template.name,
      description: template.description,
      specialty: template.specialty,
      tags: template.tags,
      icon: template.icon,
      question_sets: template.question_sets,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_templates_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${templates.length} templates as JSON`);
  };

  const handleBulkExportZIP = async () => {
    if (!templates || templates.length === 0) {
      toast.error("No templates to export");
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      templates.forEach((template) => {
        const exportData = {
          name: template.name,
          description: template.description,
          specialty: template.specialty,
          tags: template.tags,
          icon: template.icon,
          question_sets: template.question_sets,
        };

        const fileName = `${template.name.replace(/\s+/g, "_")}.json`;
        zip.file(fileName, JSON.stringify(exportData, null, 2));
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `templates_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${templates.length} templates as ZIP`);
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to create ZIP file");
    }
  };

  const handleViewVersionHistory = (template: CustomTemplate) => {
    setSelectedTemplateForVersions(template);
    setVersionHistoryOpen(true);
  };

  const handleRestoreVersion = async (version: TemplateVersion) => {
    if (!selectedTemplateForVersions) return;

    try {
      // Update the template with the version data
      const { error: updateError } = await supabase
        .from("custom_templates")
        .update({
          name: version.name,
          description: version.description,
          specialty: version.specialty,
          tags: version.tags,
          icon: version.icon,
        })
        .eq("id", selectedTemplateForVersions.id);

      if (updateError) throw updateError;

      // Delete existing question sets
      await supabase
        .from("template_question_sets")
        .delete()
        .eq("template_id", selectedTemplateForVersions.id);

      // Insert question sets from version
      if (version.question_sets && version.question_sets.length > 0) {
        const { error: questionSetsError } = await supabase
          .from("template_question_sets")
          .insert(
            version.question_sets.map((qs: QuestionSet, index: number) => ({
              template_id: selectedTemplateForVersions.id,
              category: qs.category,
              questions: qs.questions,
              order_index: index,
            }))
          );

        if (questionSetsError) throw questionSetsError;
      }

      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      toast.success(`Restored to version ${version.version_number}`);
      setVersionHistoryOpen(false);
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Consultation Templates</h1>
            <p className="text-muted-foreground">
              Create and manage your custom consultation templates
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
            {templates && templates.length > 0 && (
              <>
                <Button onClick={handleBulkExportJSON} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export All (JSON)
                </Button>
                <Button onClick={handleBulkExportZIP} variant="outline" className="gap-2">
                  <Package className="w-4 h-4" />
                  Export All (ZIP)
                </Button>
              </>
            )}
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates && templates.length > 0 ? (
            templates.map((template) => (
              <Card key={template.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.specialty}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewVersionHistory(template)}
                        title="Version history"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportTemplate(template)}
                        title="Export template"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.question_sets?.length || 0} question set(s)
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2 lg:col-span-3 bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No custom templates yet</p>
                <Button onClick={handleCreateNew} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              Define your custom consultation template with tags and question sets
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cardiology Consultation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty *</Label>
                  <Input
                    id="specialty"
                    value={formData.specialty || ""}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="e.g., Cardiology"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagInput
                    tags={formData.tags || []}
                    onTagsChange={(tags) => setFormData({ ...formData, tags })}
                  />
                </div>
              </div>

              {/* Question Sets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Question Sets *</Label>
                </div>

                {/* Add Question Set */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Category name (e.g., Chief Complaint)"
                    value={currentCategory}
                    onChange={(e) => setCurrentCategory(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddQuestionSet()}
                  />
                  <Button onClick={handleAddQuestionSet} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Question Sets List */}
                <div className="space-y-4">
                  {questionSets.map((set, setIndex) => (
                    <Card key={setIndex} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{set.category}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestionSet(setIndex)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Questions List */}
                        {set.questions.length > 0 && (
                          <ul className="space-y-2">
                            {set.questions.map((question, qIndex) => (
                              <li
                                key={qIndex}
                                className="flex items-start justify-between gap-2 text-sm bg-background/50 p-2 rounded"
                              >
                                <span className="flex-1">{question}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveQuestion(setIndex, qIndex)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Add Question */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a question"
                            value={currentQuestion}
                            onChange={(e) => setCurrentQuestion(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddQuestion(setIndex)
                            }
                            className="text-sm"
                          />
                          <Button onClick={() => handleAddQuestion(setIndex)} size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveTemplateMutation.isPending}
              className="gap-2"
            >
              {saveTemplateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Version History - {selectedTemplateForVersions?.name}</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this template
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {versions && versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((version) => (
                  <Card key={version.id} className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm">
                            Version {version.version_number}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {new Date(version.created_at).toLocaleString()}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(version)}
                          className="gap-2"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">{version.name}</p>
                        <p className="text-xs text-muted-foreground">{version.specialty}</p>
                      </div>
                      {version.description && (
                        <p className="text-xs text-muted-foreground">{version.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {version.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {version.question_sets?.length || 0} question set(s)
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No version history available yet. Versions are created when you update the template.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template</DialogTitle>
            <DialogDescription>
              Select a JSON file to import a template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplate}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to select a JSON file
                  </span>
                </div>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && deleteTemplateMutation.mutate(selectedTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Templates;
