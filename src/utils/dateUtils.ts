import { format, parseISO, startOfWeek, endOfWeek, addDays, isSameDay, isToday, isPast, isFuture } from 'date-fns';
import { th } from 'date-fns/locale';

// Format date to Thai format
export const formatThaiDate = (date: string | Date, formatStr: string = 'dd MMMM yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: th });
};

// Format date to short Thai format
export const formatShortThaiDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: th });
};

// Format time
export const formatTime = (time: string): string => {
  return time.substring(0, 5);
};

// Format date time
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: th });
};

// Get day name in Thai
export const getDayName = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE', { locale: th });
};

// Get short day name in Thai
export const getShortDayName = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE', { locale: th });
};

// Get current week range
export const getCurrentWeekRange = (): { start: string; end: string } => {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Start from Monday
  const end = endOfWeek(today, { weekStartsOn: 1 });
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

// Get week days
export const getWeekDays = (startDate: string): string[] => {
  const start = parseISO(startDate);
  const days: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    days.push(day.toISOString().split('T')[0]);
  }
  
  return days;
};

// Check if date is today
export const isDateToday = (date: string): boolean => {
  return isToday(parseISO(date));
};

// Check if date is past
export const isDatePast = (date: string): boolean => {
  return isPast(parseISO(date));
};

// Check if date is future
export const isDateFuture = (date: string): boolean => {
  return isFuture(parseISO(date));
};

// Compare two dates
export const isSameDate = (date1: string, date2: string): boolean => {
  return isSameDay(parseISO(date1), parseISO(date2));
};

// Add days to date
export const addDaysToDate = (date: string, days: number): string => {
  const d = parseISO(date);
  return addDays(d, days).toISOString().split('T')[0];
};

// Get month name in Thai
export const getMonthName = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMMM yyyy', { locale: th });
};

// Parse time string to minutes
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Calculate duration between two times
export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  // Handle overnight shift
  if (end < start) {
    return (24 * 60 - start) + end;
  }
  
  return end - start;
};

// Format duration to hours and minutes
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} ชั่วโมง`;
  }
  
  return `${hours} ชั่วโมง ${mins} นาที`;
};

// Get current date in ISO format
export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get current date time in ISO format
export const getCurrentDateTime = (): string => {
  return new Date().toISOString();
};
