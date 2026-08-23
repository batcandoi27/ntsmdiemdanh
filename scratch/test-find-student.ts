import { supabase } from '../src/lib/supabase';
import { getHomeroomClassSettings, getParentStudentOverview } from '../src/services/homeroom-service';
import { transformDbToStudent } from '../src/utils/transformers';

async function run() {
  const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89'; // 8A13
  const studentId = '13cad476-6d2c-41f4-b3b5-acf4334a313b';
  console.log('Testing getParentStudentOverview:');
  const overview = await getParentStudentOverview(studentId, classId);
  console.log('Overview result:', JSON.stringify(overview, null, 2));
}

run().catch(console.error);
