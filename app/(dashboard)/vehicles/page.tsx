'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema, VehicleFormValues } from '@/types/vehicle';
import { Vehicle } from '@prisma/client';
import { 
  Plus, Search, Trash2, Edit2, 
  X, Info 
} from 'lucide-react';
import { toast } from 'sonner';

interface FetchVehiclesResponse {
  data: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // 1. Fetch Vehicles using React Query
  const { data, isLoading } = useQuery<FetchVehiclesResponse>({
    queryKey: ['vehicles', { search, type, status, page, showArchived }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '6',
        search,
        type,
        status,
        archived: showArchived.toString(),
      });
      const res = await fetch(`/api/vehicles?${params}`);
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json();
    },
  });

  // 2. React Hook Form configuration
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '', model: '', year: new Date().getFullYear(), vin: '',
      licensePlate: '', type: 'TRUCK', status: 'AVAILABLE', fuelType: 'DIESEL',
      odometer: 0, payloadCapacity: 1000, insuranceExpiry: new Date(),
      acquisitionCost: 25000, acquisitionDate: new Date(),
    }
  });

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingVehicle(null);
    reset({
      make: '', model: '', year: new Date().getFullYear(), vin: '',
      licensePlate: '', type: 'TRUCK', status: 'AVAILABLE', fuelType: 'DIESEL',
      odometer: 0, payloadCapacity: 1000, insuranceExpiry: new Date(),
      acquisitionCost: 25000, acquisitionDate: new Date(),
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    const formatInputDate = (d: Date | string) => new Date(d).toISOString().split('T')[0];
    
    reset({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      licensePlate: vehicle.licensePlate,
      type: vehicle.type,
      status: vehicle.status,
      fuelType: vehicle.fuelType,
      odometer: vehicle.odometer,
      payloadCapacity: vehicle.payloadCapacity,
      insuranceExpiry: formatInputDate(vehicle.insuranceExpiry) as unknown as Date,
      acquisitionCost: Number(vehicle.acquisitionCost),
      acquisitionDate: formatInputDate(vehicle.acquisitionDate) as unknown as Date,
    });
    setIsModalOpen(true);
  };

  // Mutations for Create/Update/Delete/Restore
  const createMutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle registered successfully!');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: VehicleFormValues }) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle updated successfully!');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive vehicle');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle moved to archives.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restore vehicle');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle restored successfully!');
    },
  });

  const onSubmit = (values: VehicleFormValues) => {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const vehiclesList = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-foreground min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track fleet assets, configurations, and statuses</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Fleet</span>
          <span className="block text-2xl font-bold mt-1">12</span>
        </div>
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Available</span>
          <span className="block text-2xl font-bold text-emerald-500 mt-1">8</span>
        </div>
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">In Shop</span>
          <span className="block text-2xl font-bold text-amber-500 mt-1">3</span>
        </div>
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Retired</span>
          <span className="block text-2xl font-bold text-muted-foreground mt-1">1</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-4 rounded-xl border border-border/40 bg-card/20">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/60">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search make, model, VIN, or plate..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border/60 bg-background/50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
          >
            <option value="">All Types</option>
            <option value="TRUCK">Trucks</option>
            <option value="VAN">Vans</option>
            <option value="CAR">Cars</option>
            <option value="BUS">Buses</option>
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="IN_SHOP">In Shop</option>
            <option value="RETIRED">Retired</option>
          </select>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`rounded-lg border px-3 py-2 text-sm transition-all ${
              showArchived ? 'bg-destructive/10 border-destructive text-destructive' : 'border-border/80 bg-background/50'
            }`}
          >
            {showArchived ? 'View Active' : 'View Archived'}
          </button>
        </div>
      </div>

      {/* Main Vehicles Table */}
      <div className="glass rounded-xl border border-border/40 overflow-hidden bg-card/10 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-4">Vehicle Details</th>
                <th className="p-4">Registration / VIN</th>
                <th className="p-4">Type</th>
                <th className="p-4">Odometer</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40 animate-pulse">
                    <td className="p-4"><div className="h-8 w-32 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-8 w-24 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-6 w-16 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-6 w-20 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-6 w-16 bg-muted rounded" /></td>
                    <td className="p-4 text-right"><div className="h-6 w-12 bg-muted rounded ml-auto" /></td>
                  </tr>
                ))
              ) : vehiclesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    No vehicles found. Try adjusting your search filters.
                  </td>
                </tr>
              ) : (
                vehiclesList.map((vehicle: Vehicle) => (
                  <tr key={vehicle.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-medium">
                      <div>{vehicle.make} {vehicle.model}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Year: {vehicle.year}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs">{vehicle.licensePlate}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{vehicle.vin}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2.5 py-1 rounded-full border border-border/60 bg-muted/20 font-semibold uppercase">
                        {vehicle.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono">{vehicle.odometer.toLocaleString()} km</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        vehicle.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        vehicle.status === 'ON_TRIP' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        vehicle.status === 'IN_SHOP' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          vehicle.status === 'AVAILABLE' ? 'bg-emerald-500' :
                          vehicle.status === 'ON_TRIP' ? 'bg-blue-500' :
                          vehicle.status === 'IN_SHOP' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} />
                        {vehicle.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {showArchived ? (
                        <button
                          onClick={() => restoreMutation.mutate(vehicle.id)}
                          className="text-xs px-3 py-1 rounded bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 transition-all"
                        >
                          Restore
                        </button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(vehicle)}
                            className="p-1.5 rounded border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(vehicle.id)}
                            className="p-1.5 rounded border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-border/40">
            <span className="text-xs text-muted-foreground">Page {page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, pagination.totalPages))}
                disabled={page === pagination.totalPages}
                className="rounded border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation/Editing Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass max-w-2xl w-full rounded-2xl p-6 border border-border/40 bg-card shadow-2xl relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold font-sans mb-4">
                {editingVehicle ? 'Edit Vehicle Profile' : 'Register Vehicle'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Make</label>
                    <input
                      {...register('make')}
                      placeholder="e.g. Ford"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.make && <p className="text-xs text-destructive mt-0.5">{errors.make.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Model</label>
                    <input
                      {...register('model')}
                      placeholder="e.g. Transit"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.model && <p className="text-xs text-destructive mt-0.5">{errors.model.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Year</label>
                    <input
                      type="number"
                      {...register('year')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.year && <p className="text-xs text-destructive mt-0.5">{errors.year.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">License Plate</label>
                    <input
                      {...register('licensePlate')}
                      placeholder="TX-1234"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.licensePlate && <p className="text-xs text-destructive mt-0.5">{errors.licensePlate.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">VIN</label>
                    <input
                      {...register('vin')}
                      placeholder="17-digit character string"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.vin && <p className="text-xs text-destructive mt-0.5">{errors.vin.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Type</label>
                    <select
                      {...register('type')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    >
                      <option value="TRUCK">Truck</option>
                      <option value="VAN">Van</option>
                      <option value="CAR">Car</option>
                      <option value="BUS">Bus</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                    <select
                      {...register('status')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TRIP">On Trip</option>
                      <option value="IN_SHOP">In Shop</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Fuel Type</label>
                    <select
                      {...register('fuelType')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    >
                      <option value="DIESEL">Diesel</option>
                      <option value="PETROL">Petrol</option>
                      <option value="ELECTRIC">Electric</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Odometer (km)</label>
                    <input
                      type="number"
                      {...register('odometer')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.odometer && <p className="text-xs text-destructive mt-0.5">{errors.odometer.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Capacity (kg)</label>
                    <input
                      type="number"
                      {...register('payloadCapacity')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.payloadCapacity && <p className="text-xs text-destructive mt-0.5">{errors.payloadCapacity.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Insurance Expiry</label>
                    <input
                      type="date"
                      {...register('insuranceExpiry')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Acquisition Cost ($)</label>
                    <input
                      type="number"
                      {...register('acquisitionCost')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.acquisitionCost && <p className="text-xs text-destructive mt-0.5">{errors.acquisitionCost.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Acquisition Date</label>
                    <input
                      type="date"
                      {...register('acquisitionDate')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-border/80 bg-background hover:bg-accent px-4 py-2 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all"
                  >
                    {editingVehicle ? 'Save Changes' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
