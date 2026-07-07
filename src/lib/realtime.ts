import { supabase } from './supabase';
import { toast } from 'sonner';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeTableConfig {
  table: string;
  event?: RealtimeEventType;
  filter?: string;
  onEvent?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
  onInsert?: (record: Record<string, unknown>) => void;
  onUpdate?: (record: Record<string, unknown>) => void;
  onDelete?: (record: Record<string, unknown>) => void;
  showToast?: boolean;
  toastMessage?: string;
  toastCondition?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE') => boolean;
}

let channelCounter = 0;

function generateChannelName(table: string, filter?: string): string {
  const suffix = ++channelCounter;
  const base = filter
    ? `realtime-${suffix}:${table}:${filter}`
    : `realtime-${suffix}:${table}`;
  return base;
}

/**
 * Subscribe to realtime changes on a Supabase table.
 * Returns an unsubscribe function.
 */
export function subscribeToTable(config: RealtimeTableConfig): () => void {
  const {
    table,
    event = '*',
    filter,
    onEvent,
    onInsert,
    onUpdate,
    onDelete,
    showToast = false,
    toastMessage,
    toastCondition,
  } = config;

  const channelName = generateChannelName(table, filter);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload as {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        };

        onEvent?.({ eventType, new: newRecord, old: oldRecord });

        if (eventType === 'INSERT') onInsert?.(newRecord);
        if (eventType === 'UPDATE') onUpdate?.(newRecord);
        if (eventType === 'DELETE') onDelete?.(oldRecord);

        if (showToast && toastMessage) {
          const shouldShow = toastCondition ? toastCondition(eventType) : true;
          if (shouldShow) {
            toast.info(toastMessage, { duration: 3000 });
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error for ${table}`);
      }
    });

  return () => {
    supabase.removeChannel(channel).catch((err) => {
      console.error(`[Realtime] Failed to remove channel for ${table}:`, err);
    });
  };
}

/**
 * Subscribe to multiple tables at once.
 * Returns a single unsubscribe function that cleans up all subscriptions.
 */
export function subscribeToTables(configs: RealtimeTableConfig[]): () => void {
  const unsubscribes = configs.map((config) => subscribeToTable(config));
  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
