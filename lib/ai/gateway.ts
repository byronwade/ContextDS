/**
 * Vercel AI Gateway helpers for designcontracts.sh
 *
 * AI SDK 7 routes provider/model strings (e.g. "openai/gpt-5.4-mini") through
 * the Gateway automatically — failover, observability, and cost tracking.
 * On Vercel, OIDC auth works without AI_GATEWAY_API_KEY; locally set
 * AI_GATEWAY_API_KEY (https://vercel.com/docs/ai-gateway).
 */

import { createGateway } from 'ai'

export const DEFAULT_AGENT_MODEL = process.env.DESIGN_AGENT_MODEL?.trim() || 'openai/gpt-5.4-mini'

export const DEFAULT_FAST_MODEL = process.env.DESIGN_FAST_MODEL?.trim() || 'openai/gpt-5.4-mini'

/** Explicit Gateway provider (optional; string models also use Gateway). */
export const aiGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

/** Language model via AI Gateway for ToolLoopAgent / generateText. */
export function agentModel(modelId: string = DEFAULT_AGENT_MODEL) {
  return aiGateway(modelId)
}

/** True when Gateway can authenticate (OIDC on Vercel or explicit API key). */
export function isAiGatewayConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL
  )
}
