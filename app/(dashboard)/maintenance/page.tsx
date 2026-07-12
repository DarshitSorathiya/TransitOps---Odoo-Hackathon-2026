'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMaintenance } from '@/features/maintenance/hooks/useMaintenance';
import { MaintenanceAnalyticsWidgets } from '@/features/maintenance/components/maintenance-analytics-widgets';
import { MaintenanceTable } from '@/features/maintenance/components/maintenance-table';
import { MaintenanceModal } from '@/features/maintenance/components/maintenance-modal';
import { MaintenanceDetailDrawer } from '@/features/maintenance/components/maintenance-detail-drawer';
import { MaintenanceFormValues, MaintenanceWithDetails } from '@/types/maintenance';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MaintenancePage() {
  const { data: session, status: authStatus } = useSession();
  const userRoles = session?.user?.roles || [];
  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('FLEET_MANAGER');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);

  // 1. Fetch maintenance logs & stats
  const {
    maintenanceQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useMaintenance({
    page,
    limit: 6, // 6 items per page for perfect layout layout
    search,
    status,
    priority,
    archived: false,
  });

  const logs = maintenanceQuery.data?.data || [];
  const pagination = maintenanceQuery.data?.pagination || { page: 1, totalPages: 1 };
  const stats = maintenanceQuery.data?.stats || {
    vehiclesInMaintenance: 0,
    pendingRequests: 0,
    completedToday: 0,
    avgCost: 0,
    upcomingCount: 0,
  };

  const handleOpenCreate = () => {
    setEditingMaintenance(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: MaintenanceWithDetails) => {
    setEditingMaintenance(log);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (values: MaintenanceFormValues) => {
    const loadingToastId = toast.loading(
      editingMaintenance ? 'Saving maintenance modifications...' : 'Scheduling maintenance requests...'
    );

    if (editingMaintenance) {
      updateMutation.mutate(
        { id: editingMaintenance.id, values },
        {
          onSuccess: () => {
            toast.success('Maintenance details updated successfully!', { id: loadingToastId });
            setIsModalOpen(false);
          },
          onError: (error: Error) => {
            toast.error(error.message || 'Failed to update details.', { id: loadingToastId });
          },
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success('Maintenance service request scheduled successfully!', { id: loadingToastId });
          setIsModalOpen(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to schedule service.', { id: loadingToastId });
        },
      });
    }
  };

  const handleDeleteLog = (id: string) => {
    if (!confirm('Are you sure you want to delete this maintenance request?')) return;

    const loadingToastId = toast.loading('Deleting log...');
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Maintenance log deleted successfully.', { id: loadingToastId });
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to delete record.', { id: loadingToastId });
      },
    });
  };

  // Loading spinner while auth resolves
  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-xs text-muted-foreground">Verifying access session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-foreground min-h-screen">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Maintenance & Shop Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request, track, and complete service repairs, battery diagnostics, and odometer compliance checks
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Schedule Maintenance
          </button>
        )}
      </div>

      {/* Analytics KPI Dashboard Row */}
      <MaintenanceAnalyticsWidgets stats={stats} />

      {/* Main Grid Tables */}
      <MaintenanceTable
        logs={logs}
        isLoading={maintenanceQuery.isLoading}
        onViewDetails={setSelectedMaintenanceId}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteLog}
        userRoles={userRoles}
        currentPage={page}
        totalPages={pagination.totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        status={status}
        onStatusChange={(val) => { setStatus(val); setPage(1); }}
        priority={priority}
        onPriorityChange={(val) => { setPriority(val); setPage(1); }}
      />

      {/* Maintenance Edit/Create Form Modal */}
      <MaintenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        editingMaintenance={editingMaintenance}
        isLoadingSubmit={createMutation.isPending || updateMutation.isPending}
      />

      {/* Maintenance Details Drawer Slideover */}
      {selectedMaintenanceId && (
        <MaintenanceDetailDrawer
          maintenanceId={selectedMaintenanceId}
          onClose={() => setSelectedMaintenanceId(null)}
          userRoles={userRoles}
        />
      )}
    </div>
  );
}
