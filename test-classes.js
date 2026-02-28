const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // Might exist

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();
  
  async function test() {
    const rootSnap = await db.collection('classes').get();
    console.log("Root classes:", rootSnap.size);
    
    const yearSnap = await db.collection('years').doc('2025-2026').collection('classes').get();
    console.log("Years classes:", yearSnap.size);
    
    const schoolSnap = await db.collection('schools').doc('default').collection('years').doc('2025-2026').collection('classes').get();
    console.log("Schools classes:", schoolSnap.size);
    process.exit(0);
  }
  test();
} catch(e) { console.error(e.message); process.exit(1); }
