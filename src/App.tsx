import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Licenses from "./pages/Licenses";
import Resellers from "./pages/Resellers";
import Managers from "./pages/Managers";
import Logs from "./pages/Logs";
import ApiDocs from "./pages/ApiDocs";
import BotGuide from "./pages/BotGuide";
import SettingsPage from "./pages/Settings";
import ResellerDashboard from "./pages/ResellerDashboard";
import ResellerKeys from "./pages/ResellerKeys";
import ResellerLogs from "./pages/ResellerLogs";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerApps from "./pages/ManagerApps";
import ManagerLicenses from "./pages/ManagerLicenses";

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
            {/* Public marketing */}
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            {/* Admin routes (platform owner) */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
            <Route path="/apps" element={<ProtectedRoute requiredRole="admin"><Applications /></ProtectedRoute>} />
            <Route path="/licenses" element={<ProtectedRoute requiredRole="admin"><Licenses /></ProtectedRoute>} />
            <Route path="/resellers" element={<ProtectedRoute requiredRole="admin"><Resellers /></ProtectedRoute>} />
            <Route path="/managers" element={<ProtectedRoute requiredRole="admin"><Managers /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute requiredRole="admin"><Logs /></ProtectedRoute>} />
            <Route path="/api-docs" element={<ProtectedRoute requiredRole="admin"><ApiDocs /></ProtectedRoute>} />
            <Route path="/bot-guide" element={<ProtectedRoute requiredRole="admin"><BotGuide /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />
            {/* Seller routes — share the admin pages for now (Batch B will split) */}
            <Route path="/dashboard" element={<ProtectedRoute requiredRole="seller"><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/apps" element={<ProtectedRoute requiredRole="seller"><Applications /></ProtectedRoute>} />
            <Route path="/dashboard/licenses" element={<ProtectedRoute requiredRole="seller"><Licenses /></ProtectedRoute>} />
            <Route path="/dashboard/logs" element={<ProtectedRoute requiredRole="seller"><Logs /></ProtectedRoute>} />
            <Route path="/dashboard/api-docs" element={<ProtectedRoute requiredRole="seller"><ApiDocs /></ProtectedRoute>} />
            <Route path="/dashboard/bot-guide" element={<ProtectedRoute requiredRole="seller"><BotGuide /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute requiredRole="seller"><SettingsPage /></ProtectedRoute>} />
            <Route path="/dashboard/resellers" element={<ProtectedRoute requiredRole="seller"><Resellers /></ProtectedRoute>} />
            <Route path="/dashboard/managers" element={<ProtectedRoute requiredRole="seller"><Managers /></ProtectedRoute>} />
            {/* Reseller routes */}
            <Route path="/reseller" element={<ProtectedRoute requiredRole="reseller"><ResellerDashboard /></ProtectedRoute>} />
            <Route path="/reseller/keys" element={<ProtectedRoute requiredRole="reseller"><ResellerKeys /></ProtectedRoute>} />
            <Route path="/reseller/logs" element={<ProtectedRoute requiredRole="reseller"><ResellerLogs /></ProtectedRoute>} />
            {/* Manager routes */}
            <Route path="/manager" element={<ProtectedRoute requiredRole="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/apps" element={<ProtectedRoute requiredRole="manager"><ManagerApps /></ProtectedRoute>} />
            <Route path="/manager/licenses" element={<ProtectedRoute requiredRole="manager"><ManagerLicenses /></ProtectedRoute>} />
            <Route path="/manager/api-docs" element={<ProtectedRoute requiredRole="manager"><ApiDocs useManagerLayout /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
