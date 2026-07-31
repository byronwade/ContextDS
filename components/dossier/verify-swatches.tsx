'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { ColorSystem } from '@/lib/analyzers/design-philosophy'

type Verification = {
  verified: string[]
  unverified: string[]
}

/**
 * Screenshot-driven token verification.
 *
 * Renders the captured screenshot into a small canvas, builds a coarse pixel
 * histogram, and checks every extracted color against the dominant buckets —
 * proof the palette actually appears on the live page, not just in dormant CSS.
 * Fails silently when the capture can't be read cross-origin.
 */
export function VerifySwatches({
  system,
  screenshotUrl,
}: {
  system: ColorSystem
  screenshotUrl: string | null
}) {
  const [result, setResult] = useState<Verification | null>(null)

  useEffect(() => {
    if (!screenshotUrl || system.all.length === 0) return
    let cancelled = false

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const width = 128
        const height = Math.max(1, Math.round((image.height / image.width) * width))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return
        context.drawImage(image, 0, 0, width, height)
        const { data } = context.getImageData(0, 0, width, height)

        // Coarse histogram: 4 bits per channel
        const counts = new Map<number, number>()
        const totalPixels = width * height
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const key =
            ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
        const dominant: Array<[number, number, number]> = []
        for (const [key, count] of counts) {
          if (count / totalPixels < 0.0015) continue
          dominant.push([
            ((key >> 8) & 0xf) * 17 + 8,
            ((key >> 4) & 0xf) * 17 + 8,
            (key & 0xf) * 17 + 8,
          ])
        }
        if (dominant.length === 0) return

        const verified: string[] = []
        const unverified: string[] = []
        for (const color of system.all.slice(0, 20)) {
          const { r, g, b } = color.rgb
          let best = Infinity
          for (const [dr, dg, db] of dominant) {
            const distance = Math.sqrt(
              (r - dr) ** 2 * 0.3 + (g - dg) ** 2 * 0.59 + (b - db) ** 2 * 0.11
            )
            if (distance < best) best = distance
          }
          if (best < 26) verified.push(color.hex)
          else unverified.push(color.hex)
        }
        if (!cancelled) setResult({ verified, unverified })
      } catch {
        // tainted canvas (no CORS on capture) — verification unavailable
      }
    }
    image.onerror = () => {}
    image.src = screenshotUrl

    return () => {
      cancelled = true
    }
  }, [screenshotUrl, system])

  if (!result) return null
  const total = result.verified.length + result.unverified.length
  if (total === 0) return null

  return (
    <div className="rounded-xl border border-[color:var(--soft-border)] bg-card/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          {result.unverified.length === 0 ? (
            <CheckIcon className="size-3.5 text-[var(--ui-success)]" />
          ) : (
            <WarningCircleIcon className="size-3.5 text-[var(--ui-warning)]" />
          )}
          Screenshot verification
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {result.verified.length}/{total} extracted colors found in the live capture
        </span>
      </div>
      {result.unverified.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            not seen on page
          </span>
          {result.unverified.slice(0, 10).map((hex) => (
            <span
              key={hex}
              title={`${hex} — extracted from CSS but not visible in the capture`}
              className={cn(
                'block size-4 rounded-[4px] border border-[color:var(--soft-border)] opacity-70'
              )}
              style={{ background: hex }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
