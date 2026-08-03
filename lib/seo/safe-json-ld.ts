/**
 * Serialize JSON-LD for inline `<script type="application/ld+json">` without
 * allowing `</script>` breakouts from string values.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
