import React, { useState } from 'react';
import { Building, ChevronDown, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStations } from '@/contexts/StationContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const StationSelector: React.FC = () => {
  const { stations, currentStation, setCurrentStation } = useStations();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Only show for admin/manager
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null;
  }

  const handleSelect = (station: typeof currentStation) => {
    setCurrentStation(station);
    setOpen(false);
    if (station) {
      toast.success(`เปลี่ยนเป็นสาขา ${station.name}`);
    } else {
      toast.info('แสดงข้อมูลทุกสาขา');
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'flex items-center gap-2 min-h-[40px] border-border',
            'hover:bg-muted'
          )}
        >
          <Building className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline max-w-[140px] truncate">
            {currentStation ? currentStation.name : 'ทุกสาขา'}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            !currentStation && 'bg-muted font-medium'
          )}
          onClick={() => handleSelect(null)}
        >
          <Store className="w-4 h-4 text-muted-foreground" />
          <span>ทุกสาขา</span>
        </DropdownMenuItem>
        {stations.length > 0 && (
          <div className="h-px bg-border my-1" />
        )}
        {stations.map((station) => (
          <DropdownMenuItem
            key={station.id}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              currentStation?.id === station.id && 'bg-muted font-medium'
            )}
            onClick={() => handleSelect(station)}
          >
            <Building className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{station.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StationSelector;
