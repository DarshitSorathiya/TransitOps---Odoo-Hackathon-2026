import { TripStatus } from '@prisma/client';

interface TripStatusBadgeProps {
  status: TripStatus;
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  const styles = {
    [TripStatus.DRAFT]: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    [TripStatus.DISPATCHED]: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    [TripStatus.COMPLETED]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    [TripStatus.CANCELLED]: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const labels = {
    [TripStatus.DRAFT]: 'Draft',
    [TripStatus.DISPATCHED]: 'Dispatched',
    [TripStatus.COMPLETED]: 'Completed',
    [TripStatus.CANCELLED]: 'Cancelled',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
