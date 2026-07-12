import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripSchema, TripFormValues, TripWithDetails } from '@/types/trip';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, AlertTriangle } from 'lucide-react';

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

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TripFormValues) => void;
  editingTrip: TripWithDetails | null;
  isLoadingSubmit: boolean;
}

export function TripModal({ isOpen, onClose, onSubmit, editingTrip, isLoadingSubmit }: TripModalProps) {
  const [selectedVehicleCapacity, setSelectedVehicleCapacity] = useState<number | null>(null);

  // 1. Fetch active available vehicles for selection
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['available-vehicles-list'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles?limit=100');
      if (!res.ok) throw new Error('Failed to load vehicles');
      return res.json();
    },
    enabled: isOpen,
  });

  // 2. Fetch active available drivers for selection
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
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      vehicleId: '',
      driverId: '',
      startLocation: '',
      endLocation: '',
      plannedDeparture: new Date() as unknown as Date,
      plannedArrival: new Date() as unknown as Date,
      cargoWeight: 0,
      plannedDistance: 0,
      notes: '',
    },
  });

  const watchedVehicleId = watch('vehicleId');
  const watchedCargoWeight = watch('cargoWeight');

  // Track selected vehicle capacity
  useEffect(() => {
    if (watchedVehicleId && vehicles.length > 0) {
      const selected = vehicles.find((v) => v.id === watchedVehicleId);
      if (selected) {
        setSelectedVehicleCapacity(selected.payloadCapacity);
      }
    } else {
      setSelectedVehicleCapacity(null);
    }
  }, [watchedVehicleId, vehicles]);

  // Load values if editing
  useEffect(() => {
    if (editingTrip) {
      const formatInputDate = (d: Date | string) => new Date(d).toISOString().slice(0, 16);
      reset({
        vehicleId: editingTrip.vehicleId,
        driverId: editingTrip.driverId,
        startLocation: editingTrip.startLocation,
        endLocation: editingTrip.endLocation,
        plannedDeparture: formatInputDate(editingTrip.plannedDeparture) as unknown as Date,
        plannedArrival: formatInputDate(editingTrip.plannedArrival) as unknown as Date,
        cargoWeight: editingTrip.cargoWeight,
        plannedDistance: editingTrip.plannedDistance,
        notes: editingTrip.notes || '',
      });
    } else {
      reset({
        vehicleId: '',
        driverId: '',
        startLocation: '',
        endLocation: '',
        plannedDeparture: new Date().toISOString().slice(0, 16) as unknown as Date,
        plannedArrival: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16) as unknown as Date, // +6 hours default
        cargoWeight: 0,
        plannedDistance: 0,
        notes: '',
      });
    }
  }, [editingTrip, isOpen, reset]);

  if (!isOpen) return null;

  const isOverweight = selectedVehicleCapacity !== null && watchedCargoWeight > selectedVehicleCapacity;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-50 p-4 overflow-y-auto text-foreground">
      <div className="glass w-full max-w-xl rounded-2xl border border-border/40 bg-card/75 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border/40 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-sans">
              {editingTrip ? `Edit Trip Details` : `Schedule New Trip`}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Define transit terminals, assign drivers, and check payload allocations</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md border border-border hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Origin & Destination Terminal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Location (Origin)</label>
              <input
                {...register('startLocation')}
                placeholder="Terminal A, Dallas TX"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
              />
              {errors.startLocation && <span className="text-[10px] text-destructive">{errors.startLocation.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination Hub</label>
              <input
                {...register('endLocation')}
                placeholder="Hub B, Houston TX"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
              />
              {errors.endLocation && <span className="text-[10px] text-destructive">{errors.endLocation.message}</span>}
            </div>
          </div>

          {/* Vehicle & Driver selectors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Vehicle Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Vehicle</label>
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

            {/* Driver Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Operator (Driver)</label>
              {isLoadingDrivers ? (
                <div className="h-9 bg-muted animate-pulse rounded-lg" />
              ) : (
                <select
                  {...register('driverId')}
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
                >
                  <option value="">Select a Driver...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name || `Driver ID: ${d.licenseNumber}`} - {d.status.toLowerCase().replace('_', ' ')} (Score: {d.safetyScore.toFixed(0)})
                    </option>
                  ))}
                </select>
              )}
              {errors.driverId && <span className="text-[10px] text-destructive">{errors.driverId.message}</span>}
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planned Departure Date</label>
              <input
                type="datetime-local"
                {...register('plannedDeparture')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all font-mono"
              />
              {errors.plannedDeparture && <span className="text-[10px] text-destructive">{errors.plannedDeparture.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planned Arrival Date</label>
              <input
                type="datetime-local"
                {...register('plannedArrival')}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all font-mono"
              />
              {errors.plannedArrival && <span className="text-[10px] text-destructive">{errors.plannedArrival.message}</span>}
            </div>
          </div>

          {/* Payload and Distance metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo Weight (kg)</label>
              <input
                type="number"
                step="any"
                {...register('cargoWeight')}
                placeholder="2500"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all font-mono"
              />
              {errors.cargoWeight && <span className="text-[10px] text-destructive">{errors.cargoWeight.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planned Distance (km)</label>
              <input
                type="number"
                step="any"
                {...register('plannedDistance')}
                placeholder="350"
                className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all font-mono"
              />
              {errors.plannedDistance && <span className="text-[10px] text-destructive">{errors.plannedDistance.message}</span>}
            </div>
          </div>

          {/* Capacity warning indicator if overweight */}
          {isOverweight && (
            <div className="flex items-center gap-2 border border-rose-500/30 text-rose-500 bg-rose-500/5 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                <strong>Overweight Warning:</strong> Assigned vehicle capacity is <strong>{selectedVehicleCapacity?.toLocaleString()} kg</strong>. Cargo weight exceeds limit. Dispatching will fail.
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes / Dispatch Instructions</label>
            <textarea
              rows={3}
              {...register('notes')}
              placeholder="Provide special instructions, temperature requirements, etc..."
              className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border/80 bg-background/30 hover:bg-muted py-2 px-4 text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingSubmit || isOverweight}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoadingSubmit && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingTrip ? 'Save Details' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
