import React, { useEffect, useState } from 'react';
import { Fuel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getFuelTypeComparison, type FuelTypeData } from '@/lib/analytics';

const COLORS = ['#ef4444', '#22c55e', '#eab308', '#64748b'];

interface FuelTypeChartProps {
  startDate?: string;
  endDate?: string;
}

const FuelTypeChart: React.FC<FuelTypeChartProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<FuelTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const result = await getFuelTypeComparison(7, startDate, endDate);
      setData(result.filter((d) => d.liters > 0));
      setIsLoading(false);
    };
    load();
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    return `฿${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            ยอดขายตามประเภทน้ำมัน
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
          <Fuel className="w-5 h-5" />
          ยอดขายตามประเภทน้ำมัน (7 วัน)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-slate-500 py-8">ไม่มีข้อมูลยอดขายน้ำมัน</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: { payload?: FuelTypeData }) => [
                  `${formatCurrency(value)} (${props?.payload?.liters.toLocaleString()} ลิตร)`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default FuelTypeChart;
