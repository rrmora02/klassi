"use client";

export default function SelectOrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-md flex-col items-center gap-4 px-4 text-center">
        <span className="text-2xl font-semibold text-violet-900">Klassi</span>
        <p className="text-sm text-gray-600">
          Ocurrió un error al cargar las escuelas.
        </p>
        <p className="text-xs text-gray-400">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-violet-900 px-4 py-2 text-sm text-white hover:bg-violet-800"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
