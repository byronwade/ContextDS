'use client'

import { Button } from '@/components/ui/button'
import { useCheckout, type CheckoutSku } from '@/lib/premium'
import { cn } from '@/lib/utils'

export function CheckoutButton({
  sku = 'pack_single',
  label = 'Buy credits',
  className,
  variant = 'default',
}: {
  sku?: CheckoutSku
  label?: string
  className?: string
  variant?: 'default' | 'secondary' | 'outline'
}) {
  const { checkout, loading, error } = useCheckout(sku)

  return (
    <div className="w-full">
      <Button
        type="button"
        variant={variant}
        className={cn('w-full', className)}
        disabled={loading}
        onClick={() => void checkout()}
      >
        {loading ? 'Redirecting to Stripe…' : label}
      </Button>
      {error ? (
        <p className="mt-2 text-center text-xs text-[var(--ui-danger)]">{error}</p>
      ) : null}
    </div>
  )
}

/** @deprecated Prefer CheckoutButton with an explicit sku */
export function ProCheckoutButton({
  label = 'Upgrade to Pro',
  className,
  variant = 'default',
}: {
  label?: string
  className?: string
  variant?: 'default' | 'secondary' | 'outline'
}) {
  return (
    <CheckoutButton sku="pro" label={label} className={className} variant={variant} />
  )
}
