import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Pending() {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-redirect when role is assigned
  useEffect(() => {
    console.log('Pending: useEffect check - role status:', role, 'user:', user?.email ?? 'NO_USER');
    
    if (!role) {
      console.log('Pending: No role yet, waiting...');
      return;
    }
    
    console.log('Pending: ✓ Role detected! Role:', role, '- redirecting...');
    const home = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : role === 'coach' ? '/coach' : '/player';
    console.log('Pending: Computed home route:', home);
    
    const timer = setTimeout(() => {
      console.log('Pending: Executing redirect to:', home);
      navigate(home, { replace: true });
    }, 300);

    return () => {
      console.log('Pending: useEffect cleanup - clearing timer');
      clearTimeout(timer);
    };
  }, [role, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Hard reload to force re-fetch auth state
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 mx-auto mb-3">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <CardTitle>Awaiting Role Assignment</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <p className="text-muted-foreground">
              Your account (<strong>{user?.email}</strong>) has been created successfully.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              An administrator needs to assign your role before you can access the platform.
            </p>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Waiting for role assignment...</span>
              <br />
              Current role: <strong>{role || 'None'}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleRefresh}
              className="w-full"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> 
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              variant="ghost" 
              onClick={signOut} 
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Ask your administrator to assign you a role in the system. Then click Refresh.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
