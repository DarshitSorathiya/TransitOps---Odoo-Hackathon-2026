'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      {/* Background Decorative Gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-background to-background" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass max-w-md w-full rounded-2xl p-8 text-center shadow-xl border border-border/40 bg-card/60 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
          <Lock className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2 font-sans bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/75">
          Access Forbidden
        </h1>

        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Your account does not possess the enterprise security roles required to view this section of the platform. Please contact your Fleet Admin if you believe this is an error.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
