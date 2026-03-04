import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Building2, Users, Calendar, Beaker } from 'lucide-react';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ orgs: 0, teams: 0, sessions: 0, tests: 0 });

  useEffect(() => {
    async function load() {
      const [orgs, teams, sessions, tests] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('tests').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        orgs: orgs.count ?? 0,
        teams: teams.count ?? 0,
        sessions: sessions.count ?? 0,
        tests: tests.count ?? 0,
      });
    }
    load();
  }, []);

  return (
    <AppShell title="Admin Dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Organizations', value: stats.orgs, icon: <Building2 className="h-5 w-5" />, color: 'text-primary' },
          { label: 'Teams', value: stats.teams, icon: <Users className="h-5 w-5" />, color: 'text-accent' },
          { label: 'Sessions', value: stats.sessions, icon: <Calendar className="h-5 w-5" />, color: 'text-success' },
          { label: 'Tests', value: stats.tests, icon: <Beaker className="h-5 w-5" />, color: 'text-warning' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/admin/organizations', label: 'Manage Orgs', icon: <Building2 className="h-4 w-4" /> },
            { href: '/admin/teams', label: 'Manage Teams', icon: <Users className="h-4 w-4" /> },
            { href: '/admin/sessions', label: 'Manage Sessions', icon: <Calendar className="h-4 w-4" /> },
            { href: '/admin/tests', label: 'Manage Tests', icon: <Beaker className="h-4 w-4" /> },
          ].map(l => (
            <a key={l.href} href={l.href}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1">
                {l.icon}
                <span className="text-xs">{l.label}</span>
              </Button>
            </a>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
