/**
 * UI-facing model catalog. Use registry.languageModel(id) for actual provider resolution.
 * Format: providerId:modelId (e.g. openai:gpt-5.4, anthropic:claude-opus-4-6)
 */
export interface CatalogModel {
  id: string;
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  description?: string;
}

/** Default model for new chats (OpenAI). Anthropic/Google IDs are available for presets or callers. */
export const DEFAULT_OPENAI_MODEL_ID = 'openai:gpt-5.4-pro';
export const DEFAULT_ANTHROPIC_MODEL_ID = 'anthropic:claude-opus-4-6';
export const DEFAULT_GOOGLE_MODEL_ID = 'google:gemini-3.1-pro-preview';

export const MODEL_CATALOG: CatalogModel[] = [
  // OpenAI
  { id: 'openai:gpt-5.4', label: 'GPT-5.4', provider: 'openai', description: 'Latest general model' },
  { id: 'openai:gpt-5.4-pro', label: 'GPT-5.4 Pro', provider: 'openai', description: 'Highest-end GPT-5.4' },
  { id: 'openai:gpt-5.3-chat', label: 'GPT-5.3 Chat', provider: 'openai', description: 'Chat-optimized GPT-5.3' },
  { id: 'openai:gpt-5.2-pro', label: 'GPT-5.2 Pro', provider: 'openai', description: 'Strong reasoning fallback' },
  { id: 'openai:gpt-4o', label: 'GPT-4o', provider: 'openai', description: 'Fast multimodal fallback' },
  // Anthropic
  { id: 'anthropic:claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic', description: 'Latest flagship' },
  { id: 'anthropic:claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic', description: 'Requested Opus 4.5 option' },
  { id: 'anthropic:claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', description: 'Latest balanced model' },
  { id: 'anthropic:claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', description: 'Strong reasoning' },
  { id: 'anthropic:claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', description: 'Fast and cheap' },
  // Google
  { id: 'google:gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'google', description: 'Latest Gemini 3.1 pro preview' },
  { id: 'google:gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'google', description: 'Gemini 3 generation' },
  { id: 'google:gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite', provider: 'google', description: 'Lightweight Gemini 3.1' },
  { id: 'google:gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google', description: 'Stable pro fallback' },
  { id: 'google:gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google', description: 'Fast fallback' },
];

const catalogById = new Map(MODEL_CATALOG.map((m) => [m.id, m]));

export function getModelById(id: string): CatalogModel | undefined {
  return catalogById.get(id);
}

export function getModelsByProvider(provider: CatalogModel['provider']): CatalogModel[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

export function getDefaultModelId(): string {
  return DEFAULT_OPENAI_MODEL_ID;
}

/** Initial model selection for new chat: top OpenAI, Anthropic, and Google picks. */
export function getDefaultCompareModelIds(): string[] {
  return [DEFAULT_OPENAI_MODEL_ID, DEFAULT_ANTHROPIC_MODEL_ID, DEFAULT_GOOGLE_MODEL_ID];
}
