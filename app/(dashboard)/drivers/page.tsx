'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverSchema, DriverFormValues } from '@/types/driver';
import { Driver } from '@prisma/client';
import { 
  Plus, Search, Trash2, Edit2, 
  ShieldAlert, X, Info 
} from 'lucide-react';
import { toast } from 'sonner';

interface DriverWithUser extends Driver {
  user?: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface FetchDriversResponse {
  data: DriverWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverWithUser | null>(null);

  // 1. Fetch Drivers using React Query
  const { data, isLoading } = useQuery<FetchDriversResponse>({
    queryKey: ['drivers', { search, status, page, showArchived }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '6',
        search,
        status,
        archived: showArchived.toString(),
      });
      const res = await fetch(`/api/drivers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch drivers');
      return res.json();
    },
  });

  // 2. React Hook Form configuration
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      userId: null,
      licenseNumber: '',
      licenseClass: '',
      licenseExpiry: new Date(),
      status: 'AVAILABLE',
      phoneNumber: '',
      emergencyContact: '',
      safetyScore: 100.0,
    }
  });

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingDriver(null);
    reset({
      userId: null,
      licenseNumber: '',
      licenseClass: '',
      licenseExpiry: new Date(),
      status: 'AVAILABLE',
      phoneNumber: '',
      emergencyContact: '',
      safetyScore: 100.0,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (driver: DriverWithUser) => {
    setEditingDriver(driver);
    const formatInputDate = (d: Date | string) => new Date(d).toISOString().split('T')[0];
    
    reset({
      userId: driver.userId || null,
      licenseNumber: driver.licenseNumber,
      licenseClass: driver.licenseClass,
      licenseExpiry: formatInputDate(driver.licenseExpiry) as unknown as Date,
      status: driver.status,
      phoneNumber: driver.phoneNumber,
      emergencyContact: driver.emergencyContact || '',
      safetyScore: driver.safetyScore,
    });
    setIsModalOpen(true);
  };

  // Mutations for Create/Update/Delete/Restore
  const createMutation = useMutation({
    mutationFn: async (values: DriverFormValues) => {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to register driver');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver registered successfully!');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DriverFormValues }) => {
      const res = await fetch(`/api/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update driver');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver profile updated!');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive driver');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver moved to archives.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drivers/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restore driver');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver profile restored!');
    },
  });

  const onSubmit = (values: DriverFormValues) => {
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const driversList = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-foreground min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Driver Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Register, monitor performance scores, and track license expiration alerts</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Active Drivers</span>
          <span className="block text-2xl font-bold mt-1">8</span>
        </div>
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">On Duty</span>
          <span className="block text-2xl font-bold text-emerald-500 mt-1">5</span>
        </div>
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Off Duty</span>
          <span className="block text-2xl font-bold text-muted-foreground mt-1">2</span>
        </div>
        <div className="glass rounded-xl p-4 border border-border/40 bg-card/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Suspended</span>
          <span className="block text-2xl font-bold text-rose-500 mt-1">1</span>
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
            placeholder="Search name, license plate, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border/60 bg-background/50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="OFF_DUTY">Off Duty</option>
            <option value="SUSPENDED">Suspended</option>
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

      {/* Main Drivers Table */}
      <div className="glass rounded-xl border border-border/40 overflow-hidden bg-card/10 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-4">Driver Name</th>
                <th className="p-4">License Details</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Safety Score</th>
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
              ) : driversList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    No drivers registered. Try adjusting filters.
                  </td>
                </tr>
              ) : (
                driversList.map((driver: DriverWithUser) => {
                  const name = driver.user?.name || `Driver ${driver.licenseNumber}`;
                  const email = driver.user?.email || 'Offline Profile';
                  const isLicenseExpired = new Date(driver.licenseExpiry) < new Date();

                  return (
                    <tr key={driver.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs">{driver.licenseNumber}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground bg-muted/30 border border-border/40 px-1.5 py-0.2 rounded">
                            {driver.licenseClass}
                          </span>
                          {isLicenseExpired ? (
                            <span className="text-[9px] text-rose-500 font-semibold flex items-center gap-0.5">
                              <ShieldAlert className="h-2.5 w-2.5" /> Expired
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">
                              Exp: {new Date(driver.licenseExpiry).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">{driver.phoneNumber}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold font-mono ${
                            driver.safetyScore >= 90 ? 'bg-emerald-500/10 text-emerald-500' :
                            driver.safetyScore >= 75 ? 'bg-amber-500/10 text-amber-500' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {driver.safetyScore}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          driver.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' :
                          driver.status === 'ON_TRIP' ? 'bg-blue-500/10 text-blue-500' :
                          driver.status === 'SUSPENDED' ? 'bg-rose-500/10 text-rose-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            driver.status === 'AVAILABLE' ? 'bg-emerald-500' :
                            driver.status === 'ON_TRIP' ? 'bg-blue-500' :
                            driver.status === 'SUSPENDED' ? 'bg-rose-500' :
                            'bg-muted-foreground'
                          }`} />
                          {driver.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {showArchived ? (
                          <button
                            onClick={() => restoreMutation.mutate(driver.id)}
                            className="text-xs px-3 py-1 rounded bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 transition-all"
                          >
                            Restore
                          </button>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(driver)}
                              className="p-1.5 rounded border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(driver.id)}
                              className="p-1.5 rounded border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
              className="glass max-w-xl w-full rounded-2xl p-6 border border-border/40 bg-card shadow-2xl relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold font-sans mb-4">
                {editingDriver ? 'Edit Driver Profile' : 'Register Driver'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">License Number</label>
                    <input
                      {...register('licenseNumber')}
                      placeholder="e.g. DL-987654"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.licenseNumber && <p className="text-xs text-destructive mt-0.5">{errors.licenseNumber.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">License Class</label>
                    <input
                      {...register('licenseClass')}
                      placeholder="e.g. Class A CDL"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.licenseClass && <p className="text-xs text-destructive mt-0.5">{errors.licenseClass.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">License Expiry Date</label>
                    <input
                      type="date"
                      {...register('licenseExpiry')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                    <select
                      {...register('status')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TRIP">On Trip</option>
                      <option value="OFF_DUTY">Off Duty</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                    <input
                      {...register('phoneNumber')}
                      placeholder="+1 (555) 019-2834"
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.phoneNumber && <p className="text-xs text-destructive mt-0.5">{errors.phoneNumber.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Safety Score (0-100)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('safetyScore')}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                    />
                    {errors.safetyScore && <p className="text-xs text-destructive mt-0.5">{errors.safetyScore.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Emergency Contact Info</label>
                  <input
                    {...register('emergencyContact')}
                    placeholder="Name and Phone number"
                    className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all mt-1"
                  />
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
                    {editingDriver ? 'Save Changes' : 'Register Driver'}
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
