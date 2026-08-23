import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getParentStudentOverview } from '../src/services/homeroom-service';

async function testOverview() {
  const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89';
  const studentId = '1803b277-1f77-404d-9e54-0dbe8fe709e9'; // 8A13_3 Đặng Hoàng Bi

  const res = await getParentStudentOverview(studentId, classId);
  console.log('Overview for Đặng Hoàng Bi:');
  console.log('Student:', res?.student);
  console.log('Attendance:', res?.attendance);
}

testOverview().catch(console.error);
