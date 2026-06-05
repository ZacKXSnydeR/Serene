import { adminRpc } from "./adminRpc";

export interface PluginMeta {
  id: string;
  name: string;
  status: "configured" | "unconfigured";
}

// Internal cache to prevent spamming the backend
let cachedSchema: any = null;
let cachedModels: any = null;

/**
 * Fetches the raw schema and models from OpenClaw.
 * Uses a basic caching mechanism to avoid redundant network requests.
 */
async function fetchRawData(forceRefresh = false) {
  if (!cachedSchema || forceRefresh) {
    cachedSchema = await adminRpc("config.schema");
  }
  if (!cachedModels || forceRefresh) {
    cachedModels = await adminRpc("models.list").catch(() => ({ models: [] }));
  }
  return { schemaRes: cachedSchema, modelsRes: cachedModels };
}

/**
 * Gets the set of currently configured plugin IDs based on active models.
 */
function getActiveProviderIds(modelsRes: any): Set<string> {
  return new Set((modelsRes.models || []).map((m: any) => m.id.split('/')[0]));
}

const friendlyNames: Record<string, string> = {
  // LLMs
  "openai": "OpenAI (ChatGPT)",
  "google": "Google Gemini",
  "anthropic": "Anthropic Claude",
  "vertex": "Google Cloud Vertex AI",
  "anthropic-vertex": "Anthropic (Vertex AI)",
  "xai": "xAI (Grok)",
  "mistral": "Mistral AI",
  "cohere": "Cohere",
  "groq": "Groq",
  "together": "Together AI",
  "ollama": "Local Models (Ollama)",
  "lmstudio": "LM Studio (Local)",
  "azure-openai": "Azure OpenAI",
  
  // Channels
  "telegram": "Telegram Bot",
  "slack": "Slack Workspace",
  "discord": "Discord Bot",
  "whatsapp": "WhatsApp Business",
  "signal": "Signal Desktop",
  "msteams": "Microsoft Teams"
};

/**
 * Gets a clean, formatted name from a raw plugin schema title or id.
 */
function formatPluginName(rawTitle: string, id: string): string {
  if (friendlyNames[id]) return friendlyNames[id];
  
  const rawLabel = rawTitle || id;
  return rawLabel.replace('@openclaw/', '').replace('-provider', '').replace('-channel', '').toUpperCase();
}

/**
 * Returns a clean list of all AI Engine (LLM) Providers.
 */
export async function getLLMProviders(forceRefresh = false): Promise<PluginMeta[]> {
  const { schemaRes, modelsRes } = await fetchRawData(forceRefresh);
  
  const pluginsProperties = schemaRes?.schema?.properties?.plugins?.properties?.entries?.properties || {};
  const channelsProperties = schemaRes?.schema?.properties?.channels?.properties || {};
  const channelIds = new Set(Object.keys(channelsProperties));
  const activeProviders = getActiveProviderIds(modelsRes);
  
  const providers: PluginMeta[] = [];
  
  // Hardcoded blocklist for internal/system/integration plugins that are not core LLM Engines
  const systemPlugins = new Set([
    // Core Infrastructure
    'admin-http-rpc', 'browser', 'canvas', 'device-pair', 'file-transfer', 
    'memory-core', 'phone-control', 'talk-voice', 'acpx', 'active-memory', 
    'ui', 'agent-manager', 'doctor', 'update', 'cli', 'logging', 'diagnostics', 
    'wizard', 'env', 'meta', 'skill-workshop', 'crestodian', 'open-workspace',
    'diagnostics-otel', 'diagnostics-prometheus', 'llm-task', 'oc-path', 
    'policy', 'qa-lab', 'qa-matrix', 'thread-ownership', 'tokenjuice', 'webhooks',
    'migrate-claude', 'migrate-hermes', 'bonjour', 'chutes', 'open-prose',
    
    // Tools & Integrations (Voice, Search, Video, Image, Execution)
    'azure-speech', 'brave', 'comfy', 'deepgram', 'diffs', 'diffs-language-pack', 
    'document-extract', 'duckduckgo', 'elevenlabs', 'exa', 'fal', 'firecrawl', 
    'google-meet', 'inworld', 'memory-lancedb', 'memory-wiki', 'opencode', 
    'opencode-go', 'openshell', 'pixverse', 'runway', 'searxng', 'senseaudio', 
    'tavily', 'tts-local-cli', 'voice-call', 'web-readability'
  ]);

  for (const id of Object.keys(pluginsProperties)) {
    if (systemPlugins.has(id)) continue;
    if (channelIds.has(id)) continue; // Filter out channels
    
    const pluginSchema = pluginsProperties[id];
    providers.push({
      id,
      name: formatPluginName(pluginSchema.title || pluginSchema.label, id),
      status: activeProviders.has(id) ? "configured" : "unconfigured"
    });
  }
  
  // Sort alphabetically but put configured ones first
  return providers.sort((a, b) => {
    if (a.status === "configured" && b.status !== "configured") return -1;
    if (a.status !== "configured" && b.status === "configured") return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Returns a clean list of all Communication Channels (Telegram, Slack, etc.).
 */
export async function getChannels(forceRefresh = false): Promise<PluginMeta[]> {
  const { schemaRes } = await fetchRawData(forceRefresh);
  
  // Channels are registered under the 'channels' config tree, but their schemas are under plugins
  const pluginsProperties = schemaRes?.schema?.properties?.plugins?.properties?.entries?.properties || {};
  const channelsProperties = schemaRes?.schema?.properties?.channels?.properties || {};
  
  const channels: PluginMeta[] = [];
  
  // For channels, we check if they are "configured" by seeing if they exist in the actual runtime config payload,
  // but since we don't have the active config payload cached, we will assume 'unconfigured' for now until
  // we add `config.get` support.
  
  for (const id of Object.keys(channelsProperties)) {
    // If the channel has a corresponding plugin schema, pull its name from there
    const pluginSchema = pluginsProperties[id] || {};
    channels.push({
      id,
      name: formatPluginName(pluginSchema.title || pluginSchema.label, id),
      status: "unconfigured" // TODO: Verify against active config
    });
  }
  
  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Configures an API Key for a given plugin and enables it.
 */
export async function configurePluginApiKey(id: string, apiKey: string): Promise<void> {
  const keyPath = `plugins.entries.${id}.config.apiKey`;
  const enablePath = `plugins.entries.${id}.enabled`;
  
  await adminRpc("config.patch", {
    updates: {
      [enablePath]: true,
      [keyPath]: apiKey
    }
  });
  
  // Force refresh cache on next pull
  cachedSchema = null;
  cachedModels = null;
}
