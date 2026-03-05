import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { Plus, Pencil, Trash2, Upload, Copy, User } from 'lucide-react';

interface Player {
  id: string; team_id: string; first_name: string; last_name: string;
  jersey_number: string | null; position: string | null; dob: string | null;
  active: boolean; access_code: string | null; user_id?: string;
}

interface UserProfile {
  id: string; full_name: string; email: string;
}

const blankForm = { first_name: '', last_name: '', jersey_number: '', position: '', dob: '' };

export default function AdminPlayers() {
  const { teamId } = useParams<{ teamId: string }>();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [open, setOpen] = useState(false);
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState(blankForm);
  const [csvInput, setCsvInput] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const load = async () => {
    const { data } = await supabase.from('players').select('*').eq('team_id', teamId!).order('last_name');
    setPlayers(data ?? []);
  };

  const loadUsers = async () => {
    // Get all users with 'player' role
    const { data: userRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'player');
    if (!userRoles) return;
    
    const userIds = userRoles.map(ur => ur.user_id);
    if (userIds.length === 0) {
      setUsers([]);
      return;
    }

    const { data: profiles } = await supabase.from('profiles').select('id,full_name,email').in('id', userIds);
    setUsers(profiles ?? []);
  };

  useEffect(() => {
    if (!teamId) return;
    load();
    loadUsers();
    supabase.from('teams').select('name').eq('id', teamId).single().then(({ data }) => setTeamName(data?.name ?? ''));
  }, [teamId]);

  const openCreate = () => { setEditing(null); setForm(blankForm); setOpen(true); };
  const openEdit = (p: Player) => {
    setEditing(p);
    setForm({ first_name: p.first_name, last_name: p.last_name, jersey_number: p.jersey_number ?? '', position: p.position ?? '', dob: p.dob ?? '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.first_name || !form.last_name) {
      toast({ title: 'First and last name are required', variant: 'destructive' });
      return;
    }
    const payload = {
      team_id: teamId!,
      first_name: form.first_name,
      last_name: form.last_name,
      jersey_number: form.jersey_number || null,
      position: form.position || null,
      dob: form.dob || null,
    };
    if (editing) {
      await supabase.from('players').update(payload).eq('id', editing.id);
      toast({ title: 'Player updated' });
    } else {
      await supabase.from('players').insert(payload);
      toast({ title: 'Player added' });
    }
    setOpen(false);
    load();
  };

  const addUserAsPlayer = async () => {
    if (!selectedUserId) {
      toast({ title: 'Please select a user', variant: 'destructive' });
      return;
    }

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    try {
      // Create player record for this user
      const { data: newPlayer, error: playerError } = await supabase.from('players').insert({
        team_id: teamId!,
        first_name: user.full_name?.split(' ')[0] || 'Player',
        last_name: user.full_name?.split(' ').slice(1).join(' ') || user.email?.split('@')[0] || 'User',
        jersey_number: null,
        position: null,
        dob: null,
      }).select().single();

      if (playerError) {
        toast({ title: 'Error creating player record', variant: 'destructive' });
        return;
      }

      // Link user to player
      if (newPlayer) {
        await supabase.from('parent_player_links').insert({
          user_id: selectedUserId,
          player_id: newPlayer.id,
        });
        toast({ title: `${user.full_name} added to team` });
      }
      
      setOpenUserSelect(false);
      setSelectedUserId('');
      load();
    } catch (err) {
      console.error('Error adding user as player:', err);
      toast({ title: 'Error adding user to team', variant: 'destructive' });
    }
  };

  const remove = async (id: string, userId?: string) => {
    if (!confirm('Remove this player?')) return;
    
    try {
      // If player is linked to a user, remove the link first
      if (userId) {
        await supabase.from('parent_player_links').delete().eq('player_id', id).eq('user_id', userId);
      }
      
      await supabase.from('players').delete().eq('id', id);
      toast({ title: 'Player removed', variant: 'destructive' });
      load();
    } catch (err) {
      console.error('Error removing player:', err);
      toast({ title: 'Error removing player', variant: 'destructive' });
    }
  };

  const importCsv = async () => {
    const lines = csvInput.trim().split('\n').slice(1); // skip header
    const rows = lines.map(line => {
      const [first_name, last_name, jersey_number, position, dob] = line.split(',').map(s => s.trim());
      return { team_id: teamId!, first_name, last_name, jersey_number: jersey_number || null, position: position || null, dob: dob || null };
    }).filter(r => r.first_name && r.last_name);
    if (rows.length === 0) { toast({ title: 'No valid rows found', variant: 'destructive' }); return; }
    await supabase.from('players').insert(rows);
    toast({ title: `Imported ${rows.length} players` });
    setCsvOpen(false);
    setCsvInput('');
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Access code copied' });
  };

  return (
    <AppShell title={`Players — ${teamName}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Roster ({players.length})</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-1" /> Import CSV</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Import Players via CSV</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">Paste CSV with header: <code className="bg-muted px-1 rounded text-xs">first_name,last_name,jersey_number,position,dob</code></p>
                  <textarea
                    className="w-full h-40 border border-input rounded-md p-2 text-sm font-mono bg-background resize-none"
                    value={csvInput}
                    onChange={e => setCsvInput(e.target.value)}
                    placeholder="first_name,last_name,jersey_number,position,dob&#10;John,Smith,10,C,2010-01-15&#10;Jane,Doe,7,D,"
                  />
                  <Button onClick={importCsv} className="w-full">Import</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openUserSelect} onOpenChange={setOpenUserSelect}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><User className="h-4 w-4 mr-1" /> Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add User as Player</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>Select Player User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger><SelectValue placeholder="Select a user with player role" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {users.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">No users with player role found. Create users and assign them the player role first.</p>
                    )}
                  </div>
                  <Button onClick={addUserAsPlayer} className="w-full" disabled={!selectedUserId || users.length === 0}>Add Player</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Player</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Player</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>First Name *</Label>
                      <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Last Name *</Label>
                      <Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Jersey #</Label>
                      <Input value={form.jersey_number} onChange={e => setForm(p => ({ ...p, jersey_number: e.target.value }))} placeholder="10" />
                    </div>
                    <div className="space-y-1">
                      <Label>Position</Label>
                      <Input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="C, LW, D, G" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
                  </div>
                  <Button onClick={save} className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Access Code</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-muted-foreground">{p.jersey_number ?? '-'}</TableCell>
                  <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                  <TableCell>{p.position ? <Badge variant="outline">{p.position}</Badge> : '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.dob ?? '-'}</TableCell>
                  <TableCell>
                    {p.access_code && (
                      <button onClick={() => copyCode(p.access_code!)} className="flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                        {p.access_code} <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id, p.user_id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {players.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No players yet. Add players, import via CSV, or link from existing users.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
