'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Users, Navigation, LogOut, ChevronLeft, ChevronRight, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Vehicle Registry', href: '/vehicles', icon: Truck },
    { name: 'Driver Profiles', href: '/drivers', icon: Users },
    { name: 'Trips Dispatch', href: '/trips', icon: Navigation },
  ];

  const user = session?.user;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 1. Sidebar Navigation (Desktop) */}
      <motion.aside
        animate={{ width: isCollapsed ? '70px' : '260px' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col border-r border-border/40 bg-card/25 backdrop-blur-xl h-full relative shrink-0"
      >
        {/* Branding header */}
        <div className="h-16 flex items-center px-4 border-b border-border/40 gap-2 overflow-hidden justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-sm tracking-tight text-foreground whitespace-nowrap">TransitOps</span>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md border border-border/60 hover:bg-muted text-muted-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all relative ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400 font-bold shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                {isActive && !isCollapsed && (
                  <motion.span
                    layoutId="active-indicator"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Session profile and signout */}
        <div className="p-3 border-t border-border/40 space-y-2">
          {user && !isCollapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 border border-border/40">
              <div className="h-8 w-8 rounded-full bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400">
                {user.name ? user.name[0] : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-foreground">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.roles?.join(', ')}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* 2. Mobile Nav Trigger */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[260px] bg-card border-r border-border h-full flex flex-col p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-extrabold text-lg tracking-tight">TransitOps</span>
                <button onClick={() => setIsMobileOpen(false)} className="p-1 border rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold border ${
                        isActive
                          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                          : 'border-transparent text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/5 transition-all w-full mt-auto"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log Out</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Responsive Header */}
        <header className="h-16 border-b border-border/40 bg-card/10 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 rounded-md border border-border/60 hover:bg-muted md:hidden text-muted-foreground"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-muted-foreground md:inline hidden font-mono">
              TransitOps Operations
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground transition-all"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="h-4 w-4 hidden dark:block" />
            </button>

            {user && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-[11px] font-bold text-foreground block">{user.name}</span>
                  <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider block">
                    {user.roles?.join(', ')}
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-400 shadow-sm">
                  {user.name ? user.name[0] : 'U'}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-background/40">
          {children}
        </main>
      </div>
    </div>
  );
}
