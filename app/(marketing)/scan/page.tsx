"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to homepage with scan tab active
    router.replace('/?tab=scan')
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-4" />
        <p className="text-neutral-400">Redirecting to scan...</p>
      </div>
    </div>
  )
}