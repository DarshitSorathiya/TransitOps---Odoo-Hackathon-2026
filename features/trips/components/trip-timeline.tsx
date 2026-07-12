import { TripStatus } from '@prisma/client';
import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TripTimelineProps {
  status: TripStatus;
  plannedDeparture: string | Date;
  plannedArrival: string | Date;
  actualDeparture?: string | Date | null;
  actualArrival?: string | Date | null;
}

export function TripTimeline({
  status,
  // plannedDeparture and plannedArrival reserved for future date display
  actualDeparture,
  actualArrival,
}: TripTimelineProps) {
  const steps = [
    {
      id: 'DRAFT',
      title: 'Draft Created',
      desc: 'Trip itinerary planned and driver scheduled.',
      icon: Clock,
      completed: true,
      active: status === TripStatus.DRAFT,
      date: null,
    },
    {
      id: 'DISPATCHED',
      title: 'Dispatched & Active',
      desc: 'Vehicle departed origin location. Transit in progress.',
      icon: PlayCircle,
      completed: status === TripStatus.DISPATCHED || status === TripStatus.COMPLETED,
      active: status === TripStatus.DISPATCHED,
      date: actualDeparture ? new Date(actualDeparture) : null,
    },
    {
      id: 'CLOSED',
      title: status === TripStatus.CANCELLED ? 'Cancelled' : 'Completed',
      desc: status === TripStatus.CANCELLED 
        ? 'Trip operation aborted. Vehicle and driver released.'
        : 'Cargo delivered safely. Vehicle mileage logged.',
      icon: status === TripStatus.CANCELLED ? XCircle : CheckCircle2,
      completed: status === TripStatus.COMPLETED || status === TripStatus.CANCELLED,
      active: status === TripStatus.COMPLETED || status === TripStatus.CANCELLED,
      date: actualArrival ? new Date(actualArrival) : null,
    },
  ];

  return (
    <div className="relative pl-6 border-l border-border/60 ml-4 space-y-8 py-2">
      {steps.map((step) => {
        const IconComponent = step.icon;
        return (
          <div key={step.id} className="relative">
            {/* Timeline Dot */}
            <span
              className={`absolute -left-[35px] top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background transition-all ${
                step.active
                  ? 'border-indigo-500 text-indigo-500 shadow-md shadow-indigo-500/10'
                  : step.completed
                  ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                  : 'border-muted-foreground/30 text-muted-foreground/50'
              }`}
            >
              <IconComponent className="h-3.5 w-3.5" />
            </span>

            {/* Timeline Content */}
            <div className={`transition-opacity ${step.completed || step.active ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                {step.date && (
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                    {format(step.date, 'MMM dd, yyyy HH:mm')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
