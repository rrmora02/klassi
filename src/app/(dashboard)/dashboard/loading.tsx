const rows = Array.from({ length: 6 }, (_, index) => index);

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 lg:px-0">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-gray-200 dark:bg-sb-uplift" />
        <div className="h-4 w-64 animate-pulse rounded bg-gray-100 dark:bg-sb-house" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-[rgba(255,255,255,0.10)] dark:bg-sb-uplift"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[rgba(255,255,255,0.10)] dark:bg-sb-uplift">
        <div className="border-b border-gray-100 p-4 dark:border-[rgba(255,255,255,0.07)]">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-sb-house" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-[rgba(255,255,255,0.07)]">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-4 p-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-sb-house" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-sb-house" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-sb-house/70" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-sb-house" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
