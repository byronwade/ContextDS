'use client'

/**
 * Phosphor icons with a duotone default.
 *
 * Surfaces outside the AppShell IconContext (marketing chrome, chat widgets)
 * import from here so every icon renders duotone without threading a weight
 * prop through each call site. Local names mirror @phosphor-icons/react.
 */

import { forwardRef } from 'react'
import * as P from '@phosphor-icons/react'
import type { Icon, IconProps } from '@phosphor-icons/react'

export type { Icon, IconProps }

function duotone(Base: Icon): Icon {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>(function DuotoneIcon(
    props,
    ref
  ) {
    return <Base ref={ref} weight="duotone" {...props} />
  })
  Wrapped.displayName = Base.displayName ?? 'DuotoneIcon'
  return Wrapped as Icon
}

export const ArrowDownIcon = duotone(P.ArrowDownIcon)
export const ArrowElbowDownLeftIcon = duotone(P.ArrowElbowDownLeftIcon)
export const ArrowSquareOutIcon = duotone(P.ArrowSquareOutIcon)
export const ArrowUpRightIcon = duotone(P.ArrowUpRightIcon)
export const ArrowsClockwiseIcon = duotone(P.ArrowsClockwiseIcon)
export const CaretDownIcon = duotone(P.CaretDownIcon)
export const CaretLeftIcon = duotone(P.CaretLeftIcon)
export const CaretRightIcon = duotone(P.CaretRightIcon)
export const CheckCircleIcon = duotone(P.CheckCircleIcon)
export const CheckIcon = duotone(P.CheckIcon)
export const CircleIcon = duotone(P.CircleIcon)
export const CircleNotchIcon = duotone(P.CircleNotchIcon)
export const ClockIcon = duotone(P.ClockIcon)
export const CopyIcon = duotone(P.CopyIcon)
export const DesktopIcon = duotone(P.DesktopIcon)
export const DeviceMobileIcon = duotone(P.DeviceMobileIcon)
export const DeviceTabletIcon = duotone(P.DeviceTabletIcon)
export const DownloadSimpleIcon = duotone(P.DownloadSimpleIcon)
export const EyeIcon = duotone(P.EyeIcon)
export const GithubLogoIcon = duotone(P.GithubLogoIcon)
export const ImageIcon = duotone(P.ImageIcon)
export const ListIcon = duotone(P.ListIcon)
export const MagnifyingGlassIcon = duotone(P.MagnifyingGlassIcon)
export const PaletteIcon = duotone(P.PaletteIcon)
export const PlusIcon = duotone(P.PlusIcon)
export const SparkleIcon = duotone(P.SparkleIcon)
export const SquareIcon = duotone(P.SquareIcon)
export const TrashIcon = duotone(P.TrashIcon)
export const WarningCircleIcon = duotone(P.WarningCircleIcon)
export const WarningIcon = duotone(P.WarningIcon)
export const WrenchIcon = duotone(P.WrenchIcon)
export const XCircleIcon = duotone(P.XCircleIcon)
export const XIcon = duotone(P.XIcon)
