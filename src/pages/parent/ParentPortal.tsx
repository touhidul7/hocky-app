import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Award } from 'lucide-react';

interface ProgressRow {
  player_id: string; test_name: string; unit: string; direction: string;
  session_date: string; session_type: string; value_best: number; session_id: string;
}

export default function ParentPortal() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Array<{ id: string; first_name: string; last_name: string; jersey_number: string | null; teams?: { name: string } | null }>>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [tests, setTests] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState('');

  useEffect(() => {
    supabase.from('parent_player_links')
      .select('player_id, players(id, first_name, last_name, jersey_number, teams(name))')
      .eq('user_id', user!.id)
      .then(({ data }) => {
        const ps = (data ?? []).map((d: any) => d.players).filter(Boolean);
        setPlayers(ps);
        if (ps.length > 0) setSelectedPlayer(ps[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedPlayer) return;
    supabase.from('player_progress_view')
      .select('*')
      .eq('player_id', selectedPlayer)
      .order('session_date')
      .then(({ data }) => {
        const rows = (data ?? []) as ProgressRow[];
        setProgress(rows);
        const uniqueTests = [...new Set(rows.map(r => r.test_name))];
        setTests(uniqueTests);
        if (uniqueTests.length > 0) setSelectedTest(uniqueTests[0]);
      });
  }, [selectedPlayer]);

  const selectedPlayerObj = players.find(p => p.id === selectedPlayer);
  const chartData = progress
    .filter(r => r.test_name === selectedTest)
    .map(r => ({
      date: new Date(r.session_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      value: r.value_best,
      type: r.session_type,
    }));

  const latestResults = tests.map(testName => {
    const rows = progress.filter(r => r.test_name === testName);
    const latest = rows[rows.length - 1];
    const first = rows[0];
    return {
      testName,
      unit: latest?.unit,
      latest: latest?.value_best,
      direction: latest?.direction,
      change: first && latest && first !== latest
        ? ((latest.value_best - first.value_best) / (Math.abs(first.value_best) || 1)) * 100
        : null,
    };
  });

  return (
    <AppShell title="My Player">
      {players.length > 1 && (
        <div className="mb-4">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {selectedPlayerObj && (
        <div className="mb-6">
          <h2 className="text-xl font-bold">{selectedPlayerObj.first_name} {selectedPlayerObj.last_name}</h2>
          <p className="text-muted-foreground text-sm">#{selectedPlayerObj.jersey_number ?? '–'} · {selectedPlayerObj.teams?.name}</p>
        </div>
      )}

      {/* Latest scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {latestResults.map(r => (
          <Card key={r.testName}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1 truncate">{r.testName}</div>
              <div className="text-2xl font-bold">{r.latest ?? '–'}</div>
              <div className="text-xs text-muted-foreground">{r.unit}</div>
              {r.change !== null && (
                <div className={`text-xs mt-1 font-medium ${
                  (r.direction === 'higher_better' && r.change > 0) || (r.direction === 'lower_better' && r.change < 0)
                    ? 'text-success' : 'text-destructive'
                }`}>
                  {r.change > 0 ? '+' : ''}{r.change.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress chart */}
      {chartData.length > 1 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Progress Over Time</CardTitle>
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{tests.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* All results table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Session History</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Session</th>
                <th className="text-left p-3 font-medium">Test</th>
                <th className="text-right p-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {progress.slice().reverse().map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="p-3 text-muted-foreground">{new Date(r.session_date).toLocaleDateString()}</td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{r.session_type}</Badge></td>
                  <td className="p-3">{r.test_name}</td>
                  <td className="p-3 text-right font-mono font-medium">{r.value_best} {r.unit}</td>
                </tr>
              ))}
              {progress.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-8">No results yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
