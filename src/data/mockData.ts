import type {
  User,
  EmployeeProfile,
  Position,
  Skill,
  Station,
  Shift,
  Schedule,
  LeaveRequest,
  SwapRequest,
  Attendance,
  Notification,
  DailyAccounting,
  FuelPrice,
} from '@/types';

// Positions
export const mockPositions: Position[] = [
  { id: 'pos1', name: 'พนักงานเติมน้ำมัน', description: 'เติมน้ำมันและดูแลลูกค้าที่ปั๊ม' },
  { id: 'pos2', name: 'แคชเชียร์', description: 'รับเงินและให้บริการที่เคาน์เตอร์' },
  { id: 'pos3', name: 'ผู้จัดการสาขา', description: 'ดูแลการดำเนินงานทั้งหมดของสาขา' },
  { id: 'pos4', name: 'พนักงานอเนกประสงค์', description: 'ช่วยงานทุกแผนกตามต้องการ' },
];

// Skills
export const mockSkills: Skill[] = [
  { id: 'skill1', name: 'เติมน้ำมัน', code: 'FUEL' },
  { id: 'skill2', name: 'รับเงิน', code: 'CASHIER' },
  { id: 'skill3', name: 'สต็อกสินค้า', code: 'STOCK' },
  { id: 'skill4', name: 'ซ่อมบำรุง', code: 'MAINTENANCE' },
];

// Stations
export const mockStations: Station[] = [
  {
    id: 'station1',
    name: 'ปั๊มน้ำมันสาขาหลัก',
    address: '123 ถนนสุขุมวิท กรุงเทพฯ',
    phone: '02-123-4567',
    managerId: 'emp3',
  },
];

// Shifts
export const mockShifts: Shift[] = [
  {
    id: 'shift1',
    name: 'กะเช้า',
    startTime: '06:00',
    endTime: '14:00',
    minStaff: 3,
    requiredSkills: ['skill1', 'skill2'],
    color: '#22c55e',
  },
  {
    id: 'shift2',
    name: 'กะบ่าย',
    startTime: '14:00',
    endTime: '22:00',
    minStaff: 3,
    requiredSkills: ['skill1', 'skill2'],
    color: '#3b82f6',
  },
  {
    id: 'shift3',
    name: 'กะดึก',
    startTime: '22:00',
    endTime: '06:00',
    minStaff: 2,
    requiredSkills: ['skill1', 'skill2'],
    color: '#8b5cf6',
  },
];

