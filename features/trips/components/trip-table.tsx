import { TripStatusBadge } from './trip-status-badge';
import { TripStatus } from '@prisma/client';
import { TripWithDetails } from '@/types/trip';
import { Eye, Edit2, Calendar, Search, Info, Trash2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface TripTableProps {
  trips: TripWithDetails[];
  isLoading: boolean;
  onViewDetails: (id: string) => void;
  onEdit: (trip: TripWithDetails) => void;
  onDelete: (id: string) => void;
  userRoles: string[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
}

export function TripTable({
  trips,
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
}: TripTableProps) {
  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('FLEET_MANAGER');

  return (
    <div className="space-y-4 text-foreground">
      {/* Filters & Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-4 rounded-xl border border-border/40 bg-card/20">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/60">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search trips, locations, vehicle plates, driver names..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background/50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all placeholder:text-muted-foreground/45"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Status:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-indigo-500/60 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="glass rounded-xl border border-border/40 overflow-hidden bg-card/10 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-4">Trip Number</th>
                <th className="p-4">Itinerary Terminal</th>
                <th className="p-4">Assigned vehicle</th>
                <th className="p-4">Assigned Operator</th>
                <th className="p-4">Cargo / Distance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40 animate-pulse">
                    <td className="p-4"><div className="h-6 w-20 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-10 w-44 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-8 w-24 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-8 w-28 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-8 w-20 bg-muted rounded" /></td>
                    <td className="p-4"><div className="h-6 w-16 bg-muted rounded" /></td>
                    <td className="p-4 text-right"><div className="h-6 w-12 bg-muted rounded ml-auto" /></td>
                  </tr>
                ))
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    No active or scheduled trips found matching filter.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => {
                  const driverName = trip.driver?.user?.name || `Driver ID: ${trip.driver?.licenseNumber}`;
                  const vehicleLabel = `${trip.vehicle?.make} ${trip.vehicle?.model}`;
                  const isModifiable = trip.status === TripStatus.DRAFT || trip.status === TripStatus.DISPATCHED;

                  return (
                    <tr
                      key={trip.id}
                      className="border-b border-border/40 hover:bg-muted/15 transition-all text-xs align-middle"
                    >
                      <td className="p-4 font-mono font-bold text-foreground">
                        {trip.tripNumber}
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span>{trip.startLocation}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                          <span>{trip.endLocation}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Planned Departure: {format(new Date(trip.plannedDeparture), 'MMM dd, HH:mm')}</span>
                        </div>
                      </td>
                      <td className="p-4 space-y-0.5">
                        <p className="font-semibold text-foreground">{vehicleLabel}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{trip.vehicle?.licensePlate}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-foreground">{driverName}</p>
                        <p className="text-[10px] text-muted-foreground">CDL Class: {trip.driver?.licenseClass}</p>
                      </td>
                      <td className="p-4 space-y-0.5 font-mono text-[10px]">
                        <p>Cargo: <span className="font-bold text-foreground">{(trip.cargoWeight).toLocaleString()} kg</span></p>
                        <p>Dist: <span className="font-bold text-foreground">{(trip.plannedDistance).toLocaleString()} km</span></p>
                      </td>
                      <td className="p-4">
                        <TripStatusBadge status={trip.status} />
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => onViewDetails(trip.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted font-medium transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {isManagerOrAdmin && isModifiable && (
                          <button
                            onClick={() => onEdit(trip)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/5 font-medium transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                        {isManagerOrAdmin && trip.status === TripStatus.DRAFT && (
                          <button
                            onClick={() => onDelete(trip.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/5 font-medium transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded border border-border/80 bg-background/50 hover:bg-muted font-medium transition-all disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded border border-border/80 bg-background/50 hover:bg-muted font-medium transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
