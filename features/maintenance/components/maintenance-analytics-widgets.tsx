import { motion } from 'framer-motion';
import { Wrench, CheckCircle2, AlertOctagon, DollarSign, Calendar } from 'lucide-react';

interface MaintenanceStats {
  vehiclesInMaintenance: number;
  pendingRequests: number;
  completedToday: number;
  avgCost: number;
  upcomingCount: number;
}

interface MaintenanceAnalyticsWidgetsProps {
  stats: MaintenanceStats;
}

export function MaintenanceAnalyticsWidgets({ stats }: MaintenanceAnalyticsWidgetsProps) {
  const cards = [
    {
      label: 'Vehicles In Shop',
      value: stats.vehiclesInMaintenance,
      icon: Wrench,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      desc: 'Active maintenance logs',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      icon: AlertOctagon,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      desc: 'Awaiting manager approval',
    },
    {
      label: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      desc: 'Vehicles released today',
    },
    {
      label: 'Avg Service Cost',
      value: `$${stats.avgCost.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      desc: 'Average repair cost',
    },
    {
      label: 'Upcoming Service',
      value: stats.upcomingCount,
      icon: Calendar,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      desc: 'Approved schedules',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="rounded-xl border border-border/40 p-4 bg-card/25 backdrop-blur-md flex flex-col justify-between h-32 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-2 rounded-lg border ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-2xl font-extrabold tracking-tight">{card.value}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.desc}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
