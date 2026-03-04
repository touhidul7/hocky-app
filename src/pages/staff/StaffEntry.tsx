import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ChevronRight, ChevronLeft, Flag, Lock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player { id: string; first_name: string; last_name: string; jersey_number: string | null }
interface Test { id: string; name: string; unit: string; direction: string; min_value: number | null; max_value: number | null }
interface Session { id: string; team_id: string; status: string; session_type: string; date: string; teams?: { name: string } | null }
interface Result { player_id: string; test_id: string; value_best: number | null; flagged: boolean }

export default function StaffEntry() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<Record<string, Record<string, Result>>>({});
  const [mode, setMode] = useState<'station' | 'player'>('station');

  // Station mode state
  const [selectedTest, setSelectedTest] = useState('');
  const [stationPlayerIdx, setStationPlayerIdx] = useState(0);
  const [stationValue, setStationValue] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Player mode state
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [playerValues, setPlayerValues] = useState<Record<string, string>>({});

  // Flag dialog
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagTarget, setFlagTarget] = useState<{ player_id: string; test_id: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const [{ data: s }, { data: p }, { data: t }, { data: r }] = await Promise.all([
      supabase.from('sessions').select('*, teams(name)').eq('id', sessionId).single(),
      supabase.from('sessions').select('team_id').eq('id', sessionId).single().then(async ({ data }) => {
        if (!data) return { data: [] };
        return supabase.from('players').select('id,first_name,last_name,jersey_number').eq('team_id', data.team_id).eq('active', true).order('last_name');
      }),
      supabase.from('tests').select('*').eq('active', true).order('sort_order'),
      supabase.from('results').select('player_id,test_id,value_best,flagged').eq('session_id', sessionId),
    ]);
    setSession(s as Session);
    setPlayers((p as Player[]) ?? []);
    setTests((t as Test[]) ?? []);

    // Build results map
    const map: Record<string, Record<string, Result>> = {};
    for (const res of (r ?? []) as Result[]) {
      if (!map[res.player_id]) map[res.player_id] = {};
      map[res.player_id][res.test_id] = res;
    }
    setResults(map);

    if (t && t.length > 0) setSelectedTest((t as Test[])[0].id);
    if (p && (p as Player[]).length > 0) setSelectedPlayer((p as Player[])[0].id);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode === 'station' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [stationPlayerIdx, selectedTest, mode]);

  const currentStationPlayer = players[stationPlayerIdx];
  const currentTest = tests.find(t => t.id === selectedTest);

  const isOutOfRange = (val: string, test: Test | undefined) => {
    if (!test || !val) return false;
    const n = parseFloat(val);
    if (isNaN(n)) return false;
    if (test.min_value !== null && n < test.min_value) return true;
    if (test.max_value !== null && n > test.max_value) return true;
    return false;
  };

  const saveResult = async (playerId: string, testId: string, value: string, flagged = false, flagReasonStr = '') => {
    if (!value.trim() || !sessionId) return;
    const n = parseFloat(value);
    if (isNaN(n)) { toast({ title: 'Invalid number', variant: 'destructive' }); return; }
    setSaving(true);
    await supabase.from('results').upsert({
      session_id: sessionId,
      player_id: playerId,
      test_id: testId,
      value_best: n,
      entered_by_user_id: user?.id,
      updated_by_user_id: user?.id,
      flagged,
      flag_reason: flagReasonStr || null,
    }, { onConflict: 'session_id,player_id,test_id' });

    // Update local state
    setResults(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [testId]: { player_id: playerId, test_id: testId, value_best: n, flagged } }
    }));
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 600);
    return n;
  };

  const handleStationSave = async () => {
    if (!stationValue.trim() || !currentStationPlayer || !selectedTest) return;
    const test = currentTest;
    const outOfRange = isOutOfRange(stationValue, test);

    if (outOfRange) {
      if (!confirm(`Value ${stationValue} ${test?.unit} is outside the expected range (${test?.min_value}–${test?.max_value}). Save anyway?`)) return;
    }

    await saveResult(currentStationPlayer.id, selectedTest, stationValue);
    setLastSaved(stationValue);
    setStationValue('');

    // Auto-advance
    if (stationPlayerIdx < players.length - 1) {
      setStationPlayerIdx(i => i + 1);
    }
  };

  const handleStationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStationSave();
    if (e.key === 'ArrowUp' && stationPlayerIdx > 0) setStationPlayerIdx(i => i - 1);
    if (e.key === 'ArrowDown' && stationPlayerIdx < players.length - 1) setStationPlayerIdx(i => i + 1);
  };

  const handlePlayerModeSave = async () => {
    for (const [testId, val] of Object.entries(playerValues)) {
      if (val.trim()) await saveResult(selectedPlayer, testId, val);
    }
    setPlayerValues({});
    toast({ title: 'Results saved' });
  };

  const openFlag = (player_id: string, test_id: string) => {
    setFlagTarget({ player_id, test_id });
    setFlagReason('');
    setFlagOpen(true);
  };

  const submitFlag = async () => {
    if (!flagTarget) return;
    await supabase.from('results').update({ flagged: true, flag_reason: flagReason }).eq('session_id', sessionId!).eq('player_id', flagTarget.player_id).eq('test_id', flagTarget.test_id);
    setFlagOpen(false);
    load();
    toast({ title: 'Result flagged' });
  };

  const completeSession = async () => {
    if (!confirm('Mark session as completed? Results will be locked.')) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    await supabase.from('sessions').update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: u?.id }).eq('id', sessionId!);
    toast({ title: 'Session completed and locked!' });
    navigate('/staff');
  };

  if (!session) return <AppShell title="Loading…"><div /></AppShell>;

  const isLocked = session.status === 'completed';
  const resultCount = Object.values(results).reduce((acc, r) => acc + Object.keys(r).length, 0);
  const totalPossible = players.length * tests.length;

  return (
    <AppShell title={`${session.teams?.name} — ${session.session_type}`}>
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Badge variant="outline" className="capitalize">{session.session_type}</Badge>
        <Badge variant="outline">{new Date(session.date).toLocaleDateString()}</Badge>
        <Badge className={isLocked ? 'bg-success/10 text-success border-success/30 border' : 'bg-primary/10 text-primary border-primary/30 border'}>
          {isLocked ? '🔒 Locked' : '● Active'}
        </Badge>
        <div className="ml-auto text-sm text-muted-foreground">{resultCount} / {totalPossible} results entered</div>
        {!isLocked && (
          <Button size="sm" variant="outline" className="text-success border-success/50" onClick={completeSession}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Session
          </Button>
        )}
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-success/10 text-success mb-4 text-sm">
          <Lock className="h-4 w-4" /> This session is completed and locked. Results cannot be edited.
        </div>
      )}

      <Tabs value={mode} onValueChange={v => setMode(v as 'station' | 'player')}>
        <TabsList className="mb-4">
          <TabsTrigger value="station">Station Mode</TabsTrigger>
          <TabsTrigger value="player">Player Mode</TabsTrigger>
          <TabsTrigger value="grid">Results Grid</TabsTrigger>
        </TabsList>

        {/* ===================== STATION MODE ===================== */}
        <TabsContent value="station">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Left — test selector + player list */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Select Test</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {tests.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTest(t.id); setStationPlayerIdx(0); setStationValue(''); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                        selectedTest === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      {t.name} <span className="opacity-60 text-xs ml-1">{t.unit}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Middle — entry */}
            <div className="lg:col-span-2 space-y-4">
              {currentStationPlayer && currentTest && (
                <Card className={cn('transition-colors', savedFlash && 'ring-2 ring-success')}>
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold">
                        #{currentStationPlayer.jersey_number ?? '–'}
                      </div>
                      <div className="text-xl font-semibold mt-1">
                        {currentStationPlayer.first_name} {currentStationPlayer.last_name}
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {stationPlayerIdx + 1} of {players.length} · {currentTest.name}
                      </div>
                    </div>

                    {lastSaved && (
                      <div className="text-center text-sm text-muted-foreground mb-4">
                        Last saved: <strong>{lastSaved} {currentTest.unit}</strong>
                      </div>
                    )}

                    <div className="flex gap-3 items-center justify-center">
                      <Button variant="outline" size="icon" onClick={() => setStationPlayerIdx(i => Math.max(0, i - 1))} disabled={stationPlayerIdx === 0}>
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          type="number"
                          className="text-3xl h-16 w-36 text-center font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          value={stationValue}
                          onChange={e => setStationValue(e.target.value)}
                          onKeyDown={handleStationKeyDown}
                          disabled={isLocked}
                          placeholder="0.00"
                          step="0.01"
                        />
                        {isOutOfRange(stationValue, currentTest) && (
                          <AlertTriangle className="absolute -top-2 -right-2 h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div className="text-lg text-muted-foreground font-medium w-10">{currentTest.unit}</div>
                      <Button variant="outline" size="icon" onClick={() => setStationPlayerIdx(i => Math.min(players.length - 1, i + 1))} disabled={stationPlayerIdx === players.length - 1}>
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>

                    {!isLocked && (
                      <div className="flex gap-3 mt-4 justify-center">
                        <Button onClick={handleStationSave} disabled={saving || !stationValue} className="px-8">
                          {saving ? 'Saving…' : 'Save & Next →'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openFlag(currentStationPlayer.id, selectedTest)}>
                          <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                        </Button>
                      </div>
                    )}

                    <p className="text-center text-xs text-muted-foreground mt-3">Press Enter to save · ↑↓ to navigate players</p>
                  </CardContent>
                </Card>
              )}

              {/* Player queue */}
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {players.map((p, i) => {
                      const saved = results[p.id]?.[selectedTest];
                      return (
                        <button
                          key={p.id}
                          onClick={() => setStationPlayerIdx(i)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-1.5 rounded text-sm transition-colors',
                            i === stationPlayerIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          )}
                        >
                          <span className="font-mono w-6 text-right opacity-60">#{p.jersey_number ?? '–'}</span>
                          <span className="flex-1 text-left">{p.first_name} {p.last_name}</span>
                          {saved?.value_best != null && (
                            <span className="flex items-center gap-1 text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3 text-success" /> {saved.value_best}
                            </span>
                          )}
                          {saved?.flagged && <Flag className="h-3 w-3 text-warning" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ===================== PLAYER MODE ===================== */}
        <TabsContent value="player">
          <div className="grid lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Select Player</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {players.map(p => {
                  const count = Object.keys(results[p.id] ?? {}).length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPlayer(p.id); setPlayerValues({}); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2',
                        selectedPlayer === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <span className="font-mono opacity-60 w-6">#{p.jersey_number ?? '–'}</span>
                      <span className="flex-1">{p.first_name} {p.last_name}</span>
                      {count > 0 && <span className="text-xs opacity-70">{count}/{tests.length}</span>}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              {selectedPlayer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {players.find(p => p.id === selectedPlayer)?.first_name} {players.find(p => p.id === selectedPlayer)?.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tests.map(t => {
                        const existing = results[selectedPlayer]?.[t.id];
                        return (
                          <div key={t.id} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{t.name}</div>
                              <div className="text-xs text-muted-foreground">{t.unit}</div>
                            </div>
                            <Input
                              type="number"
                              className="w-28 text-center"
                              value={playerValues[t.id] ?? existing?.value_best?.toString() ?? ''}
                              onChange={e => setPlayerValues(prev => ({ ...prev, [t.id]: e.target.value }))}
                              disabled={isLocked}
                              step="0.01"
                            />
                            {existing?.flagged && <Flag className="h-4 w-4 text-warning shrink-0" />}
                            {existing?.value_best != null && !playerValues[t.id] && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    {!isLocked && (
                      <Button className="w-full mt-4" onClick={handlePlayerModeSave}>Save All Results</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===================== RESULTS GRID ===================== */}
        <TabsContent value="grid">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 min-w-[140px]">Player</th>
                    {tests.map(t => (
                      <th key={t.id} className="text-center p-3 font-medium min-w-[80px] whitespace-nowrap">
                        {t.name}<br /><span className="font-normal text-xs text-muted-foreground">{t.unit}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className={cn('border-b', i % 2 === 0 ? '' : 'bg-muted/20')}>
                      <td className="p-3 font-medium sticky left-0 bg-card">
                        <div>#{p.jersey_number ?? '–'} {p.first_name} {p.last_name}</div>
                      </td>
                      {tests.map(t => {
                        const r = results[p.id]?.[t.id];
                        return (
                          <td key={t.id} className="text-center p-3">
                            {r?.value_best != null ? (
                              <span className={cn('font-mono', r.flagged && 'text-warning')}>
                                {r.value_best}
                                {r.flagged && ' ⚑'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flag dialog */}
      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Flag Result</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Reason (injury, retest needed, etc.)"
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
            />
            <Button onClick={submitFlag} className="w-full">Flag Result</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
