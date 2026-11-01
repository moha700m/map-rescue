import { NextRequest, NextResponse } from 'next/server';
import { generateDiagnosis } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const diagnosis = await generateDiagnosis({
      businessName: body.businessName || '',
      category: body.category || '',
      address: body.address || '',
      suspensionMessage: body.suspensionMessage || '',
      documentsSummary: body.documentsSummary || 'No documents analyzed yet',
      isStorefront: !!body.isStorefront,
      customersVisit: !!body.customersVisit,
      hasSignage: !!body.hasSignage,
      previousAppeals: body.previousAppeals || 'None',
    });

    if (diagnosis.error) {
      return NextResponse.json({ error: diagnosis.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      diagnosis: diagnosis.diagnosis,
      note: 'This is a diagnosis only. No appeal has been submitted. Owner authorization required for any external action.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Diagnosis failed' }, { status: 500 });
  }
}