'use client';

import { motion } from 'framer-motion';
import { Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FuelComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-foreground p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-border/40 bg-card/25 backdrop-blur-xl p-8 text-center shadow-xl space-y-6"
      >
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Zap className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Fuel Log Analytics</h1>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono block">
            Phase 6 • Scheduled Release
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Log gas refills, calculate MPG efficiency, and track fuel cost anomalies across fleet routes.
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
            <span>Development Status</span>
            <span>Planning & Modeling</span>
          </div>
          <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '25%' }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-indigo-500 rounded-full"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border/20">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 text-xs transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Operations
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
