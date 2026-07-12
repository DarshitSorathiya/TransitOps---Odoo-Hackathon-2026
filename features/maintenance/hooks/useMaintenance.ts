import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaintenanceFormValues, MaintenanceTransitionValues } from '@/types/maintenance';

interface FetchMaintenanceParams {
  page: number;
  limit: number;
  search: string;
  status: string;
  priority: string;
  archived: boolean;
}

export function useMaintenance(params: FetchMaintenanceParams) {
  const queryClient = useQueryClient();

  // 1. Fetch paginated records + stats
  const maintenanceQuery = useQuery({
    queryKey: ['maintenance-list', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        status: params.status,
        priority: params.priority,
        archived: params.archived.toString(),
      });
      const res = await fetch(`/api/maintenance?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch maintenance logs');
      return res.json();
    },
  });

  // 2. Create request mutation
  const createMutation = useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit maintenance request');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-list'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles-list'] });
    },
  });

  // 3. Update details mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: MaintenanceFormValues }) => {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update maintenance details');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-list'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles-list'] });
    },
  });

  // 4. Soft Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete maintenance request');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-list'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles-list'] });
    },
  });

  // 5. State Machine Transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: MaintenanceTransitionValues }) => {
      const res = await fetch(`/api/maintenance/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to transition maintenance status');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-list'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles-list'] });
    },
  });

  return {
    maintenanceQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    transitionMutation,
  };
}

export function useMaintenanceDetails(id: string | null) {
  return useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/maintenance/${id}`);
      if (!res.ok) throw new Error('Failed to fetch maintenance details');
      return res.json();
    },
    enabled: !!id,
  });
}
