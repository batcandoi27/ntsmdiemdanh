import { db } from './src/services/db';

async function test() {
    try {
        console.log("Calling getReportData...");
        const records = await db.getReportData('2026-02-01', '2026-02-28', ['6A1', '6A2', '6A3', '6A4']);
        console.log(`Found ${records.length} records.`);
        if (records.length > 0) {
            console.log("Sample record:", JSON.stringify(records[0], null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
