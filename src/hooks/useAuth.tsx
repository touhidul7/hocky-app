import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'staff' | 'coach' | 'player' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  
  // Track in-flight role fetch to prevent concurrent requests
  let rolesFetchAbort: AbortController | null = null;
  let rolesFetchInProgress = false;
  let cachedRole: AppRole | undefined = undefined;

  const fetchRole = async (userId: string): Promise<AppRole> => {
    // Return cached role if available
    if (cachedRole !== undefined) {
      console.log('✓ Returning cached role:', cachedRole);
      return cachedRole;
    }

    // Prevent concurrent fetches
    if (rolesFetchInProgress) {
      console.log('Role fetch already in progress, waiting...');
      return null;
    }

    rolesFetchInProgress = true;

    try {
      console.log('Fetching role for userId:', userId);
      
      // Cancel previous in-flight request if any
      if (rolesFetchAbort) {
        console.log('Cancelling previous fetchRole request');
        rolesFetchAbort.abort();
      }
      
      rolesFetchAbort = new AbortController();
      const signal = rolesFetchAbort.signal;

      // Create a promise that rejects after 30 seconds
      // This is a longer timeout because RLS policy evaluation can be slow
      const timeoutPromise = new Promise<AppRole>((_, reject) =>
        setTimeout(() => reject(new Error('Role fetch timeout after 30s')), 30000)
      );

      // Race the Supabase query against the timeout
      const queryPromise = (async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        // Check if request was aborted
        if (signal.aborted) {
          console.log('Role fetch was cancelled');
          return null;
        }

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows found - this is normal for new users
            console.log('✓ No role found for user - awaiting admin assignment');
            return null;
          }
          // Log detailed error info
          console.error('✗ Supabase error fetching role:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            status: error.status,
          });
          return null;
        }

        const fetchedRole = data?.role ?? null;
        console.log('✓ Role fetched successfully:', fetchedRole);
        return fetchedRole;
      })();

      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      // Cache the successful result
      cachedRole = result;
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // Don't log abort errors - they're expected
      if (errorMsg.includes('cancelled')) {
        return null;
      }
      
      console.error('✗ Exception in fetchRole:', errorMsg);
      
      // Check if it's a timeout
      if (errorMsg.includes('timeout')) {
        console.error('✗ TIMEOUT: Supabase query took too long. Keeping existing role.');
        // Return existing role instead of null
        return role;
      }
      
      return null;
    } finally {
      rolesFetchInProgress = false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const initialize = async () => {
      try {
        console.log('AuthProvider: Initializing...');
        
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthProvider: Error getting session:', sessionError);
        }

        if (!isMounted) {
          console.log('AuthProvider: Component unmounted, skipping initialization');
          return;
        }

        console.log('AuthProvider: Initial session user:', initialSession?.user?.email);
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Don't fetch role here - let onAuthStateChange handle it
        // This prevents duplicate concurrent requests
        
        // Set loading to false - auth state change will update role
        if (isMounted) {
          console.log('AuthProvider: Setting loading to false (role will update via subscription)');
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthProvider: Error during initialization:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Subscribe to auth state changes
    const unsubscribe = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed, event:', event, 'user:', session?.user?.email ?? 'NO_USER');
      
      if (!isMounted) {
        console.log('AuthProvider: onAuthStateChange fired but component unmounted, skipping');
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Only fetch role on SIGNED_IN and INITIAL_SESSION events
      // Don't fetch on other events to avoid race conditions
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          console.log('AuthProvider: onAuthStateChange - fetching role for user:', session.user.id);
          const fetchedRole = await fetchRole(session.user.id);
          if (isMounted) {
            console.log('AuthProvider: onAuthStateChange - setting role:', fetchedRole);
            setRole(fetchedRole);
          } else {
            console.log('AuthProvider: onAuthStateChange - component unmounted, not updating role');
          }
        } else {
          console.log('AuthProvider: onAuthStateChange - no user, setting role to null');
          if (isMounted) {
            setRole(null);
          }
        }
      } else {
        console.log('AuthProvider: Skipping role fetch for event:', event);
      }
    });

    authSubscription = unsubscribe;

    return () => {
      isMounted = false;
      // Cancel any in-flight role fetch requests
      if (rolesFetchAbort) {
        console.log('AuthProvider: Cleanup - cancelling in-flight role fetch');
        rolesFetchAbort.abort();
      }
      // Clear cache on unmount
      cachedRole = undefined;
      authSubscription?.();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear cached role on sign out
      cachedRole = undefined;
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
