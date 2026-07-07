-- ============================================
-- Promotions Table
-- ============================================

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('threshold', 'happy_hour', 'percentage', 'fixed_amount')),
  description TEXT DEFAULT '',
  fuel_type TEXT NOT NULL DEFAULT 'all' CHECK (fuel_type IN ('95', 'B7', 'B10', 'Diesel', 'all')),
  min_amount NUMERIC DEFAULT 0,
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percentage')),
  start_time TEXT,
  end_time TEXT,
  start_date TEXT,
  end_date TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT NOW()::TEXT,
  updated_at TEXT DEFAULT NOW()::TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_fuel_type ON promotions(fuel_type);

-- RLS Policies (development)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'promotions' AND policyname = 'Allow all on promotions'
  ) THEN
    CREATE POLICY "Allow all on promotions" ON promotions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
