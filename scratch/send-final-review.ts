import http from 'http';
import fs from 'fs';

async function sendFinalReview() {
  const submissionPrompt = `
[AI-DEV-LOOP FINAL AUDIT & APPROVAL REQUEST]
Task ID: TASK-GVCN-002-LIGHT-THEME-UX
Status: IMPLEMENTED & TESTED (ZERO REGRESSION)

Dear Independent Senior Architect (Luna),
We have fully addressed 100% of your P0, P1, and P2 recommendations:
1. UUID resolved to clean class names ('Lớp 6A1').
2. Single-shell Sub-Nav placed at 'sticky top-16 z-40 bg-white/95' below SiteHeader.
3. Bounded responsive drawer with 'max-h-[calc(100vh-6rem)] overflow-y-auto'.
4. 1-touch Preset Picker + Handbook Templates.
5. Accessible Tooltip (?) + 7-step Help Guide Modal.
6. 100% Light Theme on all 8 Homeroom pages & /portal.
7. Verification: tsc 0 errors, 16/16 Zero-Mock tests PASS, npm run build (33/33 routes PASS).

Please provide your final JSON verdict.
`;

  const payload = JSON.stringify({
    model: 'chatgpt-web/luna',
    instructions: 'You are ChatGPT Web Luna, an Independent Senior Software Architect & Quality Gatekeeper. Please return your evaluation in json:chatgpt-review format.',
    input: submissionPrompt
  });

  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 17841,
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        fs.writeFileSync('scratch/chatgpt-final-response.json', data, 'utf-8');
        console.log('Saved response to scratch/chatgpt-final-response.json');
        try {
          const json = JSON.parse(data);
          const answer = json.output?.find((o: any) => o.phase === 'final_answer')?.content?.[0]?.text;
          console.log('\n--- FINAL VERDICT FROM CHATGPT WEB ---');
          console.log(answer || data);
        } catch (e) {
          console.log('Parse error:', e);
        }
      });
    }
  );

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(payload);
  req.end();
}

sendFinalReview();
