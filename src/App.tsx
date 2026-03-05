import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";

// Public pages (loaded immediately)
import Auth from "@/pages/Auth";
import Pending from "@/pages/Pending";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

// Admin pages (lazy loaded)
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminOrganizations = lazy(() => import("@/pages/admin/AdminOrganizations"));
const AdminTeams = lazy(() => import("@/pages/admin/AdminTeams"));
const AdminPlayers = lazy(() => import("@/pages/admin/AdminPlayers"));
const AdminSessions = lazy(() => import("@/pages/admin/AdminSessions"));
const AdminTests = lazy(() => import("@/pages/admin/AdminTests"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

// Staff pages (lazy loaded)
const StaffHome = lazy(() => import("@/pages/staff/StaffHome"));
const StaffEntry = lazy(() => import("@/pages/staff/StaffEntry"));

// Coach pages (lazy loaded)
const CoachDashboard = lazy(() => import("@/pages/coach/CoachDashboard"));

// Parent pages (lazy loaded)
const ParentPortal = lazy(() => import("@/pages/parent/ParentPortal"));

const LoadingFallback = () => <div className="flex items-center justify-center h-screen">Loading...</div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="ice-metrics-theme">
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
              <Route path="/admin" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute></Suspense>} />
              <Route path="/admin/organizations" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminOrganizations /></ProtectedRoute></Suspense>} />
              <Route path="/admin/teams" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminTeams /></ProtectedRoute></Suspense>} />
              <Route path="/admin/teams/:teamId/players" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminPlayers /></ProtectedRoute></Suspense>} />
              <Route path="/admin/sessions" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminSessions /></ProtectedRoute></Suspense>} />
              <Route path="/admin/tests" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminTests /></ProtectedRoute></Suspense>} />
              <Route path="/admin/users" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute></Suspense>} />

              {/* Staff */}
              <Route path="/staff" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['staff', 'admin']}><StaffHome /></ProtectedRoute></Suspense>} />
              <Route path="/staff/sessions" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['staff', 'admin']}><StaffHome /></ProtectedRoute></Suspense>} />
              <Route path="/staff/entry/:sessionId" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['staff', 'admin']}><StaffEntry /></ProtectedRoute></Suspense>} />

              {/* Coach */}
              <Route path="/coach" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute></Suspense>} />
              <Route path="/coach/roster" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute></Suspense>} />
              <Route path="/coach/analytics" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute></Suspense>} />
              <Route path="/coach/reports" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['coach', 'admin']}><CoachDashboard /></ProtectedRoute></Suspense>} />

              {/* Parent/Player */}
              <Route path="/parent" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['player', 'admin']}><ParentPortal /></ProtectedRoute></Suspense>} />
              <Route path="/player" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute allowedRoles={['player', 'admin']}><ParentPortal /></ProtectedRoute></Suspense>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
