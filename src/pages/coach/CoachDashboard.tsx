import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Trophy, Users, TrendingUp, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Player { id: string; first_name: string; last_name: string; jersey_number: string | null }
interface Test { id: string; name: string; unit: string; direction: string }
interface Session { id: string; session_type: string; date: string }
interface Result { player_id: string; test_id: string; value_best: number | null }

export default function CoachDashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    supabase.from('team_coaches').select('team_id, teams(id,name)').eq('user_id', user!.id)
      .then(({ data }) => {
        const ts = (data ?? []).map((d: any) => d.teams).filter(Boolean);
        setTeams(ts);
        if (ts.length > 0) setSelectedTeam(ts[0].id);
      });
    supabase.from('tests').select('*').eq('active', true).then(({ data }) => setTests(data ?? []));
  }, [user]);

  useEffect(() => {
    if (!selectedTeam) return;
    supabase.from('sessions').select('id,session_type,date').eq('team_id', selectedTeam).eq('status', 'completed').order('date', { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? []);
        if (data && data.length > 0) setSelectedSession(data[0].id);
      });
    supabase.from('players').select('id,first_name,last_name,jersey_number').eq('team_id', selectedTeam).eq('active', true).order('last_name')
      .then(({ data }) => setPlayers(data ?? []));
  }, [selectedTeam]);

  useEffect(() => {
    if (!selectedSession) return;
    supabase.from('results').select('player_id,test_id,value_best').eq('session_id', selectedSession)
      .then(({ data }) => setResults(data ?? []));
  }, [selectedSession]);

  // Build roster table data
  const resultMap: Record<string, Record<string, number | null>> = {};
  for (const r of results) {
    if (!resultMap[r.player_id]) resultMap[r.player_id] = {};
    resultMap[r.player_id][r.test_id] = r.value_best;
  }

  // Team averages
  const teamAvgs = tests.map(t => {
    const vals = results.filter(r => r.test_id === t.id && r.value_best != null).map(r => r.value_best as number);
    return { name: t.name, unit: t.unit, avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null, count: vals.length };
  });

  const exportCsv = () => {
    const header = ['Player', 'Jersey', ...tests.map(t => `${t.name} (${t.unit})`)].join(',');
    const rows = players.map(p => [
      `${p.first_name} ${p.last_name}`,
      p.jersey_number ?? '',
      ...tests.map(t => resultMap[p.id]?.[t.id] ?? '')
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'team_results.csv'; a.click();
  };

  return (
    <AppShell title="Coach Dashboard">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select team" /></SelectTrigger>
          <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedSession} onValueChange={setSelectedSession}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select session" /></SelectTrigger>
          <SelectContent>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.session_type} · {new Date(s.date).toLocaleDateString()}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} className="ml-auto"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Players</div><div className="text-2xl font-bold">{players.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Results</div><div className="text-2xl font-bold">{results.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Tests</div><div className="text-2xl font-bold">{tests.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Sessions</div><div className="text-2xl font-bold">{sessions.length}</div></CardContent></Card>
      </div>

      {/* Team averages chart */}
      {teamAvgs.some(a => a.avg !== null) && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart className="h-4 w-4" /> Team Averages by Test</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamAvgs.filter(a => a.avg !== null)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => v?.toFixed(2)} />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Roster table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Roster Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 min-w-[160px]">Player</th>
                {tests.map(t => (
                  <th key={t.id} className="text-center p-3 font-medium min-w-[90px] whitespace-nowrap">
                    {t.name}<br /><span className="font-normal text-xs text-muted-foreground">{t.unit}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="p-3 font-medium sticky left-0 bg-card">#{p.jersey_number ?? '–'} {p.first_name} {p.last_name}</td>
                  {tests.map(t => {
                    const val = resultMap[p.id]?.[t.id];
                    return (
                      <td key={t.id} className="text-center p-3 font-mono text-sm">
                        {val != null ? val.toFixed(2) : <span className="text-muted-foreground">–</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Averages row */}
              <tr className="border-t bg-secondary/50 font-semibold">
                <td className="p-3 sticky left-0 bg-secondary/50">Team Average</td>
                {teamAvgs.map(a => (
                  <td key={a.name} className="text-center p-3 font-mono text-sm text-primary">
                    {a.avg != null ? a.avg.toFixed(2) : '–'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
