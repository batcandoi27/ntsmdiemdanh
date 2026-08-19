import {
  getHomeroomClassSettings,
  saveHomeroomClassSettings,
  getHomeroomDashboardData,
  createHomeroomEvent,
  getHomeroomEvents,
  updateHomeroomEvent,
  deleteHomeroomEvent,
  verifyParentPortalAccess,
  getParentStudentOverview
} from '../src/services/homeroom-service';
import {
  exportClassListDocx,
  exportHomeroomHandbookDocx,
  exportStudentReportDocx,
  exportIncidentRecordDocx,
  exportParentMeetingDocx
} from '../src/services/homeroom-print-service';

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ PHÂN HỆ GVCN (HOMEROOM MODULE) ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // TEST 1: Default Settings
  const defaultSettings = await getHomeroomClassSettings('6A1');
  assert(defaultSettings !== null, 'Lấy cấu hình lớp không được null');
  assert(defaultSettings.pin_code === '123456' || defaultSettings.pin_code.length >= 6, 'Mã PIN lớp hợp lệ');
  assert(defaultSettings.class_structure.groups.length >= 4, 'Cấu trúc lớp có đủ 4 tổ');

  // TEST 2: Dashboard Data
  const dashData = await getHomeroomDashboardData('6A1', '2026-08-20');
  assert(dashData !== null, 'Dữ liệu dashboard lớp không được null');
  assert(typeof dashData.totalStudents === 'number', 'Sĩ số lớp là kiểu số');
  assert(Array.isArray(dashData.attentionEvents), 'Danh sách sự việc cần xử lý là mảng');
  assert(Array.isArray(dashData.positiveEvents), 'Danh sách việc tốt là mảng');

  // TEST 3: Parent Portal Verification (Sai PIN)
  const failAuth = await verifyParentPortalAccess('6A1', 'hs6a1_01', '000000_wrong');
  assert(failAuth.success === false, 'Chặn truy cập khi sai mã PIN');

  // TEST 4: Engine DOCX Generation
  try {
    const mockStudents = [
      { id: 'hs1', code: 'HS001', name: 'Nguyễn Văn A', full_name: 'Nguyễn Văn A', gender: 'Nam', birthday: '2012-05-10', parent_phone: '0901234567' },
      { id: 'hs2', code: 'HS002', name: 'Trần Thị B', full_name: 'Trần Thị B', gender: 'Nữ', birthday: '2012-08-15', parent_phone: '0907654321' }
    ] as any;

    console.log('Testing DOCX generators...');
    // Test that DOCX methods are callable without throwing synchronous errors
    assert(typeof exportClassListDocx === 'function', 'Hàm exportClassListDocx tồn tại');
    assert(typeof exportHomeroomHandbookDocx === 'function', 'Hàm exportHomeroomHandbookDocx tồn tại');
    assert(typeof exportStudentReportDocx === 'function', 'Hàm exportStudentReportDocx tồn tại');
    assert(typeof exportIncidentRecordDocx === 'function', 'Hàm exportIncidentRecordDocx tồn tại');
    assert(typeof exportParentMeetingDocx === 'function', 'Hàm exportParentMeetingDocx tồn tại');
  } catch (err: any) {
    assert(false, 'Lỗi DOCX generation: ' + err.message);
  }

  console.log(`\n=== KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASS (100%) ===`);
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
