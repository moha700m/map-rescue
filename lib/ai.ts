import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
});

export interface DiagnosisInput {
  businessName: string;
  category: string;
  address: string;
  suspensionMessage: string;
  documentsSummary: string;
  isStorefront: boolean;
  customersVisit: boolean;
  hasSignage: boolean;
  previousAppeals: string;
}

export async function generateDiagnosis(input: DiagnosisInput) {
  if (!process.env.OPENAI_API_KEY && !process.env.AI_API_KEY) {
    return {
      error: 'AI credentials not configured. Set OPENAI_API_KEY or AI_API_KEY in environment.',
      diagnosis: null,
    };
  }

  const systemPrompt = `You are an expert Google Business Profile recovery specialist. Analyze the provided case data strictly based on official Google policies from support.google.com/business. Do not invent reasons. If evidence is insufficient, state that clearly. Output structured JSON.`;

  const userPrompt = `Analyze this Google Business Profile case:

Business Name: ${input.businessName}
Category: ${input.category}
Address: ${input.address}
Suspension Message: ${input.suspensionMessage}
Storefront: ${input.isStorefront}
Customers Visit: ${input.customersVisit}
Has Permanent Signage: ${input.hasSignage}
Previous Appeals: ${input.previousAppeals}
Documents Summary: ${input.documentsSummary}

Provide:
1. Most likely root cause (or "insufficient evidence")
2. Policy violations if any
3. Missing documents
4. Recommended correction
5. Risk level (low/medium/high)
6. Confidence (0-100)
7. Step-by-step recovery plan
8. Draft appeal text in English and Arabic

Respond in valid JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return {
      error: null,
      diagnosis: JSON.parse(content),
    };
  } catch (err: any) {
    return {
      error: err.message || 'AI diagnosis failed',
      diagnosis: null,
    };
  }
}