import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ status: 'error', message: 'Missing payment reference.' }, { status: 400 });
  }

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("Action Error: PAYSTACK_SECRET_KEY not set.");
      return NextResponse.json({ status: 'error', message: 'Missing Paystack secret key.' }, { status: 500 });
    }

    const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

    const verifyResponse = await fetch(verifyUrl, {
      method: "GET",
      headers: { "Authorization": `Bearer ${paystackSecretKey}` },
    });

    const verifyJson = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyJson.status || !verifyJson.data) {
      console.error(`Action Error: Paystack verification API error for ref ${reference}:`, verifyJson);
      return NextResponse.json({ status: 'error', message: verifyJson.message || 'API error' }, { status: 500 });
    }

    const verifiedData = verifyJson.data;

    if (verifiedData.status !== 'success') {
      console.warn(`Action Warning: Verification status mismatch or not success for ref ${reference}. Verified: ${verifiedData.status}. Ignoring.`);
      return NextResponse.json({ status: 'error', message: 'Payment not successful.' }, { status: 400 });
    }

    return NextResponse.json({ status: 'success', message: 'Payment verified successfully.' });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to verify payment.' }, { status: 500 });
  }
}