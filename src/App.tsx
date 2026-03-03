import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const CRM = lazy(() => import("./pages/CRM"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Admin = lazy(() => import("./pages/Admin"));
const LeaderDashboard = lazy(() => import("./pages/LeaderDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute allowedRoles={['admin', 'lider']}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/gestao-leads" element={
                  <ProtectedRoute allowedRoles={['admin', 'lider']}>
                    <LeaderDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/leads" element={
                  <ProtectedRoute allowedRoles={['admin', 'lider', 'sdr']}>
                    <Leads />
                  </ProtectedRoute>
                } />
                <Route path="/crm" element={
                  <ProtectedRoute allowedRoles={['admin', 'lider', 'sdr']}>
                    <CRM />
                  </ProtectedRoute>
                } />
                <Route path="/calendario" element={
                  <ProtectedRoute>
                    <Calendario />
                  </ProtectedRoute>
                } />
                <Route path="/relatorios" element={
                  <ProtectedRoute allowedRoles={['admin', 'lider']}>
                    <Relatorios />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin', 'lider']}>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
