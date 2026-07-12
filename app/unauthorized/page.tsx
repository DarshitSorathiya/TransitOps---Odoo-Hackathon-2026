'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
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
          <ShieldAlert className="h-8 w-8 animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2 font-sans bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/75">
          Access Unauthorized
        </h1>

        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          You need to sign in to access this page. Please log in using valid enterprise credentials to authenticate.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]"
          >
            Go to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
