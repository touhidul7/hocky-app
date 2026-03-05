import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'staff' | 'coach' | 'player';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  console.log('ProtectedRoute: Render check - loading:', loading, 'user:', user?.email ?? 'NO_USER', 'role:', role, 'allowedRoles:', allowedRoles);

  if (loading) {
    console.log('ProtectedRoute: Still loading...');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    console.log('ProtectedRoute: ✗ No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // No role assigned - send to pending
  if (!role) {
    console.log('ProtectedRoute: ✗ No role assigned, redirecting to /pending');
    return <Navigate to="/pending" replace />;
  }

  // Role not allowed for this route
  if (!allowedRoles.includes(role as AppRole)) {
    console.log('ProtectedRoute: ✗ Role not in allowedRoles:', { role, allowedRoles, redirecting: '/unauthorized' });
    return <Navigate to="/unauthorized" replace />;
  }

  // All checks passed
  console.log('ProtectedRoute: ✓ All checks passed, rendering protected component');
  return <>{children}</>;
}
