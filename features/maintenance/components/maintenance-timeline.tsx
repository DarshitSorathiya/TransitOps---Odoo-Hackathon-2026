import { MaintenanceStatus } from '@prisma/client';
import { CheckCircle2, Clock, PlayCircle, XCircle, CheckCircle } from 'lucide-react';

interface MaintenanceTimelineProps {
  status: MaintenanceStatus;
  startDate: string | Date;
  endDate?: string | Date | null;
}

export function MaintenanceTimeline({ status, startDate, endDate }: MaintenanceTimelineProps) {
  const steps = [
    {
      id: 'PENDING',
      title: 'Request Logged',
      desc: 'Issue flagged. Pending manager validation and review.',
      icon: Clock,
      completed: true,
      active: status === MaintenanceStatus.PENDING,
      date: null,
    },
    {
      id: 'APPROVED',
      title: 'Approved',
      desc: 'Request validated. Maintenance schedule cleared.',
      icon: CheckCircle,
      completed: status !== MaintenanceStatus.PENDING,
      active: status === MaintenanceStatus.APPROVED,
      date: null,
    },
    {
      id: 'IN_PROGRESS',
      title: 'In Progress (In Shop)',
      desc: 'Vehicle moved in shop. Repair operations active.',
      icon: PlayCircle,
      completed: status === MaintenanceStatus.IN_PROGRESS || status === MaintenanceStatus.COMPLETED,
      active: status === MaintenanceStatus.IN_PROGRESS,
      date: status !== MaintenanceStatus.PENDING && status !== MaintenanceStatus.APPROVED ? new Date(startDate) : null,
    },
    {
      id: 'CLOSED',
      title: status === MaintenanceStatus.CANCELLED ? 'Cancelled' : 'Completed',
      desc: status === MaintenanceStatus.CANCELLED
        ? 'Service aborted. Vehicle released back to dispatch pool.'
        : 'Repair complete. Odometer logs synced, vehicle released.',
      icon: status === MaintenanceStatus.CANCELLED ? XCircle : CheckCircle2,
      completed: status === MaintenanceStatus.COMPLETED || status === MaintenanceStatus.CANCELLED,
      active: status === MaintenanceStatus.COMPLETED || status === MaintenanceStatus.CANCELLED,
      date: endDate ? new Date(endDate) : null,
    },
  ];

  return (
    <div className="relative pl-6 border-l border-border/60 ml-4 space-y-8 py-2 text-foreground">
      {steps.map((step) => {
        const IconComponent = step.icon;
        return (
          <div key={step.id} className="relative">
            {/* Timeline Dot */}
            <span
              className={`absolute -left-[35px] top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background transition-all ${
                step.active
                  ? 'border-indigo-500 text-indigo-400 ring-4 ring-indigo-500/10'
                  : step.completed
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-border text-muted-foreground'
              }`}
            >
              <IconComponent className="h-3 w-3 shrink-0" />
            </span>

            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-xs font-bold ${step.active ? 'text-indigo-400' : 'text-foreground'}`}>
                  {step.title}
                </h4>
                {step.date && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {step.date.toLocaleDateString()} {step.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm leading-relaxed">{step.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
