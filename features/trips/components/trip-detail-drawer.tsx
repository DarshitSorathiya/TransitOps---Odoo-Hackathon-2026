import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTripDetails, useTrips } from '../hooks/useTrips';
import { TripStatusBadge } from './trip-status-badge';
import { TripTimeline } from './trip-timeline';
import { X, MapPin, Truck, User, FileText, CheckCircle2, XCircle, Play, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripTransitionSchema, TripTransitionValues } from '@/types/trip';
import { TripStatus } from '@prisma/client';
import { toast } from 'sonner';


interface TripDetailDrawerProps {
  tripId: string | null;
  onClose: () => void;
  userRoles: string[];
}

export function TripDetailDrawer({ tripId, onClose, userRoles }: TripDetailDrawerProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const queryClient = useQueryClient();
  const { data: trip, isLoading } = useTripDetails(tripId);
  const { transitionMutation, deleteMutation } = useTrips({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    archived: false,
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionAction, setTransitionAction] = useState<'DISPATCH' | 'COMPLETE' | 'CANCEL' | null>(null);

  // Form setup for Completion
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TripTransitionValues>({
    resolver: zodResolver(tripTransitionSchema),
    defaultValues: {
      action: 'COMPLETE',
      actualArrival: new Date().toISOString().split('T')[0] as unknown as Date,
      actualDistance: 0,
      endOdometer: 0,
      notes: '',
    },
  });

  if (!tripId) return null;

  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('FLEET_MANAGER');

  const handleOpenTransition = (action: 'DISPATCH' | 'COMPLETE' | 'CANCEL') => {
    setTransitionAction(action);
    setIsTransitioning(true);
    reset({
      action,
      actualArrival: new Date().toISOString().split('T')[0] as unknown as Date,
      actualDistance: trip ? Math.ceil(trip.plannedDistance) : 0,
      endOdometer: trip ? Math.ceil(trip.vehicle.odometer + trip.plannedDistance) : 0,
      notes: '',
    });
  };

  const handleConfirmTransition = (formData: TripTransitionValues) => {
    if (!trip) return;
    const payload = {
      action: transitionAction!,
      notes: formData.notes,
      ...(transitionAction === 'COMPLETE' && {
        actualArrival: new Date(formData.actualArrival ?? new Date()),
        actualDistance: Number(formData.actualDistance ?? 0),
        endOdometer: Number(formData.endOdometer ?? 0),
      }),
    };

    const loadingId = toast.loading(`Executing trip transition to ${transitionAction}...`);

    transitionMutation.mutate(
      { id: trip.id, values: payload },
      {
        onSuccess: () => {
          toast.success(`Trip transitioned successfully!`, { id: loadingId });
          setIsTransitioning(false);
          setTransitionAction(null);
          queryClient.invalidateQueries({ queryKey: ['trip', trip.id] });
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Transition failed.', { id: loadingId });
        },
      }
    );
  };

  const handleDeleteTrip = () => {
    if (!trip) return;
    if (!confirm('Are you sure you want to delete this trip? This action soft deletes the record.')) return;

    const loadingId = toast.loading('Deleting trip...');
    deleteMutation.mutate(trip.id, {
      onSuccess: () => {
        toast.success('Trip deleted successfully.', { id: loadingId });
        onClose();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Deletion failed.', { id: loadingId });
      },
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card/90 backdrop-blur-xl border-l border-border/40 shadow-2xl z-50 overflow-y-auto flex flex-col h-full text-foreground">
      {/* Drawer Header */}
      <div className="p-6 border-b border-border/40 flex items-center justify-between">
        <div>
          {isLoading ? (
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono">{trip?.tripNumber}</span>
              {trip && <TripStatusBadge status={trip.status} />}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">Full routing overview & lifecycle dispatch actions</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg border border-border/60 hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 p-6 space-y-6 animate-pulse">
          <div className="h-10 bg-muted rounded w-full" />
          <div className="h-40 bg-muted rounded w-full" />
          <div className="h-28 bg-muted rounded w-full" />
        </div>
      ) : !trip ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
          <FileText className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">Failed to retrieve trip details.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Main Info Body */}
          <div className="p-6 space-y-6 flex-1">
            {/* Origin & Destination */}
            <div className="glass rounded-xl p-4 border border-border/40 bg-card/30 space-y-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Origin Station</span>
                  <p className="text-sm font-semibold mt-0.5">{trip.startLocation}</p>
                </div>
              </div>
              <div className="h-px bg-border/40" />
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Destination Hub</span>
                  <p className="text-sm font-semibold mt-0.5">{trip.endLocation}</p>
                </div>
              </div>
            </div>

            {/* Vehicle & Driver Assos */}
            <div className="grid grid-cols-2 gap-4">
              {/* Vehicle */}
              <div className="glass rounded-xl p-4 border border-border/40 bg-card/30">
                <div className="flex items-center gap-2 text-indigo-500 mb-2">
                  <Truck className="h-4 w-4" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Vehicle</span>
                </div>
                <p className="text-sm font-bold truncate">{trip.vehicle.make} {trip.vehicle.model}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{trip.vehicle.licensePlate}</p>
                <div className="mt-3 text-[10px] text-muted-foreground">
                  <p>Odometer: <span className="font-semibold text-foreground font-mono">{trip.vehicle.odometer.toLocaleString()} km</span></p>
                  <p>Payload Max: <span className="font-semibold text-foreground">{(trip.vehicle.payloadCapacity).toLocaleString()} kg</span></p>
                </div>
              </div>

              {/* Driver */}
              <div className="glass rounded-xl p-4 border border-border/40 bg-card/30">
                <div className="flex items-center gap-2 text-indigo-500 mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Driver</span>
                </div>
                <p className="text-sm font-bold truncate">{trip.driver.user?.name || `Driver CDL`}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{trip.driver.licenseNumber}</p>
                <div className="mt-3 text-[10px] text-muted-foreground">
                  <p>Safety Score: <span className="font-semibold text-emerald-500 font-mono">{trip.driver.safetyScore.toFixed(1)}/100</span></p>
                  <p>CDL Class: <span className="font-semibold text-foreground">{trip.driver.licenseClass}</span></p>
                </div>
              </div>
            </div>

            {/* Cargo & Distance Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border border-border/40 rounded-lg p-2.5 bg-muted/20">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Cargo Payload</span>
                <span className="text-sm font-bold mt-1 block font-mono">{trip.cargoWeight.toLocaleString()} kg</span>
              </div>
              <div className="border border-border/40 rounded-lg p-2.5 bg-muted/20">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Planned Dist.</span>
                <span className="text-sm font-bold mt-1 block font-mono">{trip.plannedDistance.toLocaleString()} km</span>
              </div>
              <div className="border border-border/40 rounded-lg p-2.5 bg-muted/20">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Actual Dist.</span>
                <span className="text-sm font-bold mt-1 block font-mono">
                  {trip.actualDistance !== null ? `${trip.actualDistance.toLocaleString()} km` : '--'}
                </span>
              </div>
            </div>

            {/* Timeline Graphic */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Lifecycle Timeline</span>
              <TripTimeline
                status={trip.status}
                plannedDeparture={trip.plannedDeparture}
                plannedArrival={trip.plannedArrival}
                actualDeparture={trip.actualDeparture}
                actualArrival={trip.actualArrival}
              />
            </div>

            {/* Notes Section */}
            {trip.notes && (
              <div className="border border-border/40 rounded-lg p-3 bg-muted/20 text-xs">
                <span className="font-semibold text-muted-foreground uppercase block mb-1">Itinerary Dispatch Notes</span>
                <p className="text-muted-foreground leading-relaxed italic">&ldquo;{trip.notes}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Drawer Actions Footer */}
          <div className="p-6 border-t border-border/40 bg-muted/20 space-y-4">
            <AnimatePresence mode="wait">
              {isTransitioning ? (
                <motion.div
                  key="transition-form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4"
                >
                  <div className="bg-background/90 p-4 rounded-xl border border-border/60 shadow-lg">
                    <h5 className="text-sm font-bold flex items-center gap-1.5 text-indigo-500 mb-3">
                      <Sparkles className="h-4 w-4" />
                      Configure {transitionAction === 'DISPATCH' ? 'Dispatch Action' : transitionAction === 'COMPLETE' ? 'Log Completion' : 'Log Cancellation'}
                    </h5>

                    <form onSubmit={handleSubmit(handleConfirmTransition)} className="space-y-3 text-xs">
                      {transitionAction === 'COMPLETE' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-muted-foreground">Actual Completion Date</label>
                            <input
                              type="date"
                              {...register('actualArrival')}
                              className="w-full rounded border border-border/80 bg-background/50 p-1.5 outline-none"
                            />
                            {errors.actualArrival && <span className="text-rose-500">{errors.actualArrival.message}</span>}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-muted-foreground">Actual Distance (km)</label>
                              <input
                                type="number"
                                step="any"
                                {...register('actualDistance')}
                                className="w-full rounded border border-border/80 bg-background/50 p-1.5 outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-muted-foreground">Odometer Closing (km)</label>
                              <input
                                type="number"
                                step="any"
                                {...register('endOdometer')}
                                className="w-full rounded border border-border/80 bg-background/50 p-1.5 outline-none font-mono"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="text-muted-foreground">Notes / Comments</label>
                        <textarea
                          rows={2}
                          {...register('notes')}
                          placeholder="Provide status change rationale..."
                          className="w-full rounded border border-border/80 bg-background/50 p-1.5 outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => { setIsTransitioning(false); setTransitionAction(null); }}
                          className="px-3 py-1.5 rounded border border-border/60 hover:bg-muted font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10 transition-all"
                        >
                          Confirm Action
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="default-footer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  {/* Action transitions depending on status */}
                  {trip.status === TripStatus.DRAFT && isManagerOrAdmin && (
                    <button
                      onClick={() => handleOpenTransition('DISPATCH')}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play className="h-4 w-4" />
                      Dispatch Trip
                    </button>
                  )}

                  {trip.status === TripStatus.DISPATCHED && (isManagerOrAdmin || trip.driver.userId === currentUserId) && (
                    <>
                      <button
                        onClick={() => handleOpenTransition('COMPLETE')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Trip
                      </button>

                      {isManagerOrAdmin && (
                        <button
                          onClick={() => handleOpenTransition('CANCEL')}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 px-4 shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel Trip
                        </button>
                      )}
                    </>
                  )}

                  {/* Soft Delete option for Draft / Cancelled */}
                  {(trip.status === TripStatus.DRAFT || trip.status === TripStatus.CANCELLED) && isManagerOrAdmin && (
                    <button
                      onClick={handleDeleteTrip}
                      className="rounded-lg border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 px-4 font-semibold text-sm transition-all"
                    >
                      Delete
                    </button>
                  )}

                  {/* Closing notice if completed */}
                  {trip.status === TripStatus.COMPLETED && (
                    <div className="w-full text-center text-xs text-muted-foreground py-2 border border-border/40 rounded-lg bg-muted/10">
                      Lifecycle finished. This trip record is finalized for compliance records.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
