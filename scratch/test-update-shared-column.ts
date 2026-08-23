import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { updateColumn, getColumn, getSharedColumnsForClass } from '../src/services/column-service';

async function test() {
  const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89';
  const columnId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89_custom_1777903758196_z2j4z'; // Đăng ký SGK

  console.log('1. Getting initial column state:');
  const initial = await getColumn(columnId);
  console.log('Initial isSharedWithParents:', initial?.isSharedWithParents);

  console.log('2. Updating to isSharedWithParents = true with paymentConfig:');
  await updateColumn(columnId, {
    isSharedWithParents: true,
    paymentConfig: {
      enabled: true,
      recipientType: 'school',
      defaultAmount: 250000,
      unit: 'VNĐ'
    }
  });

  console.log('3. Getting updated column state:');
  const updated = await getColumn(columnId);
  console.log('Updated isSharedWithParents:', updated?.isSharedWithParents);
  console.log('Updated paymentConfig:', updated?.paymentConfig);

  console.log('4. Querying getSharedColumnsForClass:');
  const sharedCols = await getSharedColumnsForClass(classId);
  console.log('Shared columns for class:', sharedCols.map(c => ({ id: c.id, name: c.name, shared: c.isSharedWithParents, payment: c.paymentConfig })));
}

test().catch(console.error);
