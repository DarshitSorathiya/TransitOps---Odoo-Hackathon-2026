import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useMaintenanceDetails, useMaintenance } from '../hooks/useMaintenance';
import { MaintenanceStatusBadge } from './maintenance-status-badge';
import { MaintenanceTimeline } from './maintenance-timeline';
import { X, Wrench, User, CheckCircle2, XCircle, Play, DollarSign, PenTool, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceTransitionSchema, MaintenanceTransitionValues } from '@/types/maintenance';
import { MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { toast } from 'sonner';

interface MaintenanceDetailDrawerProps {
  maintenanceId: string | null;
  onClose: () => void;
  userRoles: string[];
}

export function MaintenanceDetailDrawer({ maintenanceId, onClose, userRoles }: MaintenanceDetailDrawerProps) {
  const queryClient = useQueryClient();
  const { data: maintenance, isLoading } = useMaintenanceDetails(maintenanceId);

  const { transitionMutation, deleteMutation } = useMaintenance({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    priority: '',
    archived: false,
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionAction, setTransitionAction] = useState<'APPROVE' | 'START' | 'COMPLETE' | 'CANCEL' | null>(null);

  // Form setup for Completion
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MaintenanceTransitionValues>({
    resolver: zodResolver(maintenanceTransitionSchema),
    defaultValues: {
      action: 'COMPLETE',
      actualCost: 0,
      notes: '',
    },
  });

  if (!maintenanceId) return null;

  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('FLEET_MANAGER');

  const handleOpenTransition = (action: 'APPROVE' | 'START' | 'COMPLETE' | 'CANCEL') => {
    setTransitionAction(action);
    setIsTransitioning(true);
    reset({
      action,
      actualCost: maintenance ? Number(maintenance.estimatedCost) : 0,
      notes: '',
    });
  };

  const handleConfirmTransition = (formData: MaintenanceTransitionValues) => {
    if (!maintenance) return;
    const payload = {
      action: transitionAction!,
      notes: formData.notes,
      ...(transitionAction === 'COMPLETE' && {
        actualCost: Number(formData.actualCost ?? 0),
      }),
    };

    const loadingId = toast.loading(`Executing maintenance transition to ${transitionAction}...`);

    transitionMutation.mutate(
      { id: maintenance.id, values: payload },
      {
        onSuccess: () => {
          toast.success(`Maintenance transitioned successfully!`, { id: loadingId });
          setIsTransitioning(false);
          setTransitionAction(null);
          queryClient.invalidateQueries({ queryKey: ['maintenance-detail', maintenance.id] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-list'] });
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Transition failed.', { id: loadingId });
        },
      }
    );
  };

  const handleDeleteRequest = () => {
    if (!maintenance) return;
    if (!confirm('Are you sure you want to delete this maintenance request? This action soft deletes the record.')) return;

    const loadingId = toast.loading('Deleting maintenance log...');
    deleteMutation.mutate(maintenance.id, {
      onSuccess: () => {
        toast.success('Maintenance log deleted successfully.', { id: loadingId });
        onClose();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Deletion failed.', { id: loadingId });
      },
    });
  };

  const getPriorityColor = (p: MaintenancePriority) => {
    const map: Record<MaintenancePriority, string> = {
      LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
      MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      CRITICAL: 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse',
    };
    return map[p];
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card/90 backdrop-blur-xl border-l border-border/40 shadow-2xl z-50 overflow-y-auto flex flex-col h-full text-foreground">
      {/* Drawer Header */}
      <div className="p-6 border-b border-border/40 flex items-center justify-between">
        <div>
          {isLoading ? (
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider block">Service Record Log</span>
              <h2 className="text-lg font-bold tracking-tight">{maintenance?.title || 'Maintenance Details'}</h2>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 p-6 space-y-6">
          <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      ) : maintenance ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info Columns */}
          <div className="grid grid-cols-2 gap-4 border border-border/40 bg-card/10 rounded-xl p-4">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Status</span>
              <MaintenanceStatusBadge status={maintenance.status} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Priority</span>
              <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider ${getPriorityColor(maintenance.priority)}`}>
                {maintenance.priority}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Service Type</span>
              <span className="text-xs font-semibold capitalize font-mono text-indigo-400">
                {maintenance.type.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Odometer at Request</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {maintenance.odometer.toLocaleString()} km
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Issue Description</span>
            <p className="text-xs leading-relaxed text-muted-foreground bg-muted/10 border border-border/30 rounded-lg p-3">
              {maintenance.description}
            </p>
          </div>

          {/* Assigned vehicle details */}
          <div className="space-y-3">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Assigned Vehicle</span>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/10">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-lg text-indigo-400">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">{maintenance.vehicle.licensePlate}</span>
                <span className="text-[10px] text-muted-foreground block">{maintenance.vehicle.make} {maintenance.vehicle.model}</span>
              </div>
            </div>
          </div>

          {/* Service Cost metrics */}
          <div className="grid grid-cols-2 gap-4 border border-border/30 bg-muted/5 rounded-xl p-4">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[10px] uppercase font-semibold">Estimated Cost</span>
              </div>
              <span className="text-sm font-mono font-bold text-foreground">
                ${Number(maintenance.estimatedCost).toLocaleString([], { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[10px] uppercase font-semibold">Actual Cost</span>
              </div>
              <span className="text-sm font-mono font-bold text-foreground">
                {maintenance.actualCost
                  ? `$${Number(maintenance.actualCost).toLocaleString([], { minimumFractionDigits: 2 })}`
                  : 'Pending Completion'}
              </span>
            </div>
          </div>

          {/* Operations and timelines */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Technician</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <PenTool className="h-3 w-3 text-muted-foreground" />
                {maintenance.technician}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Reported By</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                {maintenance.driver?.user?.name || `Driver ID: ${maintenance.driver?.licenseNumber || 'System Scheduled'}`}
              </span>
            </div>
          </div>

          {/* Timeline Nodes */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Service Milestones</span>
            <MaintenanceTimeline
              status={maintenance.status}
              startDate={maintenance.startDate}
              endDate={maintenance.endDate}
            />
          </div>

          {/* Dispatcher Notes */}
          {maintenance.notes && (
            <div className="border border-border/40 rounded-lg p-3 bg-muted/20 text-xs">
              <span className="font-semibold text-muted-foreground uppercase block mb-1">Service Notes</span>
              <p className="text-muted-foreground leading-relaxed italic">&ldquo;{maintenance.notes}&rdquo;</p>
            </div>
          )}

          {/* Workflow Action Transitions */}
          {!isTransitioning ? (
            <div className="flex flex-wrap gap-2 pt-6 border-t border-border/40">
              {/* Transition actions dependent on Status */}
              {maintenance.status === MaintenanceStatus.PENDING && isManagerOrAdmin && (
                <>
                  <button
                    onClick={() => handleOpenTransition('APPROVE')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 text-xs shadow-lg transition-all"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve Request
                  </button>

                  <button
                    onClick={() => handleOpenTransition('CANCEL')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 px-3 text-xs shadow-lg transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel Service
                  </button>
                </>
              )}

              {(maintenance.status === MaintenanceStatus.APPROVED || maintenance.status === MaintenanceStatus.PENDING) && isManagerOrAdmin && (
                <button
                  onClick={() => handleOpenTransition('START')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 text-xs shadow-lg transition-all"
                >
                  <Play className="h-3.5 w-3.5" />
                  Move to Shop (Start Repair)
                </button>
              )}

              {maintenance.status === MaintenanceStatus.IN_PROGRESS && isManagerOrAdmin && (
                <>
                  <button
                    onClick={() => handleOpenTransition('COMPLETE')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 text-xs shadow-lg transition-all"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete Service
                  </button>

                  <button
                    onClick={() => handleOpenTransition('CANCEL')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 px-3 text-xs shadow-lg transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel Service
                  </button>
                </>
              )}

              {/* Soft delete audit action */}
              {isManagerOrAdmin && maintenance.status !== MaintenanceStatus.IN_PROGRESS && (
                <button
                  onClick={handleDeleteRequest}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/5 py-2 px-4 text-xs transition-all"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Delete Service Log (Audit Archive)
                </button>
              )}
            </div>
          ) : (
            /* Transition Dialog Expansion Form */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border/60 bg-muted/10 rounded-xl p-4 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-xs font-bold text-indigo-400 capitalize">
                  Confirm action: {transitionAction?.toLowerCase()}
                </span>
                <button
                  onClick={() => setIsTransitioning(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit(handleConfirmTransition)} className="space-y-4">
                {transitionAction === 'COMPLETE' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">Actual Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('actualCost')}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-indigo-500/60 font-mono"
                    />
                    {errors.actualCost && <span className="text-[10px] text-destructive block">{errors.actualCost.message}</span>}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Internal Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide description logs for this status change..."
                    {...register('notes')}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-indigo-500/60 resize-none"
                  />
                  {errors.notes && <span className="text-[10px] text-destructive block">{errors.notes.message}</span>}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 text-xs shadow-md transition-all"
                >
                  Submit Status Transition
                </button>
              </form>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs">
          Select a maintenance log record to view detail.
        </div>
      )}
    </div>
  );
}
