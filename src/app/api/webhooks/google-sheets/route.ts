import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsWebhookService } from '@/services/google-sheets-webhook-service';
import { GoogleSheetsWebhookPayload } from '@/types/student-portal';

export async function POST(req: NextRequest) {
  try {
    const body: GoogleSheetsWebhookPayload = await req.json();

    const result = await GoogleSheetsWebhookService.processWebhookPayload(body);

    if (!result.success) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      awarded_xp: result.awarded_xp,
      awarded_coins: result.awarded_coins,
      new_level: result.new_level
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: `Webhook error: ${err.message}` },
      { status: 500 }
    );
  }
}
