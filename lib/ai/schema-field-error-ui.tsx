'use client'

import { SchemaFieldErrors } from '@/components/molecules/schema-field-errors'

type FieldErrorLike = {
  path?: string
  message: string
}

/**
 * Renders SchemaValidator validation errors with a FormMessage-style surface
 * (`data-slot="form-message"`).
 */
export function renderSchemaFieldErrors(errors: FieldErrorLike[]) {
  if (!errors.length) return null
  return <SchemaFieldErrors errors={errors} />
}
