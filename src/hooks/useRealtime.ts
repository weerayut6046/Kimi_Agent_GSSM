import { useEffect, useRef } from 'react';
import { subscribeToTable, subscribeToTables, type RealtimeTableConfig } from '@/lib/realtime';

/**
 * React hook to subscribe to realtime changes on a single Supabase table.
 * Automatically unsubscribes on unmount.
 */
export function useRealtimeSubscription(config: RealtimeTableConfig) {
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    const unsubscribe = subscribeToTable({
      ...configRef.current,
    });
    return unsubscribe;
  }, [config.table, config.event, config.filter]);
}

/**
 * React hook to subscribe to realtime changes on multiple Supabase tables.
 * Automatically unsubscribes all on unmount.
 */
export function useRealtimeSubscriptions(configs: RealtimeTableConfig[]) {
  const configsRef = useRef(configs);
  const depsKey = configs.map((c) => `${c.table}:${c.event}:${c.filter}`).join(',');

  useEffect(() => {
    configsRef.current = configs;
  });

  useEffect(() => {
    const unsubscribe = subscribeToTables(configsRef.current);
    return unsubscribe;
  }, [depsKey]);
}
