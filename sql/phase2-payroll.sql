-- Payroll Periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id text PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  pay_date text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed'))
);

-- Payroll Records
CREATE TABLE IF NOT EXISTS payroll_records (
  id text PRIMARY KEY,
  period_id text NOT NULL REFERENCES payroll_periods(id),
  employee_id text NOT NULL REFERENCES profiles(id),
  base_salary decimal DEFAULT 0,
  shift_count int DEFAULT 0,
  shift_rate decimal DEFAULT 0,
  overtime_hours decimal DEFAULT 0,
  overtime_rate decimal DEFAULT 0,
  total_income decimal DEFAULT 0,
  tax_deduction decimal DEFAULT 0,
  social_security decimal DEFAULT 0,
  other_deductions decimal DEFAULT 0,
  net_salary decimal DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_periods_year_month ON payroll_periods(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);

-- RLS
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all payroll" ON payroll_periods;
DROP POLICY IF EXISTS "Allow all payroll_records" ON payroll_records;
CREATE POLICY "Allow all payroll" ON payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payroll_records" ON payroll_records FOR ALL USING (true) WITH CHECK (true);