// Users
export const mockUsers: User[] = [
  {
    id: 'user1',
    authUid: '', // Will be set after creating Supabase Auth user
    email: 'admin@gasstation.com',
    password: 'Admin@123',
    role: 'admin',
    profileId: 'emp1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    authUid: '',
    email: 'somchai@gasstation.com',
    password: 'Staff@123',
    role: 'staff',
    profileId: 'emp2',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user3',
    authUid: '',
    email: 'manager@gasstation.com',
    password: 'Manager@123',
    role: 'manager',
    profileId: 'emp3',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user4',
    authUid: '',
    email: 'somying@gasstation.com',
    password: 'Staff@123',
    role: 'staff',
    profileId: 'emp4',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user5',
    authUid: '',
    email: 'mani@gasstation.com',
    password: 'Staff@123',
    role: 'staff',
    profileId: 'emp5',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user6',
    authUid: '',
    email: 'prasit@gasstation.com',
    password: 'Staff@123',
    role: 'staff',
    profileId: 'emp6',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Employee Profiles
export const mockEmployees: EmployeeProfile[] = [
  {
    id: 'emp1',
    userId: 'user1',
    fullName: 'แอดมิน ระบบ',
    phone: '081-111-1111',
    avatar: '',
    positionId: 'pos3',
    position: mockPositions[2],
    skills: [mockSkills[0], mockSkills[1], mockSkills[2]],
    stationId: 'station1',
    status: 'active',
    hireDate: '2020-01-01',
  },
  {
    id: 'emp2',
    userId: 'user2',
    fullName: 'สมชาย ใจดี',
    phone: '082-222-2222',
    avatar: '',
    positionId: 'pos1',
    position: mockPositions[0],
    skills: [mockSkills[0]],
    stationId: 'station1',
    status: 'active',
    hireDate: '2022-03-15',
  },
  {
    id: 'emp3',
    userId: 'user3',
    fullName: 'มานะ พยายาม',
    phone: '083-333-3333',
    avatar: '',
    positionId: 'pos3',
    position: mockPositions[2],
    skills: [mockSkills[0], mockSkills[1], mockSkills[2]],
    stationId: 'station1',
    status: 'active',
    hireDate: '2019-06-01',
  },
  {
    id: 'emp4',
    userId: 'user4',
    fullName: 'สมหญิง รักงาน',
    phone: '084-444-4444',
    avatar: '',
    positionId: 'pos2',
    position: mockPositions[1],
    skills: [mockSkills[1]],
    stationId: 'station1',
    status: 'active',
    hireDate: '2021-08-20',
  },
  {
    id: 'emp5',
    userId: 'user5',
    fullName: 'มานี ขยันทำ',
    phone: '085-555-5555',
    avatar: '',
    positionId: 'pos4',
    position: mockPositions[3],
    skills: [mockSkills[0], mockSkills[1]],
    stationId: 'station1',
    status: 'active',
    hireDate: '2023-01-10',
  },
  {
    id: 'emp6',
    userId: 'user6',
    fullName: 'ประสิทธิ์ เก่งกาจ',
    phone: '086-666-6666',
    avatar: '',
    positionId: 'pos1',
    position: mockPositions[0],
    skills: [mockSkills[0], mockSkills[3]],
    stationId: 'station1',
    status: 'active',
    hireDate: '2022-11-05',
  },
];

// Generate sample schedules for current week
const generateMockSchedules = (): Schedule[] => {
  const schedules: Schedule[] = [];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const employees = mockEmployees.filter(e => e.position.name !== 'ผู้จัดการสาขา');
  const shiftPattern = [
    ['shift1', 'shift1', 'shift2', 'shift2', 'shift3', null, null],
    ['shift2', 'shift2', 'shift1', 'shift1', 'shift1', 'shift3', null],
    ['shift3', 'shift3', 'shift3', null, null, 'shift1', 'shift1'],
    ['shift1', 'shift2', 'shift2', 'shift3', null, null, 'shift1'],
    [null, 'shift1', 'shift1', 'shift1', 'shift2', 'shift2', 'shift3'],
  ];
  
  employees.forEach((emp, empIndex) => {
    const pattern = shiftPattern[empIndex % shiftPattern.length];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const shiftId = pattern[i];
      
      if (shiftId) {
        const shift = mockShifts.find(s => s.id === shiftId)!;
        schedules.push({
          id: `sched-${emp.id}-${i}`,
          date: date.toISOString().split('T')[0],
          shiftId: shiftId,
          shift: shift,
          employeeId: emp.id,
          employee: emp,
          stationId: 'station1',
          status: i < today.getDay() ? 'completed' : 'scheduled',
          note: '',
          createdBy: 'user3',
          createdAt: '2024-01-01T00:00:00Z',
        });
      }
    }
  });
  
  return schedules;
};

export const mockSchedules: Schedule[] = generateMockSchedules();

// Leave Requests
export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave1',
    employeeId: 'emp2',
    employee: mockEmployees[1],
    type: 'sick',
    startDate: '2024-03-25',
    endDate: '2024-03-26',
    days: 2,
    reason: 'เป็นไข้หวัด',
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    createdAt: '2024-03-20T10:00:00Z',
  },
  {
    id: 'leave2',
    employeeId: 'emp4',
    employee: mockEmployees[3],
    type: 'personal',
    startDate: '2024-03-28',
    endDate: '2024-03-28',
    days: 1,
    reason: 'ติดธุระส่วนตัว',
    status: 'approved',
    approvedBy: 'emp3',
    approvedAt: '2024-03-21T14:00:00Z',
    createdAt: '2024-03-19T09:00:00Z',
  },
];

// Swap Requests - ใช้ schedule ที่มีอยู่จริงจาก mockSchedules
const getScheduleByIndex = (empId: string, dayIndex: number) => {
  return mockSchedules.find(s => s.id === `sched-${empId}-${dayIndex}`);
};

const emp2Schedule = getScheduleByIndex('emp2', 4);
const emp5Schedule = getScheduleByIndex('emp5', 4);

export const mockSwapRequests: SwapRequest[] = [];

// เพิ่ม swap request ถ้ามี schedule ที่ต้องการ
if (emp2Schedule && emp5Schedule) {
  mockSwapRequests.push({
    id: 'swap1',
    requesterId: 'emp2',
    requester: mockEmployees[1],
    requestedId: 'emp5',
    requested: mockEmployees[4],
    scheduleId: emp2Schedule.id,
    schedule: emp2Schedule,
    targetScheduleId: emp5Schedule.id,
    targetSchedule: emp5Schedule,
    status: 'pending',
    approvedBy: null,
    createdAt: '2024-03-22T16:00:00Z',
  });
}

// Attendance Records
export const mockAttendances: Attendance[] = [
  {
    id: 'att1',
    employeeId: 'emp2',
    employee: mockEmployees[1],
    scheduleId: 'sched-emp2-0',
    schedule: mockSchedules.find(s => s.id === 'sched-emp2-0')!,
    checkIn: '2024-03-18T06:05:00Z',
    checkOut: '2024-03-18T14:00:00Z',
    checkInLocation: 'ปั๊มน้ำมันสาขาหลัก',
    checkOutLocation: 'ปั๊มน้ำมันสาขาหลัก',
    note: '',
    status: 'normal',
  },
  {
    id: 'att2',
    employeeId: 'emp4',
    employee: mockEmployees[3],
    scheduleId: 'sched-emp4-0',
    schedule: mockSchedules.find(s => s.id === 'sched-emp4-0')!,
    checkIn: '2024-03-18T14:15:00Z',
    checkOut: '2024-03-18T22:00:00Z',
    checkInLocation: 'ปั๊มน้ำมันสาขาหลัก',
    checkOutLocation: 'ปั๊มน้ำมันสาขาหลัก',
    note: 'มาสาย 15 นาที',
    status: 'late',
  },
];

