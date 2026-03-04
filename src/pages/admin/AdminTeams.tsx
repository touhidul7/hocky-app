import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Team { id: string; name: string; level: string | null; season_year: number | null; organization_id: string; organizations?: { name: string } | null }
interface Org { id: string; name: string }

export default function AdminTeams() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: '', level: '', season_year: '', organization_id: '' });

  const load = async () => {
    const { data } = await supabase.from('teams').select('*, organizations(name)').order('created_at', { ascending: false });
    setTeams((data as Team[]) ?? []);
  };

  useEffect(() => {
    load();
    supabase.from('organizations').select('id,name').then(({ data }) => setOrgs(data ?? []));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', level: '', season_year: new Date().getFullYear().toString(), organization_id: orgs[0]?.id ?? '' });
    setOpen(true);
  };

  const openEdit = (t: Team) => {
    setEditing(t);
    setForm({ name: t.name, level: t.level ?? '', season_year: t.season_year?.toString() ?? '', organization_id: t.organization_id });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.organization_id) {
      toast({ title: 'Name and Organization are required', variant: 'destructive' });
      return;
    }
    const payload = {
      name: form.name,
      level: form.level || null,
      season_year: form.season_year ? parseInt(form.season_year) : null,
      organization_id: form.organization_id,
    };
    if (editing) {
      await supabase.from('teams').update(payload).eq('id', editing.id);
      toast({ title: 'Team updated' });
    } else {
      await supabase.from('teams').insert(payload);
      toast({ title: 'Team created' });
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    await supabase.from('teams').delete().eq('id', id);
    toast({ title: 'Team deleted', variant: 'destructive' });
    load();
  };

  return (
    <AppShell title="Teams">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Teams</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Team</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Organization</Label>
                  <Select value={form.organization_id} onValueChange={v => setForm(p => ({ ...p, organization_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Team Name</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Oilers U14 AA" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Level</Label>
                    <Input value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} placeholder="e.g. U14 AA" />
                  </div>
                  <div className="space-y-1">
                    <Label>Season Year</Label>
                    <Input type="number" value={form.season_year} onChange={e => setForm(p => ({ ...p, season_year: e.target.value }))} placeholder="2025" />
                  </div>
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
                <TableHead>Organization</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Season</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.organizations?.name}</TableCell>
                  <TableCell>{t.level ? <Badge variant="secondary">{t.level}</Badge> : '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.season_year ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link to={`/admin/teams/${t.id}/players`}>
                        <Button size="icon" variant="ghost" title="Manage players"><Users className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {teams.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No teams yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
