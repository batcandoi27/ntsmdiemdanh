async function smokeTest() {
  console.log("=== LIVE HTTP ROUTE SMOKE TEST & RENDER VERIFICATION ===");
  const routes = [
    "/",
    "/login",
    "/portal",
    "/homeroom",
    "/homeroom/students",
    "/homeroom/organization",
    "/homeroom/events",
    "/homeroom/cooperation",
    "/homeroom/handbook",
    "/homeroom/print-center",
  ];

  let passed = 0;
  let failed = 0;

  for (const r of routes) {
    const url = `http://localhost:8888${r}`;
    try {
      const res = await fetch(url, { headers: { "Accept": "text/html" } });
      const text = await res.text();
      const isOk = res.status === 200 && !text.includes("Error: Cannot find module") && !text.includes("500 Internal Server Error");
      
      if (isOk) {
        console.log(`✅ [HTTP 200] ${r.padEnd(26)} -> Rendered successfully (${text.length} bytes)`);
        passed++;
      } else {
        console.error(`❌ [FAIL ${res.status}] ${r} -> Server returned error or missing module`);
        console.error(text.slice(0, 300));
        failed++;
      }
    } catch (e: any) {
      console.error(`❌ [CONNECTION ERROR] ${r}:`, e.message);
      failed++;
    }
  }

  console.log("\n=======================================================");
  console.log(`📊 SMOKE TEST RESULT: ${passed}/${routes.length} ROUTES HEALTHY (Failed: ${failed})`);
  console.log("=======================================================");
  
  if (failed > 0) process.exit(1);
}

smokeTest();
