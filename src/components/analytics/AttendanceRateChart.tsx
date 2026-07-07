import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getAttendanceRate, type AttendanceRateData } from '@/lib/analytics';

interface AttendanceRateChartProps {
  endDate?: string;
}

const AttendanceRateChart: React.FC<AttendanceRateChartProps> = ({ endDate }) => {
  const [data, setData] = useState<AttendanceRateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const result = await getAttendanceRate(6, endDate);
      setData(result);
      setIsLoading(false);
    };
    load();
  }, [endDate]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            อัตราการมาทำงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          อัตราการมาทำงาน (6 เดือน)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, '']} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="presentRate" name="มาตรงเวลา" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="lateRate" name="มาสาย" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
            <Bar dataKey="absentRate" name="ขาด" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AttendanceRateChart;
