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
  status: string;
  consultation_contents?: ConsultationContent[];
  document_url?: string | null;
  tags?: string[];
}

interface FilterOptions {
  status?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

interface PaginationOptions {
  page: number;
  pageSize: number;
}

export const useConsultationHistory = (
  filters: FilterOptions = {},
  pagination: PaginationOptions = { page: 1, pageSize: 10 }
) => {
  const { status, searchQuery, dateFrom, dateTo, tags } = filters;
  const { page, pageSize } = pagination;

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['consultation-history', status, searchQuery, dateFrom, dateTo, tags, page, pageSize],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        let query = supabase
          .from('consultations')
          .select(`
            *,
            consultation_contents (
              content,
              language,
              created_at
            )
          `, { count: 'exact' })
          .eq('user_id', user.id);

        // Apply status filter
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        // Apply date range filter
        if (dateFrom) {
          query = query.gte('created_at', new Date(dateFrom).toISOString());
        }
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }

        // Apply search query filter (search in content)
        if (searchQuery) {
          query = query.or(`consultation_contents.content.ilike.%${searchQuery}%`);
        }

        // Apply tag filter
        if (tags && tags.length > 0) {
          query = query.contains('tags', tags);
        }

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        // Order by created_at descending
        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching consultations:", error);
          throw error;
        }

        return {
          consultations: data || [],
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
      } catch (error) {
        console.error("Failed to fetch consultations:", error);
        toast.error("Unable to load consultations. Please try again later.");
        return {
          consultations: [],
          totalCount: 0,
          totalPages: 0,
        };
      }
    }
  });

  return {
    consultations: data?.consultations || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    refetch,
  };
};
