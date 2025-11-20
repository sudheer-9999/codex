export default function PostsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="animate-pulse rounded-lg bg-white p-6 shadow-md"
        >
          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-200" />
            </div>
          </div>

          {/* Content lines */}
          <div className="mb-4 space-y-3">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
          </div>

          {/* Image / video placeholder */}
          <div className="mb-4 h-64 w-full rounded-xl bg-gray-200" />

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <div className="h-8 w-16 rounded bg-gray-200" />
            <div className="h-8 w-16 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
