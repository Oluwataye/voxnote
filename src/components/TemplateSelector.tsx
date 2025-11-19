import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CONSULTATION_TEMPLATES, ConsultationTemplate, QuestionSet } from "@/types/templates";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Heart, Baby, Stethoscope, Bone, Sparkles, Brain, ChevronRight, Check } from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (template: ConsultationTemplate) => void;
  onSkip: () => void;
}

const getIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Heart,
    Baby,
    Stethoscope,
    Bone,
    Sparkles,
    Brain,
  };
  return icons[iconName] || Stethoscope;
};

export const TemplateSelector = ({ onSelectTemplate, onSkip }: TemplateSelectorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch custom templates
  const { data: customTemplates } = useQuery({
    queryKey: ["custom-templates-selector"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: templatesData } = await supabase
        .from("custom_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const templatesWithQuestions = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: questionSetsData } = await supabase
            .from("template_question_sets")
            .select("*")
            .eq("template_id", template.id)
            .order("order_index");

          return {
            ...template,
            questionSets: (questionSetsData || []).map((qs: any) => ({
              category: qs.category,
              questions: qs.questions,
            })),
          };
        })
      );

      return templatesWithQuestions as ConsultationTemplate[];
    },
  });

  const allTemplates = [
    ...(customTemplates || []),
    ...CONSULTATION_TEMPLATES,
  ];

  const handleViewDetails = (template: ConsultationTemplate) => {
    setSelectedTemplate(template);
    setDetailsOpen(true);
  };

  const handleUseTemplate = (template: ConsultationTemplate) => {
    onSelectTemplate(template);
    setDetailsOpen(false);
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Choose a Consultation Template</CardTitle>
          <CardDescription>
            Select a template to start with pre-configured tags and question sets, or skip to start from scratch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTemplates.map((template) => {
              const Icon = getIcon(template.icon || "Stethoscope");
              return (
                <Card
                  key={template.id}
                  className="bg-muted/50 border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleViewDetails(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-foreground">{template.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.specialty}
                          </CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={onSkip}>
              Skip and Start Empty Consultation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {(() => {
                      const Icon = getIcon(selectedTemplate.icon || "Stethoscope");
                      return <Icon className="w-6 h-6 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{selectedTemplate.name}</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      {selectedTemplate.specialty}
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Tags */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Pre-configured Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Question Sets */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Question Sets</h4>
                  <div className="space-y-4">
                    {selectedTemplate.questionSets.map((set, index) => (
                      <div key={index} className="bg-muted/50 rounded-lg p-4 border border-border">
                        <h5 className="text-sm font-semibold text-foreground mb-2">
                          {set.category}
                        </h5>
                        <ul className="space-y-2">
                          {set.questions.map((question, qIndex) => (
                            <li key={qIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate)}>
              Use This Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
