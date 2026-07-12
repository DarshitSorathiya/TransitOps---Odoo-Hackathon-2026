import { MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { MaintenanceStatusBadge } from './maintenance-status-badge';
import { MaintenanceWithDetails } from '@/types/maintenance';
import { Eye, Edit2, Search, Info, Trash2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface MaintenanceTableProps {
  logs: MaintenanceWithDetails[];
  isLoading: boolean;
  onViewDetails: (id: string) => void;
  onEdit: (log: MaintenanceWithDetails) => void;
  onDelete: (id: string) => void;
  userRoles: string[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  priority: string;
  onPriorityChange: (priority: string) => void;
}

export function MaintenanceTable({
  logs,
  isLoading,
  onViewDetails,
  onEdit,
  onDelete,
  userRoles,
  currentPage,
  totalPages,
  onPageChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
}: MaintenanceTableProps) {
  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('FLEET_MANAGER');

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
    <div className="space-y-4 text-foreground">
      {/* Filters & Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-4 rounded-xl border border-border/40 bg-card/25">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/60">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search maintenance logs, technician, vehicle plate..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background/50 pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-500/60 transition-all placeholder:text-muted-foreground/45"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          {/* Status filter select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Status:</span>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500/60 transition-all"
            >
              <option value="">All Statuses</option>
              {Object.values(MaintenanceStatus).map((val) => (
                <option key={val} value={val}>
                  {val.toLowerCase().replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Priority:</span>
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500/60 transition-all"
            >
              <option value="">All Priorities</option>
              {Object.values(MaintenancePriority).map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TanStack Listing Grid */}
      <div className="border border-border/40 rounded-xl overflow-hidden bg-card/10 backdrop-blur-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">Issue Description</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Technician</th>
                <th className="py-3.5 px-4">Est. Cost</th>
                <th className="py-3.5 px-4">Start Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-44" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-14" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-12" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-6 bg-muted rounded w-20" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-muted rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="h-5 w-5 text-muted-foreground/60" />
                      <p>No vehicle maintenance logs found matching the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const vehicleLabel = `${log.vehicle.make} ${log.vehicle.model}`;
                  const isModifiable = log.status !== MaintenanceStatus.COMPLETED && log.status !== MaintenanceStatus.CANCELLED;
                  const isDeletable = log.status !== MaintenanceStatus.IN_PROGRESS;

                  return (
                    <tr key={log.id} className="hover:bg-muted/15 transition-colors group">
                      {/* Vehicle License Plate */}
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <span className="block">{log.vehicle.licensePlate}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{vehicleLabel}</span>
                      </td>

                      {/* Issue details */}
                      <td className="py-3 px-4 max-w-xs truncate">
                        <span className="font-bold text-foreground block truncate">{log.title}</span>
                        <span className="text-muted-foreground block truncate">{log.description}</span>
                      </td>

                      {/* Priority styled badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-extrabold tracking-wide uppercase ${getPriorityColor(log.priority)}`}>
                          {log.priority}
                        </span>
                      </td>

                      {/* Service Type */}
                      <td className="py-3 px-4 capitalize font-mono text-muted-foreground text-[11px]">
                        {log.type.toLowerCase().replace('_', ' ')}
                      </td>

                      {/* Technician */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.technician}
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-4 font-mono text-foreground font-semibold">
                        ${Number(log.estimatedCost).toLocaleString([], { minimumFractionDigits: 2 })}
                      </td>

                      {/* Start Date */}
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {format(new Date(log.startDate), 'MMM dd, yyyy')}
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4">
                        <MaintenanceStatusBadge status={log.status} />
                      </td>

                      {/* Table row actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewDetails(log.id)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="View Milestones & Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {isManagerOrAdmin && isModifiable && (
                            <button
                              onClick={() => onEdit(log)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-indigo-400 transition-all"
                              title="Edit Log details"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {isManagerOrAdmin && isDeletable && (
                            <button
                              onClick={() => onDelete(log.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-400 transition-all"
                              title="Soft delete request"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/40 bg-muted/10 text-xs">
            <span className="text-muted-foreground">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="px-2.5 py-1 rounded border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="px-2.5 py-1 rounded border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                Next
                <ArrowRight className="h-3 w-3 inline ml-1 align-middle" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
