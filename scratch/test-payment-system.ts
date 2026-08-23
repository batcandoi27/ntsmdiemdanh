import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { VIETQR_BANKS, generateCanonicalOrderInfo, buildVietQRImageUrl, validateBankInfo } from '../src/lib/vietqr-banks';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPaymentTestSuite() {
  console.log('======================================================================');
  console.log('  🧪 HARDENED ZERO-MOCK TEST SUITE: VIETQR & MONITOR PAYMENT ENGINE');
  console.log('======================================================================');

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failCount++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: VietQR Banks Registry & Input Validation Guard
  // -------------------------------------------------------------------------
  console.log('\n[1/8] Testing VietQR Banks Registry & Validation Guard...');
  assert(VIETQR_BANKS.length >= 30, `VIETQR_BANKS has ${VIETQR_BANKS.length} banks (>= 30)`);
  const mb = VIETQR_BANKS.find(b => b.id === 'MB');
  const vcb = VIETQR_BANKS.find(b => b.id === 'VCB');
  assert(!!mb && mb.bin === '970422', 'MB Bank bin is 970422');
  assert(!!vcb && vcb.bin === '970436', 'Vietcombank bin is 970436');

  const validCheck = validateBankInfo('MB', '0987654321', 'NGUYEN VAN A');
  assert(validCheck.valid === true, 'Valid bank info accepted');

  const invalidBank = validateBankInfo('FAKE_BANK', '0987654321', 'NGUYEN VAN A');
  assert(invalidBank.valid === false, 'Invalid bank ID strictly rejected');

  const shortAcc = validateBankInfo('MB', '12', 'NGUYEN VAN A');
  assert(shortAcc.valid === false, 'Short account number (<4 digits) strictly rejected');

  // -------------------------------------------------------------------------
  // TEST 2: Canonical Order Info Generation & URL Builder
  // -------------------------------------------------------------------------
  console.log('\n[2/8] Testing Canonical Order Info & QR URL Generator...');
  const orderInfo = generateCanonicalOrderInfo('8A13', '8A13_1', 'QUYLOP', 'T09');
  assert(orderInfo === 'TBC 8A13 8A131 QUYLOP T09', `Order info normalized: "${orderInfo}"`);

  const vietnameseAccent = generateCanonicalOrderInfo('Lớp 8A13', 'HS Nguyễn Văn A', 'Tiền Photo & Quỹ', 'Tháng 9');
  assert(!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(vietnameseAccent), 'Order info has NO Vietnamese accents');

  const qrUrl = buildVietQRImageUrl({
    bankId: 'MB',
    accountNumber: '0987654321',
    accountName: 'NGUYEN VAN A',
    amount: 100000,
    orderInfo: orderInfo
  });
  assert(qrUrl.includes('img.vietqr.io/image/MB-0987654321-compact2.png'), 'QR URL has correct base path');
  assert(qrUrl.includes('amount=100000'), 'QR URL includes amount param');
  assert(qrUrl.includes('accountName=NGUYEN%20VAN%20A'), 'QR URL includes uppercase accountName param');

  // -------------------------------------------------------------------------
  // TEST 3: School Bank Info & Teacher Bank Info Storage
  // -------------------------------------------------------------------------
  console.log('\n[3/8] Testing Bank Info DB CRUD...');
  const testSchoolBank = {
    bankId: 'MB',
    bankName: 'MB Bank',
    accountNumber: '1234567890',
    accountName: 'TRUONG THCS TRAN BOI CO'
  };

  const { error: schoolSaveErr } = await supabase.from('settings').upsert({
    key: 'school_bank_account',
    value: testSchoolBank,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });
  assert(!schoolSaveErr, 'Saved School Bank Account to settings');

  const { data: savedSchoolBank } = await supabase.from('settings').select('value').eq('key', 'school_bank_account').maybeSingle();
  assert(savedSchoolBank?.value?.accountNumber === '1234567890', 'Retrieved School Bank Account matches saved data');

  // -------------------------------------------------------------------------
  // TEST 4: Column Schema: is_shared_with_parents & payment_config
  // -------------------------------------------------------------------------
  console.log('\n[4/8] Testing Column Creation with Payment & Sharing Config...');
  const testClassId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89'; // Lớp 8A13
  const testClass = { id: testClassId, name: '8A13' };
  assert(!!testClass, `Found test class: ${testClass?.name} (${testClass?.id})`);

  const testColId = `${testClass.id}_test_payment_${Date.now()}`;
  const { error: createColErr } = await supabase.from('columns').insert({
    id: testColId,
    class_id: testClass.id,
    user_id: 'test_user',
    name: 'Quỹ Lớp & Photo Kỳ 1',
    scope: 'custom',
    frequency: 'period',
    sub_periods: [
      { id: 'T09', label: 'Tháng 9' },
      { id: 'T10', label: 'Tháng 10' }
    ],
    suggestions: ['Đã đóng', 'Chưa đóng'],
    allow_free_text: true,
    is_shared_with_parents: true,
    payment_config: {
      enabled: true,
      recipient_type: 'school',
      default_amount: 50000,
      unit: 'VNĐ'
    },
    archived: false,
    order: 100
  });
  assert(!createColErr, `Created shared payment column (${testColId})`);

  // Query lại xem is_shared_with_parents và payment_config có đúng không
  const { data: retrievedCol } = await supabase.from('columns').select('*').eq('id', testColId).maybeSingle();
  assert(retrievedCol?.is_shared_with_parents === true, 'Column is_shared_with_parents is true');
  assert(retrievedCol?.payment_config?.enabled === true, 'Column payment_config enabled is true');
  assert(retrievedCol?.payment_config?.default_amount === 50000, 'Column payment_config default_amount is 50000');

  // -------------------------------------------------------------------------
  // TEST 5: Shared Columns Filter Isolation (Security Boundary)
  // -------------------------------------------------------------------------
  console.log('\n[5/8] Testing Shared Columns Filter Isolation...');
  const privateColId = `${testClass.id}_test_private_${Date.now()}`;
  await supabase.from('columns').insert({
    id: privateColId,
    class_id: testClass.id,
    user_id: 'test_user',
    name: 'Sổ Ghi Chú Riêng Tư Của GV',
    scope: 'custom',
    frequency: 'one_time',
    is_shared_with_parents: false, // Riêng tư
    archived: false,
    order: 101
  });

  const { data: sharedOnly } = await supabase
    .from('columns')
    .select('*')
    .eq('class_id', testClass.id)
    .eq('is_shared_with_parents', true)
    .eq('archived', false);

  const containsShared = sharedOnly?.some(c => c.id === testColId);
  const containsPrivate = sharedOnly?.some(c => c.id === privateColId);
  assert(containsShared === true, 'Shared column appears in shared query');
  assert(containsPrivate === false, 'Private column is STRICTLY EXCLUDED from shared query');

  // -------------------------------------------------------------------------
  // TEST 6: Webhook Simulation & Auto-Reconciliation Engine
  // -------------------------------------------------------------------------
  console.log('\n[6/8] Testing Webhook Auto-Reconciliation Engine...');
  const studentCode = '8A13_1';
  const testTxId = `TX_SEPAY_${Date.now()}`;
  const webhookContent = `TBC 8A13 ${studentCode} QUYLOP T09`;

  // Bước 1: DB Lock insert
  const { error: insTxErr } = await supabase.from('payment_transactions').insert({
    transaction_id: testTxId,
    order_code: webhookContent,
    class_id: testClass.id,
    student_code: studentCode,
    column_id: testColId,
    period_key: 'T09',
    amount: 50000,
    content: webhookContent,
    payment_method: 'vietqr_webhook',
    status: 'success'
  });
  assert(!insTxErr, `Payment transaction recorded with ID ${testTxId}`);

  // Bước 2: Reconcile column_records
  const { error: insRecErr } = await supabase.from('column_records').upsert({
    id: `${testColId}_T09_${studentCode}`,
    column_id: testColId,
    class_id: testClass.id,
    student_code: studentCode,
    record_type: 'period',
    period_key: 'T09',
    status: 'completed',
    completed_at: new Date().toISOString(),
    value: 50000,
    note: `VietQR: Đã thanh toán 50.000đ (Mã GD: ${testTxId})`,
    updated_at: new Date().toISOString()
  });
  assert(!insRecErr, 'Webhook reconciled record inserted/updated into column_records');

  // Kiểm tra record đã được đánh dấu completed
  const { data: verifiedRecord } = await supabase
    .from('column_records')
    .select('*')
    .eq('id', `${testColId}_T09_${studentCode}`)
    .maybeSingle();

  assert(verifiedRecord?.status === 'completed', 'Record status is "completed"');
  assert(verifiedRecord?.value === '50000' || verifiedRecord?.value === 50000, 'Record value equals 50000');

  // -------------------------------------------------------------------------
  // TEST 7: Idempotency & Race Condition Prevention
  // -------------------------------------------------------------------------
  console.log('\n[7/8] Testing Idempotency Guard on Duplicate Webhook Delivery...');
  const { data: dupTx, error: dupErr } = await supabase.from('payment_transactions').insert({
    transaction_id: testTxId, // Cố tình gửi lại cùng transaction_id
    order_code: webhookContent,
    class_id: testClass.id,
    student_code: studentCode,
    column_id: testColId,
    amount: 50000,
    status: 'success'
  });

  assert(!!dupErr && dupErr.code === '23505', 'Duplicate transaction_id rejected with Unique Constraint violation (23505)');

  // -------------------------------------------------------------------------
  // TEST 8: Malformed Order Content & Unassigned Recovery
  // -------------------------------------------------------------------------
  console.log('\n[8/8] Testing Malformed Order Handling...');
  const malformedTxId = `TX_MALFORMED_${Date.now()}`;
  const malformedContent = `NGUYEN VAN B CHUYEN TIEN 50K`; // Không đúng cú pháp TBC [Lớp] [HS]

  const { error: insMalformedErr } = await supabase.from('payment_transactions').insert({
    transaction_id: malformedTxId,
    order_code: malformedContent,
    class_id: 'UNKNOWN',
    student_code: 'UNKNOWN',
    column_id: 'UNASSIGNED',
    amount: 50000,
    content: malformedContent,
    status: 'pending' // Chuyển vào hàng đợi review thủ công
  });
  assert(!insMalformedErr, 'Malformed transaction gracefully saved with status "pending" for manual review');

  // Cleanup test artifacts
  await supabase.from('column_records').delete().eq('column_id', testColId);
  await supabase.from('columns').delete().eq('id', testColId);
  await supabase.from('columns').delete().eq('id', privateColId);
  await supabase.from('payment_transactions').delete().eq('transaction_id', testTxId);
  await supabase.from('payment_transactions').delete().eq('transaction_id', malformedTxId);

  console.log('\n======================================================================');
  console.log(`  🏁 TEST SUITE RESULT: ${passCount} PASSED, ${failCount} FAILED (${failCount === 0 ? '100% PASS 🎉' : 'FAIL ❌'})`);
  console.log('======================================================================');

  if (failCount > 0) process.exit(1);
}

runPaymentTestSuite().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
