import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runPatchRegressionTests() {
  console.log('======================================================================');
  console.log('  🛡️ POST-PATCH AUTHORIZATION REGRESSION TEST SWEEP');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Backup-zip GET handler unauthenticated test
  try {
    const { GET: backupGet } = await import('../src/app/api/admin/backup-zip/route.ts');
    const dummyReq = {
      headers: new Headers(),
      nextUrl: new URL('http://localhost:8888/api/admin/backup-zip')
    };
    const res = await backupGet(dummyReq);
    if (res.status === 403) {
      console.log('✅ TEST 1 PASS: /api/admin/backup-zip từ chối request không có Admin session/token (HTTP 403)');
      passed++;
    } else {
      console.error(`❌ TEST 1 FAIL: /api/admin/backup-zip trả về status ${res.status} thay vì 403`);
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 1 ERROR:', e.message);
    failed++;
  }

  // Test 2: Classes-list GET handler unauthenticated test
  try {
    const { GET: classesGet } = await import('../src/app/api/admin/classes-list/route.ts');
    const dummyReq = {
      headers: new Headers(),
      nextUrl: new URL('http://localhost:8888/api/admin/classes-list')
    };
    const res = await classesGet(dummyReq);
    if (res.status === 401) {
      console.log('✅ TEST 2 PASS: /api/admin/classes-list từ chối request không có Admin key/session (HTTP 401)');
      passed++;
    } else {
      console.error(`❌ TEST 2 FAIL: /api/admin/classes-list trả về status ${res.status} thay vì 401`);
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 2 ERROR:', e.message);
    failed++;
  }

  // Test 3: Zalo Webhook POST handler unauthenticated test
  try {
    const { POST: zaloPost } = await import('../src/app/api/zalo/webhook/route.ts');
    const dummyReq = {
      headers: new Headers(),
      json: async () => ({ text: '1', sender_id: 'test_attacker' })
    };
    const res = await zaloPost(dummyReq);
    if (res.status === 401) {
      console.log('✅ TEST 3 PASS: /api/zalo/webhook từ chối request thiếu bridge token (HTTP 401)');
      passed++;
    } else {
      console.error(`❌ TEST 3 FAIL: /api/zalo/webhook trả về status ${res.status} thay vì 401`);
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 3 ERROR:', e.message);
    failed++;
  }

  // Test 4: Payment Webhook POST handler unauthenticated test
  try {
    const { POST: paymentPost } = await import('../src/app/api/webhook/payment/route.ts');
    const dummyReq = {
      headers: new Headers(),
      json: async () => ({ data: { amount: 100000, content: 'TBC 6A1 NGUYEN_VAN_A' } })
    };
    const res = await paymentPost(dummyReq);
    if (res.status === 401) {
      console.log('✅ TEST 4 PASS: /api/webhook/payment từ chối request thiếu webhook secret (HTTP 401)');
      passed++;
    } else {
      console.error(`❌ TEST 4 FAIL: /api/webhook/payment trả về status ${res.status} thay vì 401`);
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 4 ERROR:', e.message);
    failed++;
  }

  // Test 5: Server Actions admin-users unauthenticated test
  try {
    const { deleteUserAccount, adminCreateUser } = await import('../src/app/actions/admin-users.ts');
    const delRes = await deleteUserAccount('victim_id');
    const createRes = await adminCreateUser({ email: 'fake@hack.com', password: '123', role: 'admin' });

    if (!delRes.success && !createRes.success) {
      console.log('✅ TEST 5 PASS: Server Actions deleteUserAccount & adminCreateUser chặn đứng caller không có session Admin');
      passed++;
    } else {
      console.error('❌ TEST 5 FAIL: Server action không chặn được unauthenticated caller:', { delRes, createRes });
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 5 ERROR:', e.message);
    failed++;
  }

  // Test 6: Server Actions settings unauthenticated test
  try {
    const { clearAttendance, saveRoleCodes } = await import('../src/app/actions/settings.ts');
    const clearRes = await clearAttendance();
    const roleRes = await saveRoleCodes({ admin: 'fake' }, 'admin');

    if (!clearRes.success && !roleRes.success) {
      console.log('✅ TEST 6 PASS: Server Actions clearAttendance & saveRoleCodes chặn đứng caller không có session Admin (Không còn tin updaterRole từ client)');
      passed++;
    } else {
      console.error('❌ TEST 6 FAIL: Server action settings không chặn được:', { clearRes, roleRes });
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 6 ERROR:', e.message);
    failed++;
  }

  // Test 7: Anti-SSRF Guard Test in triggerDriveBackupNow
  try {
    const { triggerDriveBackupNow } = await import('../src/app/actions/settings.ts');
    // Test with internal localhost URL & port manipulation
    const ssrfRes1 = await triggerDriveBackupNow('http://127.0.0.1:8888/internal', 'secret');
    const ssrfRes2 = await triggerDriveBackupNow('https://evil-hacker.com/webhook', 'secret');
    const ssrfRes3 = await triggerDriveBackupNow('https://script.google.com:8443/webhook', 'secret');

    if (!ssrfRes1.success && !ssrfRes2.success && !ssrfRes3.success) {
      console.log('✅ TEST 7 PASS: Anti-SSRF Guard chặn đứng 100% các URL nội bộ, sai domain hoặc port lạ');
      passed++;
    } else {
      console.error('❌ TEST 7 FAIL: Anti-SSRF không chặn được URL độc:', { ssrfRes1, ssrfRes2, ssrfRes3 });
      failed++;
    }
  } catch (e) {
    console.error('❌ TEST 7 ERROR:', e.message);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`📊 REGRESSION SUMMARY: ${passed}/7 PASS | ${failed} FAIL`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPatchRegressionTests().catch(console.error);
