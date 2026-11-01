import type { OrPart } from './openrouter';
import type { ModelInfo } from './models';

export interface Attachment {
  name: string;
  mimeType: string;
  /** data URL (base64) or https URL */
  dataUrl: string;
  size?: number;
}

export type MediaCategory = 'image' | 'file' | 'text' | 'other';

export function mediaCategory(mime: string): MediaCategory {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'file';
  if (mime.startsWith('text/') || mime === 'application/json') return 'text';
  return 'other';
}

function decodeDataUrlText(dataUrl: string): string | null {
  try {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return dataUrl;
    const meta = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    if (meta.includes('base64')) {
      return typeof Buffer !== 'undefined'
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(escape(atob(payload)));
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

export function buildContentParts(
  userText: string,
  attachments: Attachment[] = [],
): { parts: OrPart[]; usedModalities: ('image' | 'file')[] } {
  const parts: OrPart[] = [{ type: 'text', text: userText }];
  const inlineTexts: string[] = [];
  const used: ('image' | 'file')[] = [];

  for (const file of attachments) {
    const category = mediaCategory(file.mimeType);
    if (category === 'image') {
      parts.push({ type: 'image_url', image_url: { url: file.dataUrl } });
      used.push('image');
    } else if (category === 'file') {
      parts.push({ type: 'file', file: { filename: file.name, file_data: file.dataUrl } });
      used.push('file');
    } else if (category === 'text') {
      const decoded = decodeDataUrlText(file.dataUrl);
      if (decoded) inlineTexts.push(`--- ${file.name} ---\n${decoded.slice(0, 20000)}`);
    }
  }

  if (inlineTexts.length) {
    (parts[0] as { type: 'text'; text: string }).text += `\n\nمستندات نصية مرفقة:\n${inlineTexts.join('\n\n')}`;
  }

  return { parts, usedModalities: used };
}

export function validateModalities(model: ModelInfo | undefined, required: ('image' | 'file')[]) {
  if (!model || !required.length) return null;
  for (const modality of required) {
    if (!model.inputModalities.includes(modality)) {
      return {
        missing: modality,
        error:
          modality === 'image'
            ? `النموذج ${model.id} لا يدعم إدخال الصور. اختر نموذجًا متعدد الوسائط (Gemini / Claude / GPT-4.1).`
            : `النموذج ${model.id} لا يدعم إدخال ملفات PDF. اختر نموذجًا يدعم الملفات.`,
      } as { missing: 'image' | 'file'; error: string };
    }
  }
  return null;
}

export function extractJson(content: string): unknown | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
