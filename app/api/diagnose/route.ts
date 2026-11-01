import { NextResponse } from 'next/server';
import { getApiKey, getSettings } from '@/lib/ai/storage';
import { loadCatalog } from '@/lib/ai/models';
import { resolveModelId } from '@/lib/ai/config';
import { runTask } from '@/lib/ai/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Backwards-compatible endpoint — now powered by OpenRouter through the task runner. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [settings, key] = await Promise.all([getSettings(), getApiKey()]);
    if (!key.key) {
      return NextResponse.json(
        { error: 'OpenRouter key not configured. Set OPENROUTER_API_KEY or add it in AI Settings.' },
        { status: 400 },
      );
    }
    const catalog = await loadCatalog();
    const model = resolveModelId(settings, 'gbp-diagnosis');

    const result = await runTask({
      taskId: 'gbp-diagnosis',
      model,
      settings,
      apiKey: key.key,
      catalog: catalog.models,
      input: {
        businessName: body.businessName || '',
        category: body.category || '',
        address: body.address || '',
        suspensionMessage: body.suspensionMessage || '',
        documentsSummary: body.documentsSummary || 'No documents analyzed yet',
        isStorefront: !!body.isStorefront,
        customersVisit: !!body.customersVisit,
        hasSignage: !!body.hasSignage,
        previousAppeals: body.previousAppeals || 'None',
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status || 502 });
    }

    return NextResponse.json({
      success: true,
      diagnosis: result.parsed ?? result.content,
      model: result.model,
      usage: result.usage,
      note: 'Diagnosis only. No appeal has been submitted. Owner authorization required for external actions.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Diagnosis failed' },
      { status: 500 },
    );
  }
}
