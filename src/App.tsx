import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Licenses from "./pages/Licenses";
import Resellers from "./pages/Resellers";
import Logs from "./pages/Logs";
import ApiDocs from "./pages/ApiDocs";
import SettingsPage from "./pages/Settings";
import ResellerDashboard from "./pages/ResellerDashboard";
import ResellerKeys from "./pages/ResellerKeys";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Admin routes */}
            <Route path="/" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
            <Route path="/apps" element={<ProtectedRoute requiredRole="admin"><Applications /></ProtectedRoute>} />
            <Route path="/licenses" element={<ProtectedRoute requiredRole="admin"><Licenses /></ProtectedRoute>} />
            <Route path="/resellers" element={<ProtectedRoute requiredRole="admin"><Resellers /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute requiredRole="admin"><Logs /></ProtectedRoute>} />
            <Route path="/api-docs" element={<ProtectedRoute requiredRole="admin"><ApiDocs /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />
            {/* Reseller routes */}
            <Route path="/reseller" element={<ProtectedRoute requiredRole="reseller"><ResellerDashboard /></ProtectedRoute>} />
            <Route path="/reseller/keys" element={<ProtectedRoute requiredRole="reseller"><ResellerKeys /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
