import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Filter, RotateCcw } from 'lucide-react';

export interface TimesheetFilterOptions {
  startDate: string | null;
  endDate: string | null;
  overtimeStatus: 'all' | 'overtime' | 'no-overtime';
  staffName: string;
  sortBy: 'date-asc' | 'date-desc' | 'hours-asc' | 'hours-desc';
}

interface TimesheetFilterProps {
  onFilterChange: (filters: TimesheetFilterOptions) => void;
  totalRecords: number;
  filteredRecords: number;
}

export function TimesheetFilter({ onFilterChange, totalRecords, filteredRecords }: TimesheetFilterProps) {
  const [filters, setFilters] = useState<TimesheetFilterOptions>({
    startDate: null,
    endDate: null,
    overtimeStatus: 'all',
    staffName: '',
    sortBy: 'date-desc',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = useCallback((newFilters: Partial<TimesheetFilterOptions>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  }, [filters, onFilterChange]);

  const handleReset = useCallback(() => {
    const defaultFilters: TimesheetFilterOptions = {
      startDate: null,
      endDate: null,
      overtimeStatus: 'all',
      staffName: '',
      sortBy: 'date-desc',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  }, [onFilterChange]);

  const activeFilterCount = [
    filters.startDate,
    filters.endDate,
    filters.overtimeStatus !== 'all',
    filters.staffName,
  ].filter(Boolean).length;

  return (
    <Card className="p-4 mb-6 bg-slate-900 border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Timesheet Filters</h3>
          {activeFilterCount > 0 && (
            <Badge className="bg-blue-600 hover:bg-blue-700">{activeFilterCount} active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {filteredRecords} of {totalRecords} records
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-300 hover:text-white"
          >
            {isExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-slate-700">
          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange({ startDate: e.target.value || null })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange({ endDate: e.target.value || null })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Staff Name Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Staff Name</label>
            <Input
              type="text"
              placeholder="Search by staff name..."
              value={filters.staffName}
              onChange={(e) => handleFilterChange({ staffName: e.target.value })}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Overtime Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Overtime Status</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All Records' },
                { value: 'overtime', label: 'Overtime Only (>8h)' },
                { value: 'no-overtime', label: 'No Overtime (≤8h)' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filters.overtimeStatus === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange({ overtimeStatus: option.value as any })}
                  className={
                    filters.overtimeStatus === option.value
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-600'
                      : 'border-slate-600 text-slate-300 hover:text-white hover:border-slate-500'
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'date-desc', label: 'Date (Newest)' },
                { value: 'date-asc', label: 'Date (Oldest)' },
                { value: 'hours-desc', label: 'Hours (High)' },
                { value: 'hours-asc', label: 'Hours (Low)' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filters.sortBy === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange({ sortBy: option.value as any })}
                  className={
                    filters.sortBy === option.value
                      ? 'bg-green-600 hover:bg-green-700 border-green-600'
                      : 'border-slate-600 text-slate-300 hover:text-white hover:border-slate-500'
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
