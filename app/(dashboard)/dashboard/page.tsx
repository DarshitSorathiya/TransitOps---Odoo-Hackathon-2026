'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Truck, Users, Navigation, Wrench, Sparkles, ArrowRight, Activity, Zap, CreditCard, BarChart2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CentralDashboard() {
  const { data: session } = useSession();
  const user = session?.user;

  // Fetch counts in parallel from endpoints
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['dashboard-vehicles'],
    queryFn: () => fetch('/api/vehicles?limit=1').then((res) => res.json()),
  });

  const { data: driversData, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['dashboard-drivers'],
    queryFn: () => fetch('/api/drivers?limit=1').then((res) => res.json()),
  });

  const { data: tripsData, isLoading: isLoadingTrips } = useQuery({
    queryKey: ['dashboard-trips'],
    queryFn: () => fetch('/api/trips?limit=1').then((res) => res.json()),
  });

  const { data: maintenanceData, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ['dashboard-maintenance'],
    queryFn: () => fetch('/api/maintenance?limit=1').then((res) => res.json()),
  });

  const stats = {
    vehicles: vehiclesData?.pagination?.total || 0,
    drivers: driversData?.pagination?.total || 0,
    activeTrips: tripsData?.stats?.activeTrips || 0,
    completedTrips: tripsData?.stats?.completedTrips || 0,
    inShop: maintenanceData?.stats?.vehiclesInMaintenance || 0,
    pendingMaintenance: maintenanceData?.stats?.pendingRequests || 0,
  };

  const modules = [
    {
      title: 'Vehicle Registry',
      desc: 'Manage and monitor vehicle statuses, specifications, and vin tracking.',
      href: '/vehicles',
      icon: Truck,
      count: stats.vehicles,
      color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
      badge: 'Active Registry',
    },
    {
      title: 'Driver Profiles',
      desc: 'Verify commercial licenses, phone records, and safety points.',
      href: '/drivers',
      icon: Users,
      count: stats.drivers,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      badge: 'Monitored',
    },
    {
      title: 'Trips Dispatch',
      desc: 'Schedule shipping itineraries, dispatch vehicles, and track actual mileages.',
      href: '/trips',
      icon: Navigation,
      count: stats.activeTrips,
      countLabel: 'Active',
      color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      badge: 'Live Operations',
    },
    {
      title: 'Maintenance Dispatch',
      desc: 'Log breakdowns, assign mechanics, and track repair estimations in the shop.',
      href: '/maintenance',
      icon: Wrench,
      count: stats.inShop,
      countLabel: 'In Shop',
      color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
      badge: 'Repair Shop',
    },
  ];

  const comingSoonModules = [
    {
      title: 'Fuel Optimization',
      desc: 'Log gas refills, calculate MPG efficiency, and track fuel cost anomalies.',
      icon: Zap,
      badge: 'Phase 6 Integration',
    },
    {
      title: 'Expense Audit Workflow',
      desc: 'Reimburse tolls, meals, and emergency repairs with manager approval workflows.',
      icon: CreditCard,
      badge: 'Phase 7 Integration',
    },
    {
      title: 'Advanced Fleet Analytics',
      desc: 'Generate carbon offset estimates, runtime utilization reports, and financial summaries.',
      icon: BarChart2,
      badge: 'Phase 8 Integration',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-foreground min-h-screen">
      
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-indigo-500/5 p-8 overflow-hidden shadow-xl glowing-card">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-[11px] uppercase font-bold tracking-widest text-indigo-400 font-mono">Operations Control Panel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, <span className="gradient-text-indigo">{user?.name || 'Dispatcher'}</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed font-medium">
              Monitor active transit routes, verify compliance milestones, and dispatch drivers to shop schedules.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-600/10 px-4 py-2 rounded-xl text-indigo-300 font-mono text-[11px] uppercase font-bold shadow-sm">
            <Activity className="h-4 w-4 animate-pulse text-indigo-400" />
            Live Database Connected
          </div>
        </div>
      </div>

      {/* Active Operations Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-widest block pl-1">Active Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.15 } }}
                className="rounded-2xl p-6 flex flex-col justify-between h-52 glass-premium shadow-md relative group hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded">
                      {mod.badge}
                    </span>
                    <div className={`p-2.5 rounded-xl ${mod.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-4 group-hover:text-indigo-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2 font-medium">
                    {mod.desc}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-muted/20">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold tracking-tight text-foreground font-mono">
                      {isLoadingVehicles || isLoadingDrivers || isLoadingTrips || isLoadingMaintenance ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : (
                        mod.count
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {mod.countLabel || 'Total'}
                    </span>
                  </div>

                  <Link
                    href={mod.href}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
                  >
                    Manage
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon / Roadmap Section */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-widest block pl-1">Upcoming Extensions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comingSoonModules.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: (idx + 4) * 0.05 }}
                whileHover={{ y: -2 }}
                className="rounded-2xl bg-card/45 p-6 flex flex-col justify-between h-44 opacity-80 hover:opacity-95 transition-all shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">
                      {item.badge}
                    </span>
                    <Icon className="h-4.5 w-4.5 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-3">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
                <div className="text-[11px] text-indigo-400/60 font-semibold tracking-wider uppercase font-mono">
                  🛠 Under Construction
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
