async function checkLiveRoutes() {
  const routes = [
    'http://localhost:8888/portal',
    'http://localhost:8888/settings',
    'http://localhost:8888/classes/ff4d1751-4975-4bcc-96aa-d6801118aa89/monitor',
    'http://localhost:8888/api/webhook/payment'
  ];

  console.log('--- LIVE ROUTE SMOKE TESTS ---');
  for (const r of routes) {
    try {
      const res = await fetch(r);
      console.log(`  [*] GET ${r} -> HTTP ${res.status}`);
    } catch (e) {
      console.log(`  [!] GET ${r} -> FAILED: ${e.message}`);
    }
  }
}

checkLiveRoutes();