// Fuel Prices
export const mockFuelPrices: FuelPrice[] = [
  {
    id: 'price1',
    '95': 49.35,
    'B7': 37.45,
    'B10': 36.95,
    'Diesel': 32.99,
    effectiveDate: '2026-03-01',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

// Daily Accounting Records
export const mockDailyAccounts: DailyAccounting[] = [
  {
    id: 'acc1',
    date: '2026-03-24',
    shiftId: 'shift1',
    shift: mockShifts[0],
    employeeId: 'emp4',
    employee: mockEmployees[3],
    // ตู้จ่ายน้ำมัน 2 ตู้
    // ตู้ที่ 1: หัว 1 = 95, หัว 2 = Diesel
    // ตู้ที่ 2: หัว 1 = 95, หัว 2 = B7
    fuelMeter: {
      dispenser1: {
        nozzle1: { start: 15420.5, end: 15673.2, fuelType: '95' },
        nozzle2: { start: 8500.0, end: 8750.5, fuelType: 'Diesel' },
      },
      dispenser2: {
        nozzle1: { start: 22340.8, end: 22615.3, fuelType: '95' },
        nozzle2: { start: 18750.2, end: 19042.8, fuelType: 'B7' },
      },
    },
    fuelSales: {
      '95': 527.5,  // 252.7 (ตู้1) + 274.5 (ตู้2)
      'B7': 292.6,
      'B10': 0,
      'Diesel': 250.5,
    },
    fuelAmount: {
      '95': 26032.13,
      'B7': 10957.87,
      'B10': 0,
      'Diesel': 8264.00,
    },
    totalFuelAmount: 45254.00,
    systemAmount: 45254,
    cashAmount: 45250,
    dispenserCash: {
      dispenser1: {
        nozzle1: { start: 10000, end: 22500 }, // 95
        nozzle2: { start: 10000, end: 15000 }  // Diesel
      },
      dispenser2: {
        nozzle1: { start: 8000, end: 18250 },  // 95
        nozzle2: { start: 7000, end: 14500 }   // B7
      },
    },
    items: {
      twoT: 0,
      capital: 10000,
      transfer: 700,
      others: 0,
    },
    totalAmount: 55950,
    difference: -4,
    note: 'ยอดขายปกติ',
    createdAt: '2026-03-24T14:00:00Z',
    updatedAt: '2026-03-24T14:00:00Z',
  },
  {
    id: 'acc2',
    date: '2026-03-24',
    shiftId: 'shift2',
    shift: mockShifts[1],
    employeeId: 'emp2',
    employee: mockEmployees[1],
    fuelMeter: {
      dispenser1: {
        nozzle1: { start: 15673.2, end: 15928.5, fuelType: '95' },
        nozzle2: { start: 8750.5, end: 9005.2, fuelType: 'Diesel' },
      },
      dispenser2: {
        nozzle1: { start: 22615.3, end: 22892.8, fuelType: '95' },
        nozzle2: { start: 19042.8, end: 19338.4, fuelType: 'B7' },
      },
    },
    fuelSales: {
      '95': 530.3,  // 255.3 + 275.0
      'B7': 295.6,
      'B10': 0,
      'Diesel': 254.7,
    },
    fuelAmount: {
      '95': 26170.31,
      'B7': 11070.22,
      'B10': 0,
      'Diesel': 8402.49,
    },
    totalFuelAmount: 45643.02,
    systemAmount: 45643,
    cashAmount: 45650,
    dispenserCash: {
      dispenser1: {
        nozzle1: { start: 22500, end: 35000 }, // 95
        nozzle2: { start: 15000, end: 20000 }  // Diesel
      },
      dispenser2: {
        nozzle1: { start: 18250, end: 29250 }, // 95
        nozzle2: { start: 14500, end: 22000 }  // B7
      },
    },
    items: {
      twoT: 0,
      capital: 0,
      transfer: 0,
      others: 0,
    },
    totalAmount: 45650,
    difference: 7,
    note: '',
    createdAt: '2026-03-24T22:00:00Z',
    updatedAt: '2026-03-24T22:00:00Z',
  },
];

// Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    userId: 'user3',
    title: 'คำขอลาใหม่',
    message: 'สมชาย ใจดี ขอลาป่วย 2 วัน',
    type: 'info',
    read: false,
    createdAt: '2024-03-20T10:00:00Z',
  },
  {
    id: 'notif2',
    userId: 'user3',
    title: 'คำขอสลับกะ',
    message: 'สมชาย ใจดี ขอสลับกะกับ มานี ขยันทำ',
    type: 'info',
    read: false,
    createdAt: '2024-03-22T16:00:00Z',
  },
];
