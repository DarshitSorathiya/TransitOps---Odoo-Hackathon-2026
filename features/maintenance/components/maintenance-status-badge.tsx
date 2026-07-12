import { MaintenanceStatus } from '@prisma/client';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
}

export function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps) {
  const styles: Record<MaintenanceStatus, string> = {
    PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    APPROVED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const labels: Record<MaintenanceStatus, string> = {
    PENDING: 'Pending Approval',
    APPROVED: 'Approved',
    IN_PROGRESS: 'In Shop',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
