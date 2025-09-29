"use client"

import Link from "next/link"

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <Link
        href="#main-content"
        className="absolute left-6 top-6 z-50 bg-black px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </Link>
      <Link
        href="#search-input"
        className="absolute left-6 top-16 z-50 bg-black px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to search
      </Link>
    </div>
  )
}