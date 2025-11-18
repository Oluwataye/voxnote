import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfWeek, startOfMonth, format, subDays, subMonths } from "date-fns";

export interface AnalyticsData {
  totalConsultations: number;
  completedConsultations: number;
  inProgressConsultations: number;
  consultationsThisWeek: number;
  consultationsThisMonth: number;
  averagePerWeek: number;
  dailyData: { date: string; count: number }[];
  weeklyData: { week: string; count: number }[];
  monthlyData: { month: string; count: number }[];
  statusDistribution: { status: string; count: number; percentage: number }[];
  tagDistribution: { tag: string; count: number; percentage: number }[];
  topTags: { tag: string; count: number }[];
}

interface AnalyticsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  tags?: string[];
}

export const useConsultationAnalytics = (
  days: number = 30,
  filters?: AnalyticsFilters
) => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['consultation-analytics', days, filters],
    queryFn: async (): Promise<AnalyticsData> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Fetch all consultations with filters
        let query = supabase
          .from('consultations')
          .select('id, created_at, status, tags')
          .eq('user_id', user.id);

        // Apply filters
        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom.toISOString());
        }
        if (filters?.dateTo) {
          query = query.lte('created_at', filters.dateTo.toISOString());
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.tags && filters.tags.length > 0) {
          query = query.overlaps('tags', filters.tags);
        }

        const { data: consultations, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;

        const now = new Date();
        const startDate = subDays(now, days);

        // Total counts
        const totalConsultations = consultations?.length || 0;
        const completedConsultations = consultations?.filter(c => c.status === 'completed').length || 0;
        const inProgressConsultations = consultations?.filter(c => c.status === 'in_progress').length || 0;

        // This week/month counts
        const weekStart = startOfWeek(now);
        const monthStart = startOfMonth(now);
        
        const consultationsThisWeek = consultations?.filter(
          c => new Date(c.created_at) >= weekStart
        ).length || 0;
        
        const consultationsThisMonth = consultations?.filter(
          c => new Date(c.created_at) >= monthStart
        ).length || 0;

        // Calculate average per week (based on all data)
        const oldestDate = consultations && consultations.length > 0
          ? new Date(consultations[0].created_at)
          : now;
        const weeksSinceStart = Math.max(1, Math.ceil((now.getTime() - oldestDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const averagePerWeek = totalConsultations / weeksSinceStart;

        // Daily data for the selected period
        const dailyMap = new Map<string, number>();
        for (let i = 0; i < days; i++) {
          const date = subDays(now, i);
          dailyMap.set(format(date, 'yyyy-MM-dd'), 0);
        }

        consultations?.forEach(c => {
          const date = format(new Date(c.created_at), 'yyyy-MM-dd');
          if (dailyMap.has(date)) {
            dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
          }
        });

        const dailyData = Array.from(dailyMap.entries())
          .map(([date, count]) => ({ date: format(new Date(date), 'MMM dd'), count }))
          .reverse();

        // Weekly data for last 12 weeks
        const weeklyMap = new Map<string, number>();
        for (let i = 0; i < 12; i++) {
          const weekDate = subDays(now, i * 7);
          const weekStart = startOfWeek(weekDate);
          weeklyMap.set(format(weekStart, 'yyyy-MM-dd'), 0);
        }

        consultations?.forEach(c => {
          const weekStart = startOfWeek(new Date(c.created_at));
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          if (weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
          }
        });

        const weeklyData = Array.from(weeklyMap.entries())
          .map(([week, count]) => ({ week: format(new Date(week), 'MMM dd'), count }))
          .reverse();

        // Monthly data for last 6 months
        const monthlyMap = new Map<string, number>();
        for (let i = 0; i < 6; i++) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          monthlyMap.set(format(monthStart, 'yyyy-MM'), 0);
        }

        consultations?.forEach(c => {
          const monthKey = format(new Date(c.created_at), 'yyyy-MM');
          if (monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
          }
        });

        const monthlyData = Array.from(monthlyMap.entries())
          .map(([month, count]) => ({ month: format(new Date(month + '-01'), 'MMM yyyy'), count }))
          .reverse();

        // Status distribution
        const statusMap = new Map<string, number>();
        consultations?.forEach(c => {
          statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
        });

        const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count,
          percentage: totalConsultations > 0 ? (count / totalConsultations) * 100 : 0,
        }));

        // Tag distribution and analysis
        const tagMap = new Map<string, number>();
        consultations?.forEach(c => {
          if (c.tags && Array.isArray(c.tags)) {
            c.tags.forEach(tag => {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
          }
        });

        const tagDistribution = Array.from(tagMap.entries())
          .map(([tag, count]) => ({
            tag,
            count,
            percentage: totalConsultations > 0 ? (count / totalConsultations) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count);

        // Top 10 tags
        const topTags = tagDistribution.slice(0, 10);

        return {
          totalConsultations,
          completedConsultations,
          inProgressConsultations,
          consultationsThisWeek,
          consultationsThisMonth,
          averagePerWeek,
          dailyData,
          weeklyData,
          monthlyData,
          statusDistribution,
          tagDistribution,
          topTags,
        };
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        toast.error("Unable to load analytics. Please try again later.");
        return {
          totalConsultations: 0,
          completedConsultations: 0,
          inProgressConsultations: 0,
          consultationsThisWeek: 0,
          consultationsThisMonth: 0,
          averagePerWeek: 0,
          dailyData: [],
          weeklyData: [],
          monthlyData: [],
          statusDistribution: [],
          tagDistribution: [],
          topTags: [],
        };
      }
    }
  });

  return {
    analytics,
    isLoading,
  };
};
