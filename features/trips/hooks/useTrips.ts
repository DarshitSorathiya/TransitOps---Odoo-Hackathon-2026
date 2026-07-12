import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TripFormValues, TripTransitionValues } from '@/types/trip';

interface FetchTripsParams {
  page: number;
  limit: number;
  search: string;
  status: string;
  archived: boolean;
}

export function useTrips(params: FetchTripsParams) {
  const queryClient = useQueryClient();

  // 1. Fetch paginated trips
  const tripsQuery = useQuery({
    queryKey: ['trips', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        status: params.status,
        archived: params.archived.toString(),
      });
      const res = await fetch(`/api/trips?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch trips');
      return res.json();
    },
  });

  // 2. Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: TripFormValues) => {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create trip');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  // 3. Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TripFormValues }) => {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update trip');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', data.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  // 4. Delete mutation (Soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete trip');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  // 5. State Machine Transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TripTransitionValues }) => {
      const res = await fetch(`/api/trips/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to transition trip status');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  return {
    tripsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    transitionMutation,
  };
}

export function useTripDetails(id: string | null) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/trips/${id}`);
      if (!res.ok) throw new Error('Failed to fetch trip details');
      return res.json();
    },
    enabled: !!id,
  });
}
