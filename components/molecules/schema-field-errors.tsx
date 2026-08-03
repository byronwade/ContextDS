'use client'

/**
 * Field-level error surface for SchemaValidator / AI validation results.
 * Keeps validation errors visible beside forms that consume repaired payloads.
 */
export function SchemaFieldErrors({
  errors,
}: {
  errors: Array<{ path?: string; message: string }>
}) {
  if (!errors.length) return null

  return (
    <ul role="alert" className="space-y-1 text-xs text-destructive">
      {errors.map((error, index) => (
        <li key={`${error.path || 'field'}-${index}`} data-slot="form-message">
          {error.path ? (
            <span className="font-mono">{error.path}: </span>
          ) : null}
          {error.message}
        </li>
      ))}
    </ul>
  )
}
