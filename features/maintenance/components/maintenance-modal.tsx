import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceSchema, MaintenanceFormValues, MaintenanceWithDetails } from '@/types/maintenance';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { MaintenancePriority, MaintenanceType } from '@prisma/client';

interface VehicleOption {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  status: string;
  payloadCapacity: number;
}

interface DriverOption {
  id: string;
  licenseNumber: string;
  status: string;
  safetyScore: number;
  user?: { name: string | null };
}

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: MaintenanceFormValues) => void;
  editingMaintenance: MaintenanceWithDetails | null;
  isLoadingSubmit: boolean;
}

export function MaintenanceModal({
  isOpen,
  onClose,
  onSubmit,
  editingMaintenance,
  isLoadingSubmit,
}: MaintenanceModalProps) {
  // Fetch vehicles for selection
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['available-vehicles-list'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles?limit=100');
      if (!res.ok) throw new Error('Failed to load vehicles');
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch drivers for selection
  const { data: driversData, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['available-drivers-list'],
    queryFn: async () => {
      const res = await fetch('/api/drivers?limit=100');
      if (!res.ok) throw new Error('Failed to load drivers');
      return res.json();
    },
    enabled: isOpen,
  });

  const vehicles: VehicleOption[] = useMemo(() => vehiclesData?.data || [], [vehiclesData]);
  const drivers: DriverOption[] = driversData?.data || [];

  // Form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicleId: '',
      driverId: null,
      title: '',
      description: '',
      priority: MaintenancePriority.MEDIUM,
      type: MaintenanceType.PREVENTIVE,
      technician: '',
      estimatedCost: 0,
      actualCost: null,
      startDate: new Date() as unknown as Date,
      endDate: null,
      notes: '',
    },
  });

  // Synchronize editing details on open
  useEffect(() => {
    if (editingMaintenance && isOpen) {
      reset({
        vehicleId: editingMaintenance.vehicleId,
        driverId: editingMaintenance.driverId,
        title: editingMaintenance.title,
        description: editingMaintenance.description,
        priority: editingMaintenance.priority,
        type: editingMaintenance.type,
        technician: editingMaintenance.technician,
        estimatedCost: Number(editingMaintenance.estimatedCost),
        actualCost: editingMaintenance.actualCost ? Number(editingMaintenance.actualCost) : null,
        startDate: new Date(editingMaintenance.startDate).toISOString().split('T')[0] as unknown as Date,
        endDate: editingMaintenance.endDate ? new Date(editingMaintenance.endDate).toISOString().split('T')[0] as unknown as Date : null,
        notes: editingMaintenance.notes || '',
      });
    } else if (isOpen) {
      reset({
        vehicleId: '',
        driverId: null,
        title: '',
        description: '',
        priority: MaintenancePriority.MEDIUM,
        type: MaintenanceType.PREVENTIVE,
        technician: '',
        estimatedCost: 0,
        actualCost: null,
        startDate: new Date().toISOString().split('T')[0] as unknown as Date,
        endDate: null,
        notes: '',
      });
    }
  }, [editingMaintenance, isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 text-foreground">
      <div className="relative w-full max-w-2xl rounded-xl border border-border/40 bg-card/95 p-6 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight">
            {editingMaintenance ? 'Edit Maintenance Service' : 'Schedule Vehicle Maintenance'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log maintenance details, assign technicians, and set estimated costs.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Vehicle Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Vehicle</label>
              {isLoadingVehicles ? (
                <div className="h-9 bg-muted animate-pulse rounded-lg" />
              ) : (
                <select
                  {...register('vehicleId')}
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
                >
                  <option value="">Select a Vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} - {v.make} {v.model} ({v.status.toLowerCase().replace('_', ' ')})
                    </option>
                  ))}
                </select>
              )}
              {errors.vehicleId && <span className="text-[10px] text-destructive">{errors.vehicleId.message}</span>}
            </div>

            {/* Optional Driver reporter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reported By (Driver - Optional)</label>
              {isLoadingDrivers ? (
                <div className="h-9 bg-muted animate-pulse rounded-lg" />
              ) : (
                <select
                  {...register('driverId')}
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
                >
                  <option value="">Select Reporter...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name || `Driver ID: ${d.licenseNumber}`} - {d.status.toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
              )}
              {errors.driverId && <span className="text-[10px] text-destructive">{errors.driverId.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Priority Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority Level</label>
              <select
                {...register('priority')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
              >
                {Object.values(MaintenancePriority).map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
              {errors.priority && <span className="text-[10px] text-destructive">{errors.priority.message}</span>}
            </div>

            {/* Type Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Type</label>
              <select
                {...register('type')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
              >
                {Object.values(MaintenanceType).map((val) => (
                  <option key={val} value={val}>
                    {val.toLowerCase().replace('_', ' ')}
                  </option>
                ))}
              </select>
              {errors.type && <span className="text-[10px] text-destructive">{errors.type.message}</span>}
            </div>

            {/* Technician */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Mechanic / Tech</label>
              <input
                type="text"
                placeholder="e.g. Alice Mechanic"
                {...register('technician')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500/60 transition-all"
              />
              {errors.technician && <span className="text-[10px] text-destructive">{errors.technician.message}</span>}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Title</label>
            <input
              type="text"
              placeholder="e.g. Broken radiator hoses replacement"
              {...register('title')}
              className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500/60 transition-all"
            />
            {errors.title && <span className="text-[10px] text-destructive">{errors.title.message}</span>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Description</label>
            <textarea
              placeholder="Describe the vehicle breakdown or service schedule detail..."
              rows={3}
              {...register('description')}
              className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500/60 transition-all resize-none"
            />
            {errors.description && <span className="text-[10px] text-destructive">{errors.description.message}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Cost */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Estimated Cost ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('estimatedCost')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500/60 transition-all font-mono"
              />
              {errors.estimatedCost && <span className="text-[10px] text-destructive">{errors.estimatedCost.message}</span>}
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Service Start Date</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500/60 transition-all font-mono"
              />
              {errors.startDate && <span className="text-[10px] text-destructive">{errors.startDate.message}</span>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Dispatch Notes</label>
            <textarea
              placeholder="Additional internal dispatcher logs (optional)..."
              rows={2}
              {...register('notes')}
              className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm outline-none focus:border-indigo-500/60 transition-all resize-none"
            />
            {errors.notes && <span className="text-[10px] text-destructive">{errors.notes.message}</span>}
          </div>

          {/* Actions Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border/80 px-4 py-2 text-xs font-bold hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingSubmit}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 text-xs shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all"
            >
              {isLoadingSubmit && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingMaintenance ? 'Save Changes' : 'Schedule Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
