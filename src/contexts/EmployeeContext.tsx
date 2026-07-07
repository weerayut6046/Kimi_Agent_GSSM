import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { EmployeeProfile, Position, Skill, EmployeeContextType, User } from '@/types';
import { employeeStorage, positionStorage, skillStorage, userStorage } from '@/data/storage';
import { getCache, setCache, clearCache } from '@/lib/cache';
import { useAuth } from './AuthContext';
import { useStations } from './StationContext';
import { subscribeToTables } from '@/lib/realtime';

const EMPLOYEES_CACHE = 'employees';
const POSITIONS_CACHE = 'positions';
const SKILLS_CACHE = 'skills';
const USERS_CACHE = 'users';

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentStation } = useStations();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadData = async () => {
      setIsLoading(true);
      
      // Try cache first (5 min TTL)
      const cachedEmployees = getCache<EmployeeProfile[]>(EMPLOYEES_CACHE, 5);
      const cachedPositions = getCache<Position[]>(POSITIONS_CACHE, 30);
      const cachedSkills = getCache<Skill[]>(SKILLS_CACHE, 30);
      const cachedUsers = getCache<User[]>(USERS_CACHE, 5);
      
      if (cachedEmployees && cachedPositions && cachedSkills && cachedUsers) {
        setEmployees(cachedEmployees);
        setPositions(cachedPositions);
        setSkills(cachedSkills);
        setUsers(cachedUsers);
        setIsLoading(false);
        return;
      }

      try {
        // Stagger loads: one at a time to avoid flooding Supabase
        const loadedPositions = cachedPositions || await positionStorage.getAll();
        setPositions(loadedPositions);
        setCache(POSITIONS_CACHE, loadedPositions);

        const loadedSkills = cachedSkills || await skillStorage.getAll();
        setSkills(loadedSkills);
        setCache(SKILLS_CACHE, loadedSkills);

        const loadedEmployees = cachedEmployees || await employeeStorage.getAll();
        setEmployees(loadedEmployees);
        setCache(EMPLOYEES_CACHE, loadedEmployees);

        const loadedUsers = cachedUsers || await userStorage.getAll();
        setUsers(loadedUsers);
        setCache(USERS_CACHE, loadedUsers);
      } catch (error) {
        console.error('Error loading employee data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const unsubscribes = subscribeToTables([
      {
        table: 'profiles',
        onEvent: () => {
          if (realtimeDebounceRef.current['profiles']) clearTimeout(realtimeDebounceRef.current['profiles']);
          realtimeDebounceRef.current['profiles'] = setTimeout(async () => {
            clearCache(EMPLOYEES_CACHE);
            try {
              const loaded = await employeeStorage.getAll();
              setEmployees(loaded);
              setCache(EMPLOYEES_CACHE, loaded);
            } catch (error) {
              console.error('Error reloading employees from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'users',
        onEvent: () => {
          if (realtimeDebounceRef.current['users']) clearTimeout(realtimeDebounceRef.current['users']);
          realtimeDebounceRef.current['users'] = setTimeout(async () => {
            clearCache(USERS_CACHE);
            try {
              const loaded = await userStorage.getAll();
              setUsers(loaded);
              setCache(USERS_CACHE, loaded);
            } catch (error) {
              console.error('Error reloading users from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'positions',
        onEvent: () => {
          if (realtimeDebounceRef.current['positions']) clearTimeout(realtimeDebounceRef.current['positions']);
          realtimeDebounceRef.current['positions'] = setTimeout(async () => {
            clearCache(POSITIONS_CACHE);
            try {
              const loaded = await positionStorage.getAll();
              setPositions(loaded);
              setCache(POSITIONS_CACHE, loaded);
            } catch (error) {
              console.error('Error reloading positions from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'skills',
        onEvent: () => {
          if (realtimeDebounceRef.current['skills']) clearTimeout(realtimeDebounceRef.current['skills']);
          realtimeDebounceRef.current['skills'] = setTimeout(async () => {
            clearCache(SKILLS_CACHE);
            try {
              const loaded = await skillStorage.getAll();
              setSkills(loaded);
              setCache(SKILLS_CACHE, loaded);
            } catch (error) {
              console.error('Error reloading skills from realtime:', error);
            }
          }, 800);
        },
      },
    ]);
    return unsubscribes;
  }, []);

  const addEmployee = useCallback(async (employee: Omit<EmployeeProfile, 'id' | 'firstName' | 'lastName' | 'userId'> & { email: string; password: string; role: 'admin' | 'manager' | 'staff' }) => {
    const newId = `emp${Date.now()}`;
    const newEmployee: EmployeeProfile = { ...employee, id: newId, userId: '', firstName: '', lastName: '' };
    const position = positions.find(p => p.id === employee.positionId);
    if (position) newEmployee.position = position;

    const success = await employeeStorage.create({ ...newEmployee, email: employee.email, password: employee.password, role: employee.role });
    if (!success) throw new Error('ไม่สามารถสร้างพนักงานได้');
    
    const updatedUsers = await userStorage.getAll();
    setUsers(updatedUsers);
    const updatedEmployees = await employeeStorage.getAll();
    setEmployees(updatedEmployees);
    setCache(EMPLOYEES_CACHE, updatedEmployees);
    setCache(USERS_CACHE, updatedUsers);
  }, [positions]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<EmployeeProfile> & { email?: string; password?: string; role?: 'admin' | 'manager' | 'staff' }) => {
    const currentEmployee = employees.find(e => e.id === id);
    if (!currentEmployee) return;

    const updatedEmployee = { ...currentEmployee, ...updates };
    if (updates.fullName) updatedEmployee.fullName = updates.fullName;
    if (updates.positionId) {
      const position = positions.find(p => p.id === updates.positionId);
      if (position) updatedEmployee.position = position;
    }

    await employeeStorage.update(id, updates);
    if (updates.email || updates.password || updates.role) {
      const updatedUsers = await userStorage.getAll();
      setUsers(updatedUsers);
      setCache(USERS_CACHE, updatedUsers);
    }
    setEmployees(prev => prev.map(e => e.id === id ? updatedEmployee : e));
    setCache(EMPLOYEES_CACHE, employees.map(e => e.id === id ? updatedEmployee : e));
  }, [employees, positions]);

  const deleteEmployee = useCallback(async (id: string) => {
    await employeeStorage.delete(id);
    const updatedUsers = await userStorage.getAll();
    setUsers(updatedUsers);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setCache(EMPLOYEES_CACHE, employees.filter(e => e.id !== id));
    setCache(USERS_CACHE, updatedUsers);
  }, [employees]);

  const getEmployeeById = useCallback((id: string): EmployeeProfile | undefined => employees.find(e => e.id === id), [employees]);
  const getUserByProfileId = useCallback((profileId: string): User | undefined => users.find(u => u.profileId === profileId), [users]);

  const filteredEmployees = useMemo(() => {
    if (!user) return employees;
    // Admin sees all if no station selected
    if (user.role === 'admin' && !currentStation) return employees;
    // Admin/manager sees selected station; staff sees their own station
    const stationId = currentStation?.id || profile?.stationId;
    if (!stationId) return employees;
    return employees.filter(e => e.stationId === stationId);
  }, [employees, user, currentStation, profile]);

  const value = useMemo<EmployeeContextType>(() => ({
    employees, filteredEmployees, positions, skills, users, isLoading,
    addEmployee, updateEmployee, deleteEmployee, getEmployeeById, getUserByProfileId,
  }), [employees, filteredEmployees, positions, skills, users, isLoading, addEmployee, updateEmployee, deleteEmployee, getEmployeeById, getUserByProfileId]);

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useEmployee = (): EmployeeContextType => {
  const context = useContext(EmployeeContext);
  if (context === undefined) throw new Error('useEmployee must be used within an EmployeeProvider');
  return context;
};
