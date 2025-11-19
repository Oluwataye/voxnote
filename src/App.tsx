
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Wait for initial auth check
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              {isAuthenticated && <AppSidebar />}
              <main className="flex-1">
                <Routes>
                  <Route
                    path="/dashboard"
                    element={
                      isAuthenticated ? (
                        <Dashboard />
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      isAuthenticated ? (
                        <Settings />
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      isAuthenticated ? (
                        <History />
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      isAuthenticated ? (
                        <Analytics />
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                  <Route
                    path="/templates"
                    element={
                      isAuthenticated ? (
                        <Templates />
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route
                    path="/auth"
                    element={
                      !isAuthenticated ? (
                        <Auth />
                      ) : (
                        <Navigate to="/dashboard" replace />
                      )
                    }
                  />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
