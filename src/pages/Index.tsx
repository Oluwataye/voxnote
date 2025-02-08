
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";

const Index = () => {
  const [content, setContent] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const createConsultation = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .insert({
        original_language: 'en',
        status: 'draft',
        user_id: user.id
      })
      .select()
      .single();

    if (consultationError) throw consultationError;

    const { error: contentError } = await supabase
      .from('consultation_contents')
      .insert([
        {
          consultation_id: consultation.id,
          content,
          language: 'en',
          is_original: true
        }
      ]);

    if (contentError) throw contentError;
    
    setConsultationId(consultation.id);
    return consultation.id;
  };

  const translateContent = async ({ consultationId, content, targetLanguage }: { 
    consultationId: string, 
    content: string, 
    targetLanguage: string 
  }) => {
    // For now, we'll just create a mock translation
    // In a real application, you would call a translation service here
    const mockTranslation = `[${targetLanguage}] ${content}`;

    const { error } = await supabase
      .from('consultation_contents')
      .insert([
        {
          consultation_id: consultationId,
          content: mockTranslation,
          language: targetLanguage,
          is_original: false
        }
      ]);

    if (error) throw error;
    return mockTranslation;
  };

  const translationMutation = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error("Please enter some content to translate");
      
      // Create consultation if it doesn't exist
      const cId = consultationId || await createConsultation(content);
      
      // Perform translation
      return translateContent({ 
        consultationId: cId, 
        content, 
        targetLanguage 
      });
    },
    onSuccess: () => {
      toast.success("Translation created successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const { data: translations } = useQuery({
    queryKey: ['translations', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];
      
      const { data, error } = await supabase
        .from('consultation_contents')
        .select('*')
        .eq('consultation_id', consultationId)
        .eq('is_original', false);
        
      if (error) throw error;
      return data;
    },
    enabled: !!consultationId
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8 animate-in">
        <div className="text-center space-y-4">
          <span className="inline-block px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground rounded-full">
            Translation System
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
            Multilingual Content Manager
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Create and manage translations for your content across multiple languages.
          </p>
        </div>

        <div className="space-y-6 bg-card p-6 rounded-lg shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="content">
              Original Content (English)
            </label>
            <Textarea
              id="content"
              placeholder="Enter your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">
                Target Language
              </label>
              <Select
                value={targetLanguage}
                onValueChange={setTargetLanguage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => translationMutation.mutate()}
              disabled={translationMutation.isPending}
            >
              {translationMutation.isPending ? "Translating..." : "Translate"}
            </Button>
          </div>

          {translations && translations.length > 0 && (
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold">Translations</h2>
              <div className="space-y-4">
                {translations.map((translation, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {translation.language.toUpperCase()}
                    </div>
                    <div>{translation.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleLogout}
            variant="outline"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
