'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTrips } from '@/features/trips/hooks/useTrips';
import { TripAnalyticsWidgets } from '@/features/trips/components/trip-analytics-widgets';
import { TripTable } from '@/features/trips/components/trip-table';
import { TripModal } from '@/features/trips/components/trip-modal';
import { TripDetailDrawer } from '@/features/trips/components/trip-detail-drawer';
import { TripFormValues, TripWithDetails } from '@/types/trip';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TripsPage() {
  const { data: session, status: authStatus } = useSession();
  const userRoles = session?.user?.roles || [];
  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('FLEET_MANAGER');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const showArchived = false;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripWithDetails | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // 1. Fetch Trips & stats using custom React Query hook
  const { tripsQuery, createMutation, updateMutation, deleteMutation } = useTrips({
    page,
    limit: 6, // 6 items per page for perfect layout spacing
    search,
    status,
    archived: showArchived,
  });

  const trips = tripsQuery.data?.data || [];
  const pagination = tripsQuery.data?.pagination || { page: 1, totalPages: 1 };
  const stats = tripsQuery.data?.stats || {
    activeTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    totalDistance: 0,
    vehiclesOnTrip: 0,
    driversOnTrip: 0,
  };

  const handleOpenCreate = () => {
    setEditingTrip(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trip: TripWithDetails) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (values: TripFormValues) => {
    const loadingToastId = toast.loading(
      editingTrip ? 'Updating trip details...' : 'Scheduling new trip itinerary...'
    );

    if (editingTrip) {
      updateMutation.mutate(
        { id: editingTrip.id, values },
        {
          onSuccess: () => {
            toast.success('Trip details updated successfully!', { id: loadingToastId });
            setIsModalOpen(false);
          },
          onError: (error: Error) => {
            toast.error(error.message || 'Failed to update trip.', { id: loadingToastId });
          },
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success('Trip scheduled successfully in Draft!', { id: loadingToastId });
          setIsModalOpen(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to schedule trip.', { id: loadingToastId });
        },
      });
    }
  };

  const handleDeleteTrip = (id: string) => {
    if (!confirm('Are you sure you want to delete this trip draft?')) return;

    const loadingToastId = toast.loading('Deleting trip...');
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Trip deleted successfully.', { id: loadingToastId });
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to delete trip.', { id: loadingToastId });
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
          <h1 className="text-3xl font-extrabold tracking-tight">Trip Dispatch Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dispatch, complete, or cancel fleet vehicle transit routes and monitor live odometer logs
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Schedule Trip
          </button>
        )}
      </div>

      {/* Analytics KPI Dashboard Row */}
      <TripAnalyticsWidgets stats={stats} />

      {/* Main Grid Tables */}
      <TripTable
        trips={trips}
        isLoading={tripsQuery.isLoading}
        onViewDetails={setSelectedTripId}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteTrip}
        userRoles={userRoles}
        currentPage={page}
        totalPages={pagination.totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        status={status}
        onStatusChange={(val) => { setStatus(val); setPage(1); }}
      />

      {/* Trip Edit/Create Form Modal */}
      <TripModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        editingTrip={editingTrip}
        isLoadingSubmit={createMutation.isPending || updateMutation.isPending}
      />

      {/* Trip Details Drawer Slideover */}
      {selectedTripId && (
        <TripDetailDrawer
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
          userRoles={userRoles}
        />
      )}
    </div>
  );
}
