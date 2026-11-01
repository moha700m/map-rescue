import { estimateCost, findModel, type ModelInfo } from './models';
import { callOpenRouter, OpenRouterError, type OrMessage } from './openrouter';
import type { AiSettings } from './config';
import { AI_TASKS, getTask, type AiTaskId } from './tasks';
import { appendUsage } from './storage';
import type { RunTaskFailure, RunTaskResponse, RunTaskResult, UsageEntry } from './contracts';

export type { RunTaskFailure, RunTaskResult, RunTaskResponse, UsageEntry } from './contracts';
import { uid } from '../utils';
import { buildContentParts, extractJson, validateModalities, type Attachment } from './messages';

export type { Attachment } from './messages';

export interface RunTaskParams {
  taskId: AiTaskId;
  input: Record<string, unknown>;
  attachments?: Attachment[];
  model: string;
  settings: AiSettings;
  apiKey: string;
  catalog: ModelInfo[];
  caseCode?: string;
  allowFallback?: boolean;
}

async function logEntry(entry: UsageEntry) {
  try {
    await appendUsage(entry);
  } catch {
    /* logging must never break the request */
  }
}

export async function runTask(params: RunTaskParams): Promise<RunTaskResponse> {
  const task = getTask(params.taskId);
  if (!task) {
    return { ok: false, error: 'مهمة غير معروفة', code: 'unknown_task', status: 400 };
  }

  const primary = findModel(params.catalog, params.model);
  const { parts, usedModalities } = buildContentParts(task.buildUser(params.input), params.attachments);
  const invalid = validateModalities(primary, usedModalities);
  if (invalid) {
    return {
      ok: false,
      error: invalid.error,
      code: 'model_modality_mismatch',
      status: 422,
      model: params.model,
      missingModality: invalid.missing,
      suggestion: 'اختر نموذجًا متعدد الوسائط من قائمة النماذج المتاحة في إعدادات الذكاء الاصطناعي.',
    };
  }

  const messages: OrMessage[] = [
    { role: 'system', content: task.system },
    { role: 'user', content: parts },
  ];

  const supportsJsonMode = !!primary?.supportedParameters?.includes('response_format');
  const logId = uid('req');
  const started = Date.now();

  const attempt = async (modelId: string) => {
    const model = findModel(params.catalog, modelId);
    return callOpenRouter({
      apiKey: params.apiKey,
      model: modelId,
      messages,
      temperature: params.settings.temperature ?? task.temperature,
      maxTokens: params.settings.maxTokens,
      json: task.output === 'json',
      jsonModeSupported: !!model?.supportedParameters?.includes('response_format'),
    });
  };

  let result;
  let usedModel = params.model;
  let fallbackUsed = false;
  let warning = '';

  try {
    result = await attempt(params.model);
  } catch (primaryErr) {
    const err = primaryErr as OpenRouterError;
    const canFallback =
      params.allowFallback !== false &&
      params.settings.autoFallback &&
      params.settings.fallbackModel &&
      params.settings.fallbackModel !== params.model &&
      ![401, 402, 403].includes(err.status);

    if (!canFallback) {
      const entry: UsageEntry = {
        id: logId,
        at: new Date().toISOString(),
        task: params.taskId,
        model: params.model,
        requestedModel: params.model,
        fallbackUsed: false,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - started,
        status: 'error',
        httpStatus: err.status,
        errorCode: err.code,
        errorMessage: err.message,
        caseCode: params.caseCode,
        source: 'server',
      };
      await logEntry(entry);
      return {
        ok: false,
        error: err.message,
        code: err.code,
        status: err.status || 502,
        model: params.model,
        suggestion:
          err.status === 401
            ? 'المفتاح غير صالح. حدّث مفتاح OpenRouter من صفحة الاتصال.'
            : err.status === 402
              ? 'رصيد OpenRouter غير كافٍ. أضف رصيدًا أو استخدم نموذجًا مجانيًا.'
              : err.status === 429
                ? 'تم تجاوز حد الطلبات. أعد المحاولة بعد لحظات.'
                : undefined,
      };
    }

    try {
      result = await attempt(params.settings.fallbackModel);
      usedModel = params.settings.fallbackModel;
      fallbackUsed = true;
      warning = `تم التحويل إلى النموذج الاحتياطي ${params.settings.fallbackModel} بعد فشل ${params.model}: ${err.message}`;
    } catch (fallbackErr) {
      const ferr = fallbackErr as OpenRouterError;
      await logEntry({
        id: logId,
        at: new Date().toISOString(),
        task: params.taskId,
        model: params.settings.fallbackModel,
        requestedModel: params.model,
        fallbackUsed: true,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - started,
        status: 'error',
        httpStatus: ferr.status,
        errorCode: ferr.code,
        errorMessage: `${err.message} → ${ferr.message}`,
        caseCode: params.caseCode,
        source: 'server',
      });
      return {
        ok: false,
        error: `فشل النموذج الأساسي والاحتياطي: ${ferr.message}`,
        code: ferr.code,
        status: ferr.status || 502,
        model: params.settings.fallbackModel,
      };
    }
  }

  const modelInfo = findModel(params.catalog, usedModel);
  const computed = estimateCost(modelInfo, result.usage.promptTokens, result.usage.completionTokens);
  const costUsd = result.usage.costUsd ?? computed;

  const entry: UsageEntry = {
    id: logId,
    at: new Date().toISOString(),
    task: params.taskId,
    model: result.model || usedModel,
    requestedModel: params.model,
    fallbackUsed,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    costUsd,
    latencyMs: result.latencyMs,
    status: 'ok',
    caseCode: params.caseCode,
    source: 'server',
  };
  await logEntry(entry);

  const parsed = task.output === 'json' ? extractJson(result.content) : null;
  const warnings: string[] = [];
  if (warning) warnings.push(warning);
  if (task.output === 'json' && !parsed) warnings.push('لم يكن رد النموذج JSON صالحًا؛ أُعيد النص الخام.');
  if (result.finishReason === 'length') warnings.push('توقف الرد بسبب حد الرموز — ارفع max tokens لإكمال المخرجات.');

  return {
    ok: true,
    taskId: params.taskId,
    model: result.model || usedModel,
    requestedModel: params.model,
    fallbackUsed,
    content: result.content,
    parsed,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      costUsd,
    },
    latencyMs: result.latencyMs,
    logId,
    warnings,
  };
}
