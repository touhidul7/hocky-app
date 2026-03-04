import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Session {
  id: string; team_id: string; session_type: string; date: string;
  location: string | null; status: string; notes: string | null;
  teams?: { name: string } | null;
}
interface Team { id: string; name: string }

const statusColors: Record<string, string> = {
  scheduled: 'bg-warning/10 text-warning border-warning/30',
  in_progress: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-success/10 text-success border-success/30',
};

export default function AdminSessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState({ team_id: '', session_type: 'baseline', date: new Date().toISOString().split('T')[0], location: '', notes: '' });

  const load = async () => {
    const { data } = await supabase.from('sessions').select('*, teams(name)').order('date', { ascending: false });
    setSessions((data as Session[]) ?? []);
  };

  useEffect(() => {
    load();
    supabase.from('teams').select('id,name').then(({ data }) => setTeams(data ?? []));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ team_id: teams[0]?.id ?? '', session_type: 'baseline', date: new Date().toISOString().split('T')[0], location: '', notes: '' });
    setOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({ team_id: s.team_id, session_type: s.session_type, date: s.date, location: s.location ?? '', notes: s.notes ?? '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.team_id) { toast({ title: 'Team is required', variant: 'destructive' }); return; }
    const payload = { team_id: form.team_id, session_type: form.session_type as any, date: form.date, location: form.location || null, notes: form.notes || null };
    if (editing) {
      await supabase.from('sessions').update(payload).eq('id', editing.id);
      toast({ title: 'Session updated' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('sessions').insert({ ...payload, created_by: user?.id });
      toast({ title: 'Session created' });
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    await supabase.from('sessions').delete().eq('id', id);
    toast({ title: 'Session deleted', variant: 'destructive' });
    load();
  };

  return (
    <AppShell title="Sessions">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Sessions</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Session</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Team</Label>
                  <Select value={form.team_id} onValueChange={v => setForm(p => ({ ...p, team_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={form.session_type} onValueChange={v => setForm(p => ({ ...p, session_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baseline">Baseline</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Arena name" />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
                <Button onClick={save} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.teams?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{s.session_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(s.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.location ?? '-'}</TableCell>
                  <TableCell><Badge className={`capitalize border ${statusColors[s.status]}`}>{s.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.status !== 'completed' && (
                        <Link to={`/staff/entry/${s.id}`}>
                          <Button size="icon" variant="ghost" title="Enter results"><PlayCircle className="h-3.5 w-3.5 text-primary" /></Button>
                        </Link>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sessions yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
