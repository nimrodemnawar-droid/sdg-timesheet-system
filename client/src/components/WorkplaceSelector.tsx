import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface WorkplaceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const WORKPLACES = [
  { id: "nairobi_office", name: "Nairobi Office", address: "Nairobi, Kenya" },
  { id: "homa_bay_office", name: "Homa Bay Office", address: "Homa Bay, Kenya" },
  { id: "field", name: "Field Work", address: "Various locations" },
  { id: "remote", name: "Remote", address: "Work from home" },
];

export function WorkplaceSelector({
  value,
  onChange,
  disabled = false,
}: WorkplaceSelectorProps) {
  const selectedWorkplace = WORKPLACES.find((w) => w.id === value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Select Workplace
        </CardTitle>
        <CardDescription>
          Choose your work location for this check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a workplace..." />
          </SelectTrigger>
          <SelectContent>
            {WORKPLACES.map((workplace) => (
              <SelectItem key={workplace.id} value={workplace.id}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <div>
                    <p className="font-medium">{workplace.name}</p>
                    <p className="text-xs text-gray-600">{workplace.address}</p>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Display selected workplace details */}
        {selectedWorkplace && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-blue-900">
              Selected: {selectedWorkplace.name}
            </p>
            <p className="text-xs text-blue-700">{selectedWorkplace.address}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
