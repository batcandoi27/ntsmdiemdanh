import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { updateColumn, getColumn, getSharedColumnsForClass } from '../src/services/column-service';

async function updateToan() {
  const columnId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89_custom_1787244187316_74yng'; // Tiền học thêm toán
  console.log('1. Checking initial state:');
  const initial = await getColumn(columnId);
  console.log('Initial isSharedWithParents:', initial?.isSharedWithParents);

  console.log('2. Updating isSharedWithParents = true:');
  await updateColumn(columnId, {
    isSharedWithParents: true,
    paymentConfig: {
      enabled: true,
      recipientType: 'teacher',
      defaultAmount: 300000,
      unit: 'VNĐ'
    }
  });

  const updated = await getColumn(columnId);
  console.log('Updated isSharedWithParents:', updated?.isSharedWithParents);
  console.log('Updated paymentConfig:', updated?.paymentConfig);

  const shared = await getSharedColumnsForClass('ff4d1751-4975-4bcc-96aa-d6801118aa89');
  console.log('All shared columns now:', shared.map(c => ({ id: c.id, name: c.name, shared: c.isSharedWithParents })));
}

updateToan().catch(console.error);
