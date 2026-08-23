-- =====================================================================
-- Migration: Tích hợp Sổ Theo Dõi Thu Phí, STK Ngân Hàng & Webhook VietQR
-- File: supabase/migrations/20260821_payment_and_portal_monitor.sql
-- =====================================================================

-- 1. Bổ sung trường chia sẻ và cấu hình thu phí vào bảng columns
ALTER TABLE columns 
ADD COLUMN IF NOT EXISTS is_shared_with_parents BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{
  "enabled": false,
  "recipient_type": "school",
  "default_amount": 0,
  "unit": "VNĐ"
}'::jsonb;

-- 2. Bổ sung cấu hình STK ngân hàng vào bảng profiles (Giáo viên)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{
  "bank_id": "",
  "bank_name": "",
  "account_number": "",
  "account_name": ""
}'::jsonb;

-- 3. Tạo bảng lưu lịch sử giao dịch thanh toán tự động qua VietQR & Webhook
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT UNIQUE,
    order_code TEXT,
    class_id TEXT NOT NULL,
    student_code TEXT NOT NULL,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    period_key TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    content TEXT,
    payment_method TEXT DEFAULT 'vietqr',
    status TEXT DEFAULT 'success',
    raw_webhook_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index hỗ trợ tra cứu nhanh và bảo đảm Idempotency
CREATE INDEX IF NOT EXISTS idx_payment_tx_class_student ON payment_transactions(class_id, student_code);
CREATE INDEX IF NOT EXISTS idx_payment_tx_col_period ON payment_transactions(column_id, period_key);
CREATE INDEX IF NOT EXISTS idx_payment_tx_created ON payment_transactions(created_at DESC);

-- 4. Kích hoạt RLS cho bảng payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'Public Read Policy'
  ) THEN
    CREATE POLICY "Public Read Policy" ON payment_transactions FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'Service Role All Policy'
  ) THEN
    CREATE POLICY "Service Role All Policy" ON payment_transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
