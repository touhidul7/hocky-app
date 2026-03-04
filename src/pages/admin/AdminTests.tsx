import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface Test {
  id: string; name: string; unit: string; direction: string;
  min_value: number | null; max_value: number | null; max_attempts: number | null;
  store_best_only: boolean; active: boolean; sort_order: number | null;
}

const blankForm = { name: '', unit: 'sec', direction: 'lower_better', min_value: '', max_value: '', max_attempts: '1', store_best_only: true };

export default function AdminTests() {
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState(blankForm);

  const load = async () => {
    const { data } = await supabase.from('tests').select('*').order('sort_order').order('name');
    setTests(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blankForm); setOpen(true); };
  const openEdit = (t: Test) => {
    setEditing(t);
    setForm({ name: t.name, unit: t.unit, direction: t.direction, min_value: t.min_value?.toString() ?? '', max_value: t.max_value?.toString() ?? '', max_attempts: t.max_attempts?.toString() ?? '1', store_best_only: t.store_best_only });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.unit) { toast({ title: 'Name and unit are required', variant: 'destructive' }); return; }
    const payload = {
      name: form.name, unit: form.unit, direction: form.direction as any,
      min_value: form.min_value ? parseFloat(form.min_value) : null,
      max_value: form.max_value ? parseFloat(form.max_value) : null,
      max_attempts: parseInt(form.max_attempts) || 1,
      store_best_only: form.store_best_only,
    };
    if (editing) {
      await supabase.from('tests').update(payload).eq('id', editing.id);
      toast({ title: 'Test updated' });
    } else {
      await supabase.from('tests').insert(payload);
      toast({ title: 'Test created' });
    }
    setOpen(false);
    load();
  };

  const toggleActive = async (t: Test) => {
    await supabase.from('tests').update({ active: !t.active }).eq('id', t.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this test? This will also delete all results for this test.')) return;
    await supabase.from('tests').delete().eq('id', id);
    toast({ title: 'Test deleted', variant: 'destructive' });
    load();
  };

  return (
    <AppShell title="Tests">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Configured Tests</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Test</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Test</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Test Name *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Blue Line Sprint" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Unit *</Label>
                    <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="sec, mph, %" />
                  </div>
                  <div className="space-y-1">
                    <Label>Direction</Label>
                    <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lower_better">Lower is Better ↓</SelectItem>
                        <SelectItem value="higher_better">Higher is Better ↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Min Value</Label>
                    <Input type="number" value={form.min_value} onChange={e => setForm(p => ({ ...p, min_value: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Value</Label>
                    <Input type="number" value={form.max_value} onChange={e => setForm(p => ({ ...p, max_value: e.target.value }))} placeholder="100" />
                  </div>
                  <div className="space-y-1">
                    <Label>Attempts</Label>
                    <Input type="number" min="1" max="5" value={form.max_attempts} onChange={e => setForm(p => ({ ...p, max_attempts: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.store_best_only} onCheckedChange={v => setForm(p => ({ ...p, store_best_only: v }))} />
                  <Label>Store best attempt only</Label>
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
                <TableHead>Unit</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map(t => (
                <TableRow key={t.id} className={!t.active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.unit}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {t.direction === 'higher_better' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {t.direction === 'higher_better' ? 'Higher' : 'Lower'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.min_value != null && t.max_value != null ? `${t.min_value} – ${t.max_value}` : '-'}
                  </TableCell>
                  <TableCell className="text-center">{t.max_attempts ?? 1}</TableCell>
                  <TableCell>
                    <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tests configured</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
