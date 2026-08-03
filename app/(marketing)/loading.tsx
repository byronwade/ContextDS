export default function MarketingLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-1 items-center justify-center px-6"
      role="status"
      aria-label="Loading page"
    >
      <div className="w-full max-w-md space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--ui-paper-subtle)]" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-[var(--ui-paper-subtle)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[var(--ui-paper-subtle)]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--ui-paper-subtle)]" />
      </div>
    </div>
  )
}
