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
import { Plus, Pencil, UserCheck } from 'lucide-react';

interface Profile { id: string; full_name: string | null; email: string | null; created_at: string }
interface UserWithRole extends Profile { role?: string }

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/30',
  staff: 'bg-primary/10 text-primary border-primary/30',
  coach: 'bg-accent/10 text-accent border-accent/30',
  parent: 'bg-success/10 text-success border-success/30',
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState('staff');

  const load = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('user_id,role');
    const roleMap = Object.fromEntries((roles ?? []).map(r => [r.user_id, r.role]));
    setUsers((profiles ?? []).map(p => ({ ...p, role: roleMap[p.id] })));
  };

  useEffect(() => { load(); }, []);

  const openAssign = (u: UserWithRole) => {
    setSelectedUser(u);
    setNewRole(u.role ?? 'staff');
    setOpen(true);
  };

  const saveRole = async () => {
    if (!selectedUser) return;
    // Remove existing roles first
    await supabase.from('user_roles').delete().eq('user_id', selectedUser.id);
    // Insert new role
    await supabase.from('user_roles').insert({ user_id: selectedUser.id, role: newRole as any });
    toast({ title: `Role assigned: ${newRole}` });
    setOpen(false);
    load();
  };

  return (
    <AppShell title="Users">
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Role — {selectedUser?.full_name || selectedUser?.email}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveRole} className="w-full">Save Role</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? 'Unknown'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge className={`capitalize border ${roleColors[u.role] ?? ''}`}>{u.role}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">No role</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openAssign(u)}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
