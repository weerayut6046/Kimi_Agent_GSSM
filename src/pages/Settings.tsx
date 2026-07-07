import React, { useState, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Clock, Pencil, CalendarX, Download, Upload, Database, ScrollText, ChevronRight, Server } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStations } from '@/contexts/StationContext';

import { 
  backupStorage, 
  type BackupData, 
  backupTableLabels, 
  type BackupTableName 
} from '@/data/storage';
import { backupApi } from '@/lib/api';
import type { Shift } from '@/types';

const colorOptions = [
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
];

const emptyShiftForm = {
  name: '',
  startTime: '',
  endTime: '',
  minStaff: 2,
  color: '#3b82f6',
};

interface LayoutContext {
  onMenuClick: () => void;
}

const Settings: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { shifts, addShift, updateShift, deleteShift, clearAllSchedules } = useSchedule();
  const { employees, positions, skills } = useEmployee();
  const { user } = useAuth();
  const { currentStation } = useStations();
  const navigate = useNavigate();

  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [isAddShiftDialogOpen, setIsAddShiftDialogOpen] = useState(false);
  const [isEditShiftDialogOpen, setIsEditShiftDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearSchedulesDialogOpen, setIsClearSchedulesDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isDbBackupLoading, setIsDbBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<BackupData | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<{ currentTable: string; completed: number; total: number } | null>(null);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState(emptyShiftForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup/Restore selection states
  const [isBackupSelectOpen, setIsBackupSelectOpen] = useState(false);
  const [isRestoreSelectOpen, setIsRestoreSelectOpen] = useState(false);
  const [selectedBackupTables, setSelectedBackupTables] = useState<BackupTableName[]>([]);
  const [selectedRestoreTables, setSelectedRestoreTables] = useState<BackupTableName[]>([]);

  // All available tables for backup
  const allBackupTables: BackupTableName[] = [
    'users', 'profiles', 'positions', 'skills', 'profile_skills',
    'shifts', 'schedules', 'leave_requests', 'swap_requests',
    'attendances', 'daily_accounting', 'fuel_prices', 'notifications',
    'suppliers', 'products', 'fuel_inventory', 'fuel_deliveries',
    'product_transactions', 'sales',
  ];

  const resetForm = () => setShiftForm(emptyShiftForm);

  const handleOpenAdd = () => {
    resetForm();
    setIsAddShiftDialogOpen(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      minStaff: shift.minStaff,
      color: shift.color,
    });
    setIsEditShiftDialogOpen(true);
  };

  const handleAddShift = async () => {
    if (!canManage) return;
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const newShift = await addShift({
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        minStaff: shiftForm.minStaff,
        color: shiftForm.color,
      });

      if (newShift) {
        toast.success('เพิ่มกะการทำงานสำเร็จ');
        setIsAddShiftDialogOpen(false);
        resetForm();
      } else {
        toast.error('ไม่สามารถเพิ่มกะการทำงานได้');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มกะการทำงาน');
      console.error(error);
    }
  };

  const handleEditShift = async () => {
    if (!canManage || !editingShift) return;
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const success = await updateShift(editingShift.id, {
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        minStaff: shiftForm.minStaff,
        color: shiftForm.color,
      });

      if (success) {
        toast.success('แก้ไขกะการทำงานสำเร็จ');
        setIsEditShiftDialogOpen(false);
        setEditingShift(null);
        resetForm();
      } else {
        toast.error('ไม่สามารถแก้ไขกะการทำงานได้');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแก้ไขกะการทำงาน');
      console.error(error);
    }
  };

  const handleOpenDelete = (shift: Shift) => {
    if (!canManage) return;
    setDeletingShift(shift);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canManage || !deletingShift) return;
    
    try {
      const success = await deleteShift(deletingShift.id);
      if (success) {
        toast.success('ลบกะการทำงานสำเร็จ');
        setIsDeleteDialogOpen(false);
        setDeletingShift(null);
      } else {
        toast.error('ไม่สามารถลบกะการทำงานได้');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบกะการทำงาน');
      console.error(error);
    }
  };

  const handleClearAllSchedules = () => {
    if (!canManage) return;
    clearAllSchedules();
    setIsClearSchedulesDialogOpen(false);
  };

  // Backup Functions
  const handleOpenBackupSelect = () => {
    if (!isAdmin) {
      toast.error('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถสำรองข้อมูลได้');
      return;
    }
    // Default select all tables
    setSelectedBackupTables([...allBackupTables]);
    setIsBackupSelectOpen(true);
  };

  const handleBackup = async () => {
    if (!isAdmin || selectedBackupTables.length === 0) {
      toast.error('กรุณาเลือกตารางที่ต้องการสำรอง');
      return;
    }

    setIsBackupLoading(true);
    try {
      const backupData = await backupStorage.exportSelected(
        user?.email || 'unknown', 
        selectedBackupTables
      );
      backupStorage.downloadBackup(backupData);
      toast.success(`สำรองข้อมูลสำเร็จ (${selectedBackupTables.length} ตาราง) ไฟล์กำลังดาวน์โหลด...`);
      setIsBackupSelectOpen(false);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการสำรองข้อมูล');
      console.error(error);
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleTriggerDatabaseBackup = async () => {
    if (!isAdmin) {
      toast.error('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสำรองฐานข้อมูลได้');
      return;
    }

    setIsDbBackupLoading(true);
    try {
      const result = await backupApi.triggerDatabaseBackup();
      if (result.success) {
        toast.success(result.message || 'ส่งคำสั่งสำรองฐานข้อมูลสำเร็จ');
      } else {
        toast.error(result.error || 'ไม่สามารถส่งคำสั่งสำรองฐานข้อมูลได้');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งคำสั่งสำรองฐานข้อมูล';
      toast.error(message);
      console.error(error);
    } finally {
      setIsDbBackupLoading(false);
    }
  };

  const toggleBackupTable = (table: BackupTableName) => {
    setSelectedBackupTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAllBackupTables = () => {
    setSelectedBackupTables([...allBackupTables]);
  };

  const deselectAllBackupTables = () => {
    setSelectedBackupTables([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 50MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!backupStorage.validateBackup(data)) {
        toast.error('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const backupData = data as BackupData;
      setRestoreFile(backupData);

      // Get available tables from backup file
      const availableTables = Object.keys(backupData.tables).filter(
        (key) => backupData.tables[key as BackupTableName] && backupData.tables[key as BackupTableName]!.length > 0
      ) as BackupTableName[];

      setSelectedRestoreTables(availableTables);
      setIsRestoreSelectOpen(true);
    } catch {
      toast.error('ไม่สามารถอ่านไฟล์ได้');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRestoreTable = (table: BackupTableName) => {
    setSelectedRestoreTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAllRestoreTables = () => {
    if (restoreFile?.tables) {
      const availableTables = Object.keys(restoreFile.tables).filter(
        (key) => restoreFile.tables[key as BackupTableName]?.length && restoreFile.tables[key as BackupTableName]!.length > 0
      ) as BackupTableName[];
      setSelectedRestoreTables(availableTables);
    }
  };

  const deselectAllRestoreTables = () => {
    setSelectedRestoreTables([]);
  };

  const handleOpenRestoreConfirm = () => {
    if (selectedRestoreTables.length === 0) {
      toast.error('กรุณาเลือกตารางที่ต้องการกู้คืน');
      return;
    }
    setIsRestoreSelectOpen(false);
    setIsRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!isAdmin || !restoreFile) {
      toast.error('ไม่สามารถกู้คืนข้อมูลได้');
      return;
    }

    if (selectedRestoreTables.length === 0) {
      toast.error('กรุณาเลือกตารางที่ต้องการกู้คืน');
      return;
    }

    setIsRestoreLoading(true);
    setRestoreProgress(null);

    try {
      const result = await backupStorage.restoreFromBackup(
        restoreFile,
        selectedRestoreTables,
        (tableName, completed, total) => {
          setRestoreProgress({
            currentTable: backupTableLabels[tableName] || tableName,
            completed,
            total,
          });
        }
      );

      if (result.success) {
        toast.success(`กู้คืนข้อมูลสำเร็จ (${result.restoredTables.length} ตาราง) กรุณารีเฟรชหน้าเพื่อดูข้อมูลใหม่`);
        setIsRestoreDialogOpen(false);
        setRestoreFile(null);
        setSelectedRestoreTables([]);
        setRestoreProgress(null);
      } else {
        const failedMsg = result.failedTable
          ? `ล้มเหลวที่ตาราง "${backupTableLabels[result.failedTable as BackupTableName] || result.failedTable}"`
          : '';
        toast.error(`กู้คืนข้อมูลไม่สำเร็จ: ${result.error}${failedMsg ? ` (${failedMsg})` : ''}`);
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
      console.error(error);
    } finally {
      setIsRestoreLoading(false);
      setRestoreProgress(null);
    }
  };

  const renderShiftForm = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>ชื่อกะ</Label>
        <Input
          value={shiftForm.name}
          onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
          placeholder="เช่น กะเช้า"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>เวลาเริ่ม (24 ชม.)</Label>
          <Input
            type="time"
            step="60"
            value={shiftForm.startTime}
            onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
            placeholder="00:00"
          />
        </div>
        <div className="space-y-2">
          <Label>เวลาสิ้นสุด (24 ชม.)</Label>
          <Input
            type="time"
            step="60"
            value={shiftForm.endTime}
            onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
            placeholder="00:00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>จำนวนพนักงานขั้นต่ำ</Label>
        <Input
          type="number"
          min={1}
          value={shiftForm.minStaff}
          onChange={(e) => setShiftForm({ ...shiftForm, minStaff: parseInt(e.target.value) || 1 })}
        />
      </div>

      <div className="space-y-2">
        <Label>สี</Label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setShiftForm({ ...shiftForm, color })}
              className={`w-8 h-8 rounded-lg transition-all ${
                shiftForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Header
        title="ตั้งค่า"
        subtitle="จัดการการตั้งค่าระบบ"
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Shifts Configuration */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                กะการทำงาน
              </h3>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setIsClearSchedulesDialogOpen(true)}
                  >
                    <CalendarX className="w-4 h-4 mr-2" />
                    ล้างตารางกะ
                  </Button>
                  <Dialog open={isAddShiftDialogOpen} onOpenChange={setIsAddShiftDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={handleOpenAdd}>
                        <Plus className="w-4 h-4 mr-2" />
                        เพิ่มกะ
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>เพิ่มกะการทำงาน</DialogTitle>
                      <DialogDescription>
                        กำหนดกะการทำงานใหม่
                      </DialogDescription>
                    </DialogHeader>

                    {renderShiftForm()}

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddShiftDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button onClick={handleAddShift}>บันทึก</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              )}
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สี</TableHead>
                    <TableHead>ชื่อกะ</TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>พนักงานขั้นต่ำ</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: shift.color }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{shift.name}</TableCell>
                      <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                      <TableCell>{shift.minStaff} คน</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(shift)}
                                className="text-slate-600 min-w-[44px] min-h-[44px]"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDelete(shift)}
                                className="text-red-500 min-w-[44px] min-h-[44px]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Shift Dialog */}
        <Dialog open={isEditShiftDialogOpen} onOpenChange={setIsEditShiftDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>แก้ไขกะการทำงาน</DialogTitle>
              <DialogDescription>
                แก้ไขข้อมูลกะการทำงาน
              </DialogDescription>
            </DialogHeader>

            {renderShiftForm()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditShiftDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleEditShift}>บันทึก</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                ยืนยันการลบกะ
              </DialogTitle>
              <DialogDescription>
                คุณแน่ใจหรือไม่ว่าต้องการลบกะ <span className="font-medium text-slate-900">{deletingShift?.name}</span>?
                <br />
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                ลบ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear All Schedules Confirmation Dialog */}
        <Dialog open={isClearSchedulesDialogOpen} onOpenChange={setIsClearSchedulesDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <CalendarX className="w-5 h-5" />
                ล้างตารางกะทั้งหมด
              </DialogTitle>
              <DialogDescription>
                คุณแน่ใจหรือไม่ว่าต้องการลบตารางกะทั้งหมด?
                <br />
                <span className="text-red-500 font-medium">ข้อมูลตารางงานทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsClearSchedulesDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleClearAllSchedules}>
                ล้างทั้งหมด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Positions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">ตำแหน่งงาน</h3>

            <div className="flex flex-wrap gap-2">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg"
                >
                  <span className="font-medium">{position.name}</span>
                  <span className="text-sm text-slate-500">- {position.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">ทักษะ</h3>

            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="text-sm px-3 py-1">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore - Admin Only */}
        {isAdmin && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                สำรองและกู้คืนข้อมูล
              </h3>

              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  สำรองข้อมูลฐานข้อมูลทั้งหมดเป็นไฟล์ JSON หรือกู้คืนข้อมูลจากไฟล์สำรอง
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleOpenBackupSelect}
                    disabled={isBackupLoading}
                    className="min-h-[44px]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isBackupLoading ? 'กำลังสำรอง...' : 'สำรองข้อมูล JSON'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoreLoading}
                    className="min-h-[44px]"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isRestoreLoading ? 'กำลังกู้คืน...' : 'กู้คืนข้อมูล'}
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-3">
                    สำรองฐานข้อมูลระดับ database ด้วย pg_dump (เก็บ schema, indexes และข้อมูลทั้งหมด)
                  </p>

                  <Button
                    variant="secondary"
                    onClick={handleTriggerDatabaseBackup}
                    disabled={isDbBackupLoading}
                    className="min-h-[44px]"
                  >
                    <Server className="w-4 h-4 mr-2" />
                    {isDbBackupLoading ? 'กำลังส่งคำสั่ง...' : 'สำรองฐานข้อมูล (pg_dump)'}
                  </Button>
                </div>

                <div className="text-xs text-slate-400">
                  <p>• ไฟล์สำรอง JSON จะมีข้อมูลตามตารางที่เลือก สำหรับกู้คืนผ่านหน้าเว็บ</p>
                  <p>• การกู้คืนข้อมูลจะเขียนทับข้อมูลที่มีอยู่ (upsert)</p>
                  <p>• สำรองฐานข้อมูล (pg_dump) จะส่งคำสั่งไปยัง GitHub Actions และเก็บไฟล์ลง Supabase Storage</p>
                  <p>• แนะนำให้สำรองข้อมูลก่อนการกู้คืนเสมอ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Log Link - Admin Only */}
        {isAdmin && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/audit-logs')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <ScrollText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">ประวัติการเปลี่ยนแปลง</h3>
                    <p className="text-sm text-slate-500">ดูบันทึกการเปลี่ยนแปลงทั้งหมดในระบบ</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">ข้อมูลระบบ</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">ชื่อระบบ</span>
                <span className="font-medium">Gas Station Shift Manager</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">เวอร์ชัน</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">สาขา</span>
                <span className="font-medium">{currentStation?.name || 'ปั๊มน้ำมันสาขาหลัก'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">จำนวนพนักงาน</span>
                <span className="font-medium">{employees.length} คน</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup Table Selection Dialog */}
        <Dialog open={isBackupSelectOpen} onOpenChange={setIsBackupSelectOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                เลือกตารางที่ต้องการสำรอง
              </DialogTitle>
              <DialogDescription>
                เลือกตารางข้อมูลที่ต้องการสำรอง (เลือกอย่างน้อย 1 ตาราง)
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllBackupTables}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllBackupTables}
                >
                  ยกเลิกทั้งหมด
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                {allBackupTables.map((table) => (
                  <label
                    key={table}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBackupTables.includes(table)}
                      onChange={() => toggleBackupTable(table)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1">{backupTableLabels[table]}</span>
                    <span className="text-xs text-slate-400">{table}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 text-sm text-slate-500">
                เลือก {selectedBackupTables.length} จาก {allBackupTables.length} ตาราง
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsBackupSelectOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleBackup}
                disabled={isBackupLoading || selectedBackupTables.length === 0}
              >
                {isBackupLoading ? 'กำลังสำรอง...' : `สำรอง (${selectedBackupTables.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Table Selection Dialog */}
        <Dialog open={isRestoreSelectOpen} onOpenChange={setIsRestoreSelectOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                เลือกตารางที่ต้องการกู้คืน
              </DialogTitle>
              <DialogDescription>
                {restoreFile && (
                  <>
                    ไฟล์สำรองจาก {new Date(restoreFile.exportedAt).toLocaleString('th-TH')}
                    <br />
                    โดย {restoreFile.exportedBy}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllRestoreTables}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllRestoreTables}
                >
                  ยกเลิกทั้งหมด
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                {restoreFile?.tables && Object.keys(restoreFile.tables)
                  .filter((key) => restoreFile.tables[key as BackupTableName] && restoreFile.tables[key as BackupTableName]!.length > 0)
                  .map((table) => (
                    <label
                      key={table}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRestoreTables.includes(table as BackupTableName)}
                        onChange={() => toggleRestoreTable(table as BackupTableName)}
                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="flex-1">{backupTableLabels[table as BackupTableName]}</span>
                      <span className="text-xs text-slate-500">
                        {(restoreFile.tables[table as BackupTableName]?.length) || 0} รายการ
                      </span>
                    </label>
                  ))}
              </div>

              <div className="mt-4 text-sm text-slate-500">
                เลือก {selectedRestoreTables.length} ตาราง
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRestoreSelectOpen(false);
                  setRestoreFile(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleOpenRestoreConfirm}
                disabled={selectedRestoreTables.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                ถัดไป ({selectedRestoreTables.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Confirmation Dialog */}
        <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <Upload className="w-5 h-5" />
                ยืนยันการกู้คืนข้อมูล
              </DialogTitle>
              <DialogDescription>
                คุณแน่ใจหรือไม่ว่าต้องการกู้คืนข้อมูลจากไฟล์สำรอง?
                <br />
                <span className="text-orange-500 font-medium">
                  ข้อมูลที่มีอยู่จะถูกอัปเดตตามไฟล์สำรอง
                </span>
              </DialogDescription>
            </DialogHeader>

            {restoreFile && (
              <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">สำรองเมื่อ:</span>
                  <span className="font-medium">
                    {new Date(restoreFile.exportedAt).toLocaleString('th-TH')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สำรองโดย:</span>
                  <span className="font-medium">{restoreFile.exportedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เวอร์ชัน:</span>
                  <span className="font-medium">{restoreFile.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ตารางที่เลือก:</span>
                  <span className="font-medium">{selectedRestoreTables.length} ตาราง</span>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            {isRestoreLoading && restoreProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">กำลังกู้คืน...</span>
                  <span className="font-medium text-orange-600">
                    {restoreProgress.currentTable} ({restoreProgress.completed}/{restoreProgress.total})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-orange-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(restoreProgress.completed / restoreProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRestoreDialogOpen(false);
                  if (!isRestoreLoading) {
                    setRestoreFile(null);
                    setRestoreProgress(null);
                  }
                }}
                disabled={isRestoreLoading}
              >
                {isRestoreLoading ? 'กำลังดำเนินการ...' : 'ยกเลิก'}
              </Button>
              <Button
                variant="default"
                onClick={handleRestore}
                disabled={isRestoreLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isRestoreLoading ? 'กำลังกู้คืน...' : 'ยืนยันกู้คืน'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Settings;
