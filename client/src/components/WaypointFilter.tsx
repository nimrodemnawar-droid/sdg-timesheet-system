import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Search, X, Filter } from 'lucide-react';

export interface WaypointFilterOptions {
  date?: string;
  staffName?: string;
}

interface WaypointFilterProps {
  onFilterChange: (filters: WaypointFilterOptions) => void;
  totalRecords: number;
  filteredRecords: number;
}

export const WaypointFilter: React.FC<WaypointFilterProps> = ({
  onFilterChange,
  totalRecords,
  filteredRecords,
}) => {
  const [date, setDate] = useState<string>('');
  const [staffName, setStaffName] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    onFilterChange({
      date: newDate,
      staffName,
    });
  };

  const handleStaffNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStaffName = e.target.value;
    setStaffName(newStaffName);
    onFilterChange({
      date,
      staffName: newStaffName,
    });
  };

  const handleReset = () => {
    setDate('');
    setStaffName('');
    onFilterChange({
      date: '',
      staffName: '',
    });
  };

  const hasActiveFilters = date || staffName;

  return (
    <Card className="bg-slate-700/30 border-slate-600 p-4">
      <div className="space-y-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-white font-semibold hover:text-blue-400 transition"
          >
            <Filter className="w-4 h-4" />
            Waypoint Filters
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded-full">
                {(date ? 1 : 0) + (staffName ? 1 : 0)} active
              </span>
            )}
          </button>
          <div className="text-sm text-slate-400">
            Showing <span className="text-blue-400 font-semibold">{filteredRecords}</span> of{' '}
            <span className="text-slate-300 font-semibold">{totalRecords}</span> records
          </div>
        </div>

        {/* Filter Inputs */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-600">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="bg-slate-600/50 border-slate-600 text-white placeholder-slate-400"
                placeholder="Select date"
              />
            </div>

            {/* Staff Name Filter */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Staff Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value={staffName}
                  onChange={handleStaffNameChange}
                  className="bg-slate-600/50 border-slate-600 text-white placeholder-slate-400 pl-10"
                  placeholder="Search by name..."
                />
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                onClick={handleReset}
                disabled={!hasActiveFilters}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2">
            {date && (
              <div className="px-3 py-1 bg-blue-600/30 border border-blue-500 rounded-full text-sm text-blue-300 flex items-center gap-2">
                📅 {new Date(date).toLocaleDateString()}
                <button
                  onClick={() => {
                    setDate('');
                    onFilterChange({
                      date: '',
                      staffName,
                    });
                  }}
                  className="ml-1 hover:text-blue-200"
                >
                  ✕
                </button>
              </div>
            )}
            {staffName && (
              <div className="px-3 py-1 bg-green-600/30 border border-green-500 rounded-full text-sm text-green-300 flex items-center gap-2">
                👤 {staffName}
                <button
                  onClick={() => {
                    setStaffName('');
                    onFilterChange({
                      date,
                      staffName: '',
                    });
                  }}
                  className="ml-1 hover:text-green-200"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
