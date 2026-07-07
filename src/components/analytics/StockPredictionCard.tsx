import React, { useEffect, useState } from 'react';
import { Package, Fuel, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { predictFuelStock, predictProductStock, type StockPrediction } from '@/lib/analytics';

const StockPredictionCard: React.FC = () => {
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [fuel, products] = await Promise.all([
        predictFuelStock(),
        predictProductStock(),
      ]);
      setPredictions([...fuel, ...products].sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty).slice(0, 6));
      setIsLoading(false);
    };
    load();
  }, []);

  const getStatusColor = (status: StockPrediction['status']) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStatusLabel = (status: StockPrediction['status']) => {
    switch (status) {
      case 'critical':
        return 'วิกฤต';
      case 'warning':
        return 'เตือน';
      default:
        return 'ปกติ';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            คาดการณ์สต็อก
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
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
          <Clock className="w-5 h-5" />
          คาดการณ์สต็อกจะหมด
        </CardTitle>
      </CardHeader>
      <CardContent>
        {predictions.length === 0 ? (
          <p className="text-center text-slate-500 py-4">ไม่มีข้อมูลสต็อก</p>
        ) : (
          <div className="space-y-3">
            {predictions.map((pred) => (
              <div
                key={`${pred.itemType}-${pred.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {pred.itemType === 'fuel' ? (
                    <Fuel className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <Package className="w-4 h-4 text-purple-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{pred.name}</p>
                    <p className="text-xs text-slate-500">
                      เหลือ {pred.currentStock.toLocaleString()} {pred.unit}
                      {pred.avgConsumptionPerDay > 0 && (
                        <> · ใช้เฉลี่ย {pred.avgConsumptionPerDay.toLocaleString()} {pred.unit}/วัน</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pred.status === 'critical' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <Badge variant="outline" className={getStatusColor(pred.status)}>
                    {pred.daysUntilEmpty === 999 ? 'ไม่มีข้อมูล' : `${pred.daysUntilEmpty} วัน`}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(pred.status)}>
                    {getStatusLabel(pred.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockPredictionCard;
