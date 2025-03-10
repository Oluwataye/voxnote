
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConsultationContent {
  content: string;
  language: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  created_at: string;
  consultation_contents?: ConsultationContent[];
  document_url?: string | null;
}

export const useConsultationStorage = () => {
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const { data: consultations, refetch: refetchConsultations, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        
        const { data, error } = await supabase
          .from('consultations')
          .select(`
            *,
            consultation_contents (
              content,
              language,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching consultations:", error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error("Failed to fetch consultations:", error);
        toast.error("Unable to load consultations. Please try again later.");
        return [];
      }
    }
  });

  const saveConsultation = async (transcript: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        throw new Error("Not authenticated");
      }

      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .insert({
          original_language: 'en',
          status: 'completed',
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (consultationError) {
        console.error("Error creating consultation:", consultationError);
        throw consultationError;
      }

      const { error: contentError } = await supabase
        .from('consultation_contents')
        .insert([{
          consultation_id: consultation.id,
          content: transcript,
          language: 'en',
          is_original: true
        }]);

      if (contentError) {
        console.error("Error adding consultation content:", contentError);
        throw contentError;
      }

      await supabase.functions.invoke('generate-document', {
        body: { consultationId: consultation.id, type: 'docx' }
      });

      setConsultationId(consultation.id);
      await refetchConsultations();
      toast.success("Consultation saved and document generated");
      
      return consultation.id;
    } catch (error) {
      console.error("Error saving consultation:", error);
      toast.error("Failed to save consultation. Please try again.");
      return null;
    }
  };

  const downloadDocument = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('document_url')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      if (!data.document_url) {
        toast.error("Document not available yet");
        throw new Error('Document not found');
      }

      window.open(data.document_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  return {
    consultations,
    isLoading,
    saveConsultation,
    downloadDocument
  };
};
