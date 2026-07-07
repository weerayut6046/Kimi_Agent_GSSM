import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock, ArrowLeft, Camera } from 'lucide-react';
import { validatePasswordStrength, hashPassword } from '@/lib/security';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile: updateAuthProfile } = useAuth();
  const { updateEmployee } = useEmployee();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (profile && user) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        email: user.email || '',
        avatar: profile.avatar || '',
      }));
    }
  }, [profile, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setIsLoading(true);

    try {
      // Validate password change if requested
      if (showPasswordSection && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
          setIsLoading(false);
          return;
        }

        const passwordCheck = validatePasswordStrength(formData.newPassword);
        if (!passwordCheck.valid) {
          toast.error(passwordCheck.message);
          setIsLoading(false);
          return;
        }
      }

      // Prepare updates
      const updates: Partial<typeof profile> & { email?: string; password?: string } = {
        fullName: formData.fullName,
        phone: formData.phone,
        avatar: formData.avatar,
      };

      // Add email if changed
      if (formData.email !== user.email) {
        updates.email = formData.email;
      }

      // Add password if changing
      if (showPasswordSection && formData.newPassword) {
        updates.password = await hashPassword(formData.newPassword);
      }

      await updateEmployee(profile.id, updates);
      
      // Update profile in AuthContext for real-time sidebar update
      updateAuthProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        avatar: formData.avatar,
      });
      
      toast.success('อัปเดตโปรไฟล์สำเร็จ');
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setShowPasswordSection(false);
    } catch {
      toast.error('ไม่สามารถอัปเดตโปรไฟล์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (formData.fullName) {
      const parts = formData.fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
      }
      return parts[0].charAt(0);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">โปรไฟล์ของฉัน</h1>
          <p className="text-sm text-slate-500">จัดการข้อมูลส่วนตัวและบัญชีผู้ใช้</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 h-fit">
          <CardContent className="pt-6 text-center">
            <div className="relative inline-block mb-4">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarImage src={formData.avatar} />
                <AvatarFallback className="text-2xl bg-slate-200">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            <h3 className="font-semibold text-lg">
              {formData.fullName}
            </h3>
            <p className="text-sm text-slate-500">{profile.position?.name || user.role}</p>
            <p className="text-xs text-slate-400 mt-1">{formData.email}</p>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>แก้ไขข้อมูลส่วนตัว</CardTitle>
            <CardDescription>อัปเดตข้อมูลส่วนตัวและการติดต่อของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="avatar" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  URL รูปโปรไฟล์
                </Label>
                <Input
                  id="avatar"
                  name="avatar"
                  value={formData.avatar}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  ชื่อ-นามสกุล
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  เบอร์โทรศัพท์
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0xx-xxx-xxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  อีเมล
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Password Section */}
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {showPasswordSection ? 'ยกเลิกการเปลี่ยนรหัสผ่าน' : 'เปลี่ยนรหัสผ่าน'}
                </Button>

                {showPasswordSection && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ เล็ก ตัวเลข และอักขระพิเศษ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isLoading}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
