import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, ClipboardList, Beaker,
  Calendar, LogOut, Menu, X, ChevronRight, Trophy, UserCheck
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/admin/organizations', label: 'Organizations', icon: <Building2 className="h-4 w-4" /> },
    { href: '/admin/teams', label: 'Teams', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/sessions', label: 'Sessions', icon: <Calendar className="h-4 w-4" /> },
    { href: '/admin/tests', label: 'Tests', icon: <Beaker className="h-4 w-4" /> },
    { href: '/admin/users', label: 'Users', icon: <UserCheck className="h-4 w-4" /> },
  ],
  staff: [
    { href: '/staff', label: 'Today\'s Sessions', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/staff/sessions', label: 'All Sessions', icon: <Calendar className="h-4 w-4" /> },
  ],
  coach: [
    { href: '/coach', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/coach/roster', label: 'Roster', icon: <Users className="h-4 w-4" /> },
    { href: '/coach/analytics', label: 'Analytics', icon: <Trophy className="h-4 w-4" /> },
    { href: '/coach/reports', label: 'Reports', icon: <ClipboardList className="h-4 w-4" /> },
  ],
  player: [
    { href: '/parent', label: 'My Teams', icon: <Users className="h-4 w-4" /> },
  ],
};

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const { role, user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = navByRole[role ?? ''] ?? [];

  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : '';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background flex flex-col transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:relative lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-sidebar-primary-foreground">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <div className="text-sidebar-primary-foreground font-bold text-sm leading-none">IceMetrics</div>
            <div className="text-sidebar-foreground text-xs mt-0.5">{roleLabel} Portal</div>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.href ||
              (item.href !== '/admin' && item.href !== '/staff' && item.href !== '/coach' && item.href !== '/parent' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                {item.label}
                {active && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground text-sm font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sidebar-foreground text-xs truncate">{user?.email}</div>
              <div className="text-sidebar-primary text-xs font-medium">{roleLabel}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center gap-4 shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          {title && <h1 className="text-base font-semibold">{title}</h1>}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
