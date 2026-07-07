import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { StationProvider } from '@/contexts/StationContext';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { ScheduleProvider } from '@/contexts/ScheduleContext';
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { DailyAccountingProvider } from '@/contexts/DailyAccountingContext';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { POSProvider } from '@/contexts/POSContext';
import { CustomerProvider } from '@/contexts/CustomerContext';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuditProvider } from '@/contexts/AuditContext';
import { PayrollProvider } from '@/contexts/PayrollContext';
import { PromotionProvider } from '@/contexts/PromotionContext';
import Layout from '@/components/layout/Layout';

import ProtectedRoute from '@/components/common/ProtectedRoute';
import { PageLoader } from '@/components/common/LoadingPage';
import Login from '@/pages/Login';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Employees = lazy(() => import('@/pages/Employees'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const Leave = lazy(() => import('@/pages/Leave'));
const Swap = lazy(() => import('@/pages/Swap'));
const Attendance = lazy(() => import('@/pages/Attendance'));
const DailyAccounting = lazy(() => import('@/pages/DailyAccounting'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const Profile = lazy(() => import('@/pages/Profile'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Products = lazy(() => import('@/pages/Products'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const POS = lazy(() => import('@/pages/POS'));
const Customers = lazy(() => import('@/pages/Customers'));
const Stations = lazy(() => import('@/pages/Stations'));
const Payroll = lazy(() => import('@/pages/Payroll'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const Promotions = lazy(() => import('@/pages/Promotions'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));

function App() {
  return (
    <ThemeProvider>
    <NetworkStatusProvider>
    <AuthProvider>
      <StationProvider>
      <AuditProvider>
      <EmployeeProvider>
        <NotificationProvider>
          <AlertProvider>
          <ScheduleProvider>
            <AttendanceProvider>
              <DailyAccountingProvider>
              <InventoryProvider>
                <POSProvider>
                  <CustomerProvider>
                    <PromotionProvider>
                    <PayrollProvider>
                    <BrowserRouter>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/login" element={<Login />} />

                          <Route element={<Layout />}>
                            <Route
                              path="/"
                              element={
                                <ProtectedRoute>
                                  <Dashboard />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/schedule"
                              element={
                                <ProtectedRoute>
                                  <Schedule />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/employees"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Employees />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/leave"
                              element={
                                <ProtectedRoute>
                                  <Leave />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/swap"
                              element={
                                <ProtectedRoute>
                                  <Swap />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/attendance"
                              element={
                                <ProtectedRoute>
                                  <Attendance />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/accounting"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <DailyAccounting />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/reports"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Reports />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Settings />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/profile"
                              element={
                                <ProtectedRoute>
                                  <Profile />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/notifications"
                              element={
                                <ProtectedRoute>
                                  <Notifications />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/inventory"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Inventory />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/products"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Products />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/suppliers"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Suppliers />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/customers"
                              element={
                                <ProtectedRoute>
                                  <Customers />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/stations"
                              element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                  <Stations />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/pos"
                              element={
                                <ProtectedRoute>
                                  <POS />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/payroll"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Payroll />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/alerts"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Alerts />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/promotions"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <Promotions />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/audit-logs"
                              element={
                                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                  <AuditLogs />
                                </ProtectedRoute>
                              }
                            />
                          </Route>

                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </BrowserRouter>
                  </PayrollProvider>
                    </PromotionProvider>
                  </CustomerProvider>
                </POSProvider>
              </InventoryProvider>
            </DailyAccountingProvider>
          </AttendanceProvider>
        </ScheduleProvider>
        </AlertProvider>
      </NotificationProvider>
    </EmployeeProvider>
  </AuditProvider>
  </StationProvider>
</AuthProvider>
</NetworkStatusProvider>
</ThemeProvider>
  );
}

export default App;
