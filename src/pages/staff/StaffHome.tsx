import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle2, Clock } from 'lucide-react';

interface Session {
  id: string; team_id: string; session_type: string; date: string;
  location: string | null; status: string;
  teams?: { name: string } | null;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-warning/10 text-warning border-warning/30',
  in_progress: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-success/10 text-success border-success/30',
};

export default function StaffHome() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    supabase.from('sessions')
      .select('*, teams(name)')
      .in('status', ['scheduled', 'in_progress'])
      .gte('date', today)
      .order('date')
      .then(({ data }) => setSessions((data as Session[]) ?? []));
  }, []);

  return (
    <AppShell title="Today's Sessions">
      <div className="space-y-4">
        {sessions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No upcoming sessions assigned to you.</p>
            </CardContent>
          </Card>
        )}
        {sessions.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-semibold text-base">{s.teams?.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {new Date(s.date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {s.location ? ` · ${s.location}` : ''}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="capitalize">{s.session_type}</Badge>
                  <Badge className={`capitalize border ${statusColors[s.status]}`}>{s.status.replace('_', ' ')}</Badge>
                </div>
              </div>
              <Link to={`/staff/entry/${s.id}`}>
                <Button className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {s.status === 'in_progress' ? 'Continue' : 'Start'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
