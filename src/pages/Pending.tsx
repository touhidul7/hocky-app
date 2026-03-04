import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function Pending() {
  const { signOut, user } = useAuth();
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
          <p className="text-muted-foreground">
            Your account (<strong>{user?.email}</strong>) has been created successfully. An administrator needs to assign your role before you can access the platform.
          </p>
          <p className="text-sm text-muted-foreground">Please contact your organization administrator.</p>
          <Button variant="outline" onClick={signOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
