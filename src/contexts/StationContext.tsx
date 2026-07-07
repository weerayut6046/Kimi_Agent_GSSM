import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { Station, StationContextType } from '@/types';
import { stationStorage } from '@/data/storage';
import { toast } from 'sonner';
import { subscribeToTable } from '@/lib/realtime';

const StationContext = createContext<StationContextType | undefined>(undefined);

export const StationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [currentStation, setCurrentStationState] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStations = useCallback(async () => {
    try {
      const data = await stationStorage.getAll();
      setStations(data);
      return data;
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('ไม่สามารถโหลดข้อมูลสาขาได้');
      return [];
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const loadedStations = await fetchStations();

        // Restore current station from localStorage
        const savedStationId = localStorage.getItem('currentStationId');
        if (savedStationId) {
          const savedStation = loadedStations.find(s => s.id === savedStationId);
          if (savedStation) {
            setCurrentStationState(savedStation);
          }
        }
      } catch (error) {
        console.error('Error loading station data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchStations]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToTable({
      table: 'stations',
      onEvent: () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(async () => {
          try {
            const data = await stationStorage.getAll();
            setStations(data);
          } catch (error) {
            console.error('Error reloading stations from realtime:', error);
          }
        }, 800);
      },
    });
    return unsubscribe;
  }, []);

  const setCurrentStation = useCallback((station: Station | null) => {
    setCurrentStationState(station);
    if (station) {
      localStorage.setItem('currentStationId', station.id);
    } else {
      localStorage.removeItem('currentStationId');
    }
  }, []);

  const createStation = useCallback(async (station: Omit<Station, 'id'>) => {
    const newId = `stn${Date.now()}`;
    const newStation: Station = {
      ...station,
      id: newId,
    };

    const success = await stationStorage.create(newStation);
    if (!success) {
      throw new Error('ไม่สามารถสร้างสาขาได้');
    }

    setStations(prev => [...prev, newStation]);
    toast.success(`สร้างสาขา "${newStation.name}" สำเร็จ`);
  }, []);

  const updateStation = useCallback(async (id: string, data: Partial<Station>) => {
    const success = await stationStorage.update(id, data);
    if (!success) {
      throw new Error('ไม่สามารถอัปเดตสาขาได้');
    }

    setStations(prev =>
      prev.map(s => (s.id === id ? { ...s, ...data } : s))
    );

    if (currentStation?.id === id) {
      setCurrentStationState(prev => (prev ? { ...prev, ...data } : null));
    }

    toast.success('อัปเดตข้อมูลสาขาสำเร็จ');
  }, [currentStation]);

  const deleteStation = useCallback(async (id: string) => {
    const success = await stationStorage.delete(id);
    if (!success) {
      throw new Error('ไม่สามารถลบสาขาได้');
    }

    setStations(prev => prev.filter(s => s.id !== id));

    if (currentStation?.id === id) {
      setCurrentStationState(null);
      localStorage.removeItem('currentStationId');
    }

    toast.success('ลบสาขาสำเร็จ');
  }, [currentStation]);

  const value = useMemo<StationContextType>(() => ({
    stations,
    currentStation,
    isLoading,
    fetchStations,
    setCurrentStation,
    createStation,
    updateStation,
    deleteStation,
  }), [stations, currentStation, isLoading, fetchStations, setCurrentStation, createStation, updateStation, deleteStation]);

  return <StationContext.Provider value={value}>{children}</StationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStations = (): StationContextType => {
  const context = useContext(StationContext);
  if (context === undefined) {
    throw new Error('useStations must be used within a StationProvider');
  }
  return context;
};
