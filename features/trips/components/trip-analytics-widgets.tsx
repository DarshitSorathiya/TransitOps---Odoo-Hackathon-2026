import { motion } from 'framer-motion';
import { Truck, CheckCircle2, XCircle, Navigation, Users } from 'lucide-react';

interface TripStats {
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalDistance: number;
  vehiclesOnTrip: number;
  driversOnTrip: number;
}

interface TripAnalyticsWidgetsProps {
  stats: TripStats;
}

export function TripAnalyticsWidgets({ stats }: TripAnalyticsWidgetsProps) {
  const cards = [
    {
      label: 'Active Trips',
      value: stats.activeTrips,
      icon: Truck,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25',
      desc: 'Trips currently in transit',
    },
    {
      label: 'Completed Trips',
      value: stats.completedTrips,
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
      desc: 'Safely closed itineraries',
    },
    {
      label: 'Cancelled Trips',
      value: stats.cancelledTrips,
      icon: XCircle,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/25',
      desc: 'Aborted routing plans',
    },
    {
      label: 'Distance Travelled',
      value: `${stats.totalDistance.toLocaleString()} km`,
      icon: Navigation,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/25',
      desc: 'Cumulative odometer logs',
    },
    {
      label: 'Vehicles On Trip',
      value: stats.vehiclesOnTrip,
      icon: Truck,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
      desc: 'Vehicles locked in transit',
    },
    {
      label: 'Drivers On Trip',
      value: stats.driversOnTrip,
      icon: Users,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/25',
      desc: 'Operators in driver seat',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className="glass rounded-xl p-4 border border-border/40 bg-card/40 backdrop-blur-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                {card.label}
              </span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${card.color}`}>
                <IconComponent className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xl font-extrabold tracking-tight block truncate">
                {card.value}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 block truncate">
                {card.desc}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
