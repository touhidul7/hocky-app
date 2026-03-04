import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  const { role } = useAuth();
  return (
    <AppShell title="Unauthorized">
      <Card className="max-w-md">
        <CardHeader>
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldX className="h-5 w-5 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Your role (<strong>{role}</strong>) does not have access to this page.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
