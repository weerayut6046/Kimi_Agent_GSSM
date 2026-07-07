import React, { useEffect, useState } from 'react';
import { Trophy, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { getTopEmployees, type TopEmployee } from '@/lib/analytics';

interface TopEmployeesCardProps {
  endDate?: string;
}

const TopEmployeesCard: React.FC<TopEmployeesCardProps> = ({ endDate }) => {
  const [employees, setEmployees] = useState<TopEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const date = endDate ? new Date(endDate) : new Date();
      const result = await getTopEmployees(5, date.getFullYear(), date.getMonth() + 1);
      setEmployees(result);
      setIsLoading(false);
    };
    load();
  }, [endDate]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            พนักงานมาตรงเวลา
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          พนักงานมาตรงเวลา (เดือนนี้)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-center text-slate-500 py-4">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-4">
            {employees.map((emp, index) => (
              <div key={emp.employee.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-slate-400 w-5">{index + 1}</span>
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-sm truncate">{emp.employee.fullName}</span>
                  </div>
                  <Badge variant={emp.onTimeRate >= 90 ? 'default' : 'secondary'} className="shrink-0">
                    {emp.onTimeRate}%
                  </Badge>
                </div>
                <Progress value={emp.onTimeRate} className="h-2" />
                <p className="text-xs text-slate-500">
                  มาตรงเวลา {emp.onTimeCount}/{emp.totalScheduled} กะ
                  {emp.lateCount > 0 && ` · สาย ${emp.lateCount} ครั้ง`}
                  {emp.absentCount > 0 && ` · ขาด ${emp.absentCount} ครั้ง`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopEmployeesCard;
