import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

import Auth from "@/pages/Auth";
import Pending from "@/pages/Pending";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrganizations from "@/pages/admin/AdminOrganizations";
import AdminTeams from "@/pages/admin/AdminTeams";
import AdminPlayers from "@/pages/admin/AdminPlayers";
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminTests from "@/pages/admin/AdminTests";
import AdminUsers from "@/pages/admin/AdminUsers";

// Staff
import StaffHome from "@/pages/staff/StaffHome";
import StaffEntry from "@/pages/staff/StaffEntry";

// Coach
import CoachDashboard from "@/pages/coach/CoachDashboard";

// Parent
import ParentPortal from "@/pages/parent/ParentPortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<Navigate to="/auth" replace />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/organizations" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrganizations /></ProtectedRoute>} />
            <Route path="/admin/teams" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeams /></ProtectedRoute>} />
            <Route path="/admin/teams/:teamId/players" element={<ProtectedRoute allowedRoles={['admin']}><AdminPlayers /></ProtectedRoute>} />
            <Route path="/admin/sessions" element={<ProtectedRoute allowedRoles={['admin']}><AdminSessions /></ProtectedRoute>} />
            <Route path="/admin/tests" element={<ProtectedRoute allowedRoles={['admin']}><AdminTests /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />

            {/* Staff */}
            <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><StaffHome /></ProtectedRoute>} />
            <Route path="/staff/sessions" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><StaffHome /></ProtectedRoute>} />
            <Route path="/staff/entry/:sessionId" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><StaffEntry /></ProtectedRoute>} />

            {/* Coach */}
            <Route path="/coach" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute>} />
            <Route path="/coach/roster" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute>} />
            <Route path="/coach/analytics" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute>} />
            <Route path="/coach/reports" element={<ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute>} />

            {/* Parent */}
            <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent', 'admin']}><ParentPortal /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
