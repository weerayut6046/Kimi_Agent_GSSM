import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, MoreVertical, User, Mail, Check, X, FileSpreadsheet, Building } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useStations } from '@/contexts/StationContext';
import { TableSkeleton } from '@/components/common/LoadingPage';

import type { EmployeeProfile } from '@/types';
import { exportTableToExcel } from '@/lib/exportUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const Employees: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { filteredEmployees, positions, skills, isLoading, addEmployee, updateEmployee, deleteEmployee, getUserByProfileId } = useEmployee();
  const { stations, currentStation } = useStations();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    positionId: '',
    stationId: '',
    skillIds: [] as string[],
    status: 'active' as 'active' | 'inactive',
    role: 'staff' as 'admin' | 'manager' | 'staff',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="จัดการพนักงาน" subtitle="เพิ่ม แก้ไข และลบข้อมูลพนักงาน" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const searchFilteredEmployees = filteredEmployees.filter(
    (emp) =>
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm)
  );

  // Password strength check
  const getPasswordStrength = (password: string) => {
    const checks = [
      { label: 'ความยาวอย่างน้อย 8 ตัวอักษร', valid: password.length >= 8 },
      { label: 'มีตัวพิมพ์ใหญ่', valid: /[A-Z]/.test(password) },
      { label: 'มีตัวพิมพ์เล็ก', valid: /[a-z]/.test(password) },
      { label: 'มีตัวเลข', valid: /[0-9]/.test(password) },
      { label: 'มีอักขระพิเศษ', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
    ];
    const validCount = checks.filter(c => c.valid).length;
    return { checks, validCount, isStrong: validCount === 5 };
  };

  const handleAdd = async () => {
    const position = positions.find(p => p.id === formData.positionId);
    if (!position) return;

    // Validate password strength
    const strength = getPasswordStrength(formData.password);
    if (!strength.isStrong) {
      setSubmitError('รหัสผ่านไม่มีความปลอดภัยเพียงพอ กรุณาตรวจสอบความแข็งแกร่งของรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedSkills = skills.filter(s => formData.skillIds.includes(s.id));

      await addEmployee({
        fullName: formData.fullName,
        phone: formData.phone,
        positionId: formData.positionId,
        skills: selectedSkills,
        stationId: formData.stationId || currentStation?.id || 'station1',
        hireDate: new Date().toISOString().split('T')[0],
        status: formData.status,
        avatar: '',
        position,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding employee:', error);
      setSubmitError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างพนักงาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEmployee) return;

    // Validate password strength if provided
    if (formData.password) {
      const strength = getPasswordStrength(formData.password);
      if (!strength.isStrong) {
        setSubmitError('รหัสผ่านไม่มีความปลอดภัยเพียงพอ กรุณาตรวจสอบความแข็งแกร่งของรหัสผ่าน');
        return;
      }
    }

    const position = positions.find(p => p.id === formData.positionId);
    if (!position) return;

    const selectedSkills = skills.filter(s => formData.skillIds.includes(s.id));

    const updates: Partial<EmployeeProfile> & { email?: string; password?: string; role?: 'admin' | 'manager' | 'staff' } = {
      fullName: formData.fullName,
      phone: formData.phone,
      positionId: formData.positionId,
      stationId: formData.stationId,
      skills: selectedSkills,
      status: formData.status,
      position,
    };

    // Only include email if it changed
    const currentUser = getUserByProfileId(selectedEmployee.id);
    if (formData.email !== currentUser?.email) {
      updates.email = formData.email;
    }
    
    // Only include password if provided
    if (formData.password) {
      updates.password = formData.password;
    }
    
    // Only include role if it changed
    if (formData.role !== currentUser?.role) {
      updates.role = formData.role;
    }

    await updateEmployee(selectedEmployee.id, updates);

    setIsEditDialogOpen(false);
    setSelectedEmployee(null);
    resetForm();
  };

  const handleDelete = () => {
    if (selectedEmployee) {
      deleteEmployee(selectedEmployee.id);
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
    }
  };

  const openEditDialog = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    const user = getUserByProfileId(employee.id);
    setFormData({
      fullName: employee.fullName,
      email: user?.email || '',
      password: '', // Don't show password
      phone: employee.phone,
      positionId: employee.positionId,
      stationId: employee.stationId,
      skillIds: employee.skills.map(s => s.id),
      status: employee.status,
      role: user?.role || 'staff',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      positionId: '',
      stationId: currentStation?.id || '',
      skillIds: [],
      status: 'active',
      role: 'staff',
    });
  };

  const toggleSkill = (skillId: string) => {
    setFormData(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter(id => id !== skillId)
        : [...prev.skillIds, skillId],
    }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500">แอดมิน</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500">ผู้จัดการ</Badge>;
      case 'staff':
        return <Badge variant="secondary">พนักงาน</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <div>
      <Header
        title="จัดการพนักงาน"
        subtitle="ดูและจัดการข้อมูลพนักงานและบัญชีผู้ใช้ทั้งหมด"
        onMenuClick={onMenuClick}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportTableToExcel(
                  searchFilteredEmployees.map((e) => {
                    const u = getUserByProfileId(e.id);
                    return {
                      id: e.id,
                      fullName: e.fullName,
                      email: u?.email || '',
                      role: u?.role || '',
                      station: stations.find(s => s.id === e.stationId)?.name || '',
                      position: e.position?.name || '',
                      phone: e.phone || '',
                      status: e.status,
                      hireDate: e.hireDate,
                    };
                  }),
                  {
                    fullName: 'ชื่อ-นามสกุล',
                    email: 'อีเมล',
                    role: 'สิทธิ์',
                    position: 'ตำแหน่ง',
                    phone: 'เบอร์โทร',
                    status: 'สถานะ',
                    hireDate: 'วันที่เริ่มงาน',
                  },
                  'รายชื่อพนักงาน'
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มพนักงาน
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลพนักงานและบัญชีผู้ใช้ใหม่ด้านล่าง
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>ชื่อ-นามสกุล</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="ชื่อ นามสกุล"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>เบอร์โทรศัพท์</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081-234-5678"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    ข้อมูลบัญชีผู้ใช้
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>อีเมล <span className="text-red-500">*</span></Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>รหัสผ่าน <span className="text-red-500">*</span></Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="********"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>สิทธิ์ผู้ใช้</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: 'admin' | 'manager' | 'staff') => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">แอดมิน</SelectItem>
                          <SelectItem value="manager">ผู้จัดการ</SelectItem>
                          <SelectItem value="staff">พนักงาน</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>สาขา</Label>
                  <Select
                    value={formData.stationId}
                    onValueChange={(value) => setFormData({ ...formData, stationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสาขา" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ตำแหน่ง</Label>
                  <Select
                    value={formData.positionId}
                    onValueChange={(value) => setFormData({ ...formData, positionId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกตำแหน่ง" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>ทักษะ</Label>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={formData.skillIds.includes(skill.id)}
                          onCheckedChange={() => toggleSkill(skill.id)}
                        />
                        <span className="text-sm">{skill.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleAdd}
                  disabled={isSubmitting || !formData.fullName || !formData.email || !formData.password || !formData.positionId || !getPasswordStrength(formData.password).isStrong}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ค้นหาพนักงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employee Table Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>พนักงาน</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>สิทธิ์</TableHead>
                  <TableHead>สาขา</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>ทักษะ</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchFilteredEmployees.length > 0 ? (
                  searchFilteredEmployees.map((employee) => {
                    const user = getUserByProfileId(employee.id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-medium">{employee.fullName}</p>
                              <p className="text-sm text-slate-500">
                                เริ่มงาน {new Date(employee.hireDate).toLocaleDateString('th-TH')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user?.email ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {user.email}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user ? getRoleBadge(user.role) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Building className="w-3 h-3 text-slate-400" />
                            {stations.find(s => s.id === employee.stationId)?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>{employee.position?.name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(employee.skills || []).map((skill) => (
                              <Badge key={skill.id} variant="secondary" className="text-xs">
                                {skill.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={employee.status === 'active' ? 'default' : 'secondary'}
                          >
                            {employee.status === 'active' ? 'ทำงาน' : 'ไม่ทำงาน'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                แก้ไข
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(employee)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                ลบ
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูลพนักงาน
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Employee Cards Mobile */}
        <div className="md:hidden space-y-3">
          {searchFilteredEmployees.length > 0 ? (
            searchFilteredEmployees.map((employee) => {
              const user = getUserByProfileId(employee.id);
              return (
                <Card key={employee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{employee.fullName}</p>
                          <p className="text-sm text-slate-500 truncate">{employee.position?.name || '-'}</p>
                          {stations.find(s => s.id === employee.stationId)?.name && (
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {stations.find(s => s.id === employee.stationId)?.name}
                            </p>
                          )}
                          {user?.email && (
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0 min-w-[44px] min-h-[44px]">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(employee)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {user ? getRoleBadge(user.role) : <span className="text-slate-400">-</span>}
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status === 'active' ? 'ทำงาน' : 'ไม่ทำงาน'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(employee.skills || []).map((skill) => (
                        <Badge key={skill.id} variant="secondary" className="text-xs">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-center py-8 text-slate-500">ไม่พบข้อมูลพนักงาน</p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลพนักงานและบัญชีผู้ใช้ด้านล่าง
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อ-นามสกุล</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                ข้อมูลบัญชีผู้ใช้
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>อีเมล</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="********"
                  />
                  {formData.password && (
                    <div className="space-y-1 mt-2 p-2 bg-slate-50 rounded-md">
                      {getPasswordStrength(formData.password).checks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {check.valid ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span className={check.valid ? 'text-green-600' : 'text-slate-500'}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>สิทธิ์ผู้ใช้</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'manager' | 'staff') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">แอดมิน</SelectItem>
                      <SelectItem value="manager">ผู้จัดการ</SelectItem>
                      <SelectItem value="staff">พนักงาน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>ตำแหน่ง</Label>
              <Select
                value={formData.positionId}
                onValueChange={(value) => setFormData({ ...formData, positionId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ทักษะ</Label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <label
                    key={skill.id}
                    className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={formData.skillIds.includes(skill.id)}
                      onCheckedChange={() => toggleSkill(skill.id)}
                    />
                    <span className="text-sm">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
              {submitError}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSubmitError(null); }}>
              ยกเลิก
            </Button>
            <Button onClick={handleEdit}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบพนักงาน {selectedEmployee?.fullName}?
              การกระทำนี้จะลบข้อมูลพนักงานและบัญชีผู้ใช้ทั้งหมด และไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
