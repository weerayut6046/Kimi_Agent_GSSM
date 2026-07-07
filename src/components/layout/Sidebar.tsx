import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Repeat,
  Clock,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Fuel,
  X,
  Bell,
  Package,
  Tag,
  Truck,
  ShoppingCart,
  UserCircle,
  Building2,
  Banknote,
  ShieldAlert,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'หลัก',
    items: [
      { path: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
      { path: '/pos', label: 'ขายหน้าร้าน', icon: ShoppingCart, roles: ['admin', 'manager', 'staff'] },
      { path: '/attendance', label: 'ลงเวลา', icon: Clock, roles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    label: 'งานและบุคคล',
    items: [
      { path: '/schedule', label: 'ตารางกะ', icon: Calendar, roles: ['admin', 'manager', 'staff'] },
      { path: '/employees', label: 'พนักงาน', icon: Users, roles: ['admin', 'manager'] },
      { path: '/leave', label: 'คำขอลา', icon: FileText, roles: ['admin', 'manager', 'staff'] },
      { path: '/swap', label: 'สลับกะ', icon: Repeat, roles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    label: 'คลังและสินค้า',
    items: [
      { path: '/inventory', label: 'คลังน้ำมัน', icon: Fuel, roles: ['admin', 'manager'] },
      { path: '/products', label: 'สินค้า', icon: Package, roles: ['admin', 'manager'] },
      { path: '/suppliers', label: 'ซัพพลายเออร์', icon: Truck, roles: ['admin', 'manager'] },
      { path: '/promotions', label: 'โปรโมชั่น', icon: Tag, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'บัญชีและเงิน',
    items: [
      { path: '/accounting', label: 'บัญชีรายวัน', icon: DollarSign, roles: ['admin', 'manager'] },
      { path: '/reports', label: 'รายงาน', icon: BarChart3, roles: ['admin', 'manager'] },
      { path: '/payroll', label: 'เงินเดือน', icon: Banknote, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'สมาชิก',
    items: [
      { path: '/customers', label: 'สมาชิก', icon: UserCircle, roles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    label: 'แจ้งเตือน',
    items: [
      { path: '/notifications', label: 'แจ้งเตือน', icon: Bell, roles: ['admin', 'manager', 'staff'] },
      { path: '/alerts', label: 'แจ้งเตือนอัจฉริยะ', icon: ShieldAlert, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'ตั้งค่าระบบ',
    items: [
      { path: '/settings', label: 'ตั้งค่า', icon: Settings, roles: ['admin', 'manager'] },
      { path: '/audit-logs', label: 'ประวัติการเปลี่ยนแปลง', icon: ScrollText, roles: ['admin', 'manager'] },
      { path: '/stations', label: 'สาขา', icon: Building2, roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, profile, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const filteredGroups = useMemo(() => {
    if (!user) return [];
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.roles.includes(user.role)),
      }))
      .filter((group) => group.items.length > 0);
  }, [user]);

  if (!user) return null;

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
      }
      return parts[0].charAt(0);
    }
    return user.email.charAt(0).toUpperCase();
  };
  const displayName = profile?.fullName || user.email;
  const positionName = profile?.position?.name || user.role;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Close button for mobile */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white lg:hidden"
        aria-label="ปิดเมนู"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <NavLink
          to="/"
          className="flex items-center gap-3"
          aria-label="กลับหน้าแดชบอร์ด"
          onClick={onClose}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg leading-tight">Gas Station</span>
            <p className="text-xs text-slate-400">Shift Manager</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="เมนูหลัก">
        <ul className="space-y-1 px-3">
          {filteredGroups.map((group, groupIndex) => (
            <React.Fragment key={group.label}>
              {groupIndex > 0 && (
                <li className="mx-2 my-2 border-t border-slate-800/60" />
              )}
              <li className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </span>
              </li>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]',
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.path === '/notifications' && unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto text-[10px] px-1.5 py-0 h-5 min-w-[1.25rem] flex items-center justify-center"
                          aria-label={`${unreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน`}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 mb-4 p-2 rounded-lg transition-all duration-200',
              isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'
            )
          }
        >
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-medium">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{positionName}</p>
          </div>
        </NavLink>

        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors min-h-[44px]"
          aria-label="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
