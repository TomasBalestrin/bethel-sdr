import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Placeholder pages - will be implemented next
const Dashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-muted-foreground mt-2">Em construção...</p></div>;
const Leads = () => <div className="p-8"><h1 className="text-2xl font-bold">Leads</h1><p className="text-muted-foreground mt-2">Em construção...</p></div>;
const CRM = () => <div className="p-8"><h1 className="text-2xl font-bold">CRM Agendamentos</h1><p className="text-muted-foreground mt-2">Em construção...</p></div>;
const Calendario = () => <div className="p-8"><h1 className="text-2xl font-bold">Calendário</h1><p className="text-muted-foreground mt-2">Em construção...</p></div>;
const Relatorios = () => <div className="p-8"><h1 className="text-2xl font-bold">Relatórios</h1><p className="text-muted-foreground mt-2">Em construção...</p></div>;
const Admin = () => <div className="p-8"><h1 className="text-2xl font-bold">Painel Admin</h1><p className="text-muted-foreground mt-2">Em construção...</p></div>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['admin', 'lider']}>
                <Dashboard />
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
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
