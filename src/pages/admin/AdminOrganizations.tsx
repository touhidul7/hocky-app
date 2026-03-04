import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Org { id: string; name: string; created_at: string }

export default function AdminOrganizations() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [name, setName] = useState('');

  const load = async () => {
    const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    setOrgs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setName(''); setOpen(true); };
  const openEdit = (org: Org) => { setEditing(org); setName(org.name); setOpen(true); };

  const save = async () => {
    if (!name.trim()) return;
    if (editing) {
      await supabase.from('organizations').update({ name }).eq('id', editing.id);
      toast({ title: 'Organization updated' });
    } else {
      await supabase.from('organizations').insert({ name });
      toast({ title: 'Organization created' });
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this organization? This will remove all associated teams and data.')) return;
    await supabase.from('organizations').delete().eq('id', id);
    toast({ title: 'Organization deleted', variant: 'destructive' });
    load();
  };

  return (
    <AppShell title="Organizations">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Organizations</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Organization</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Organization Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Edmonton Hockey Club" />
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
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map(org => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(org)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(org.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && orgs.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No organizations yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
