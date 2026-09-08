// Spinner de chargement réutilisable.
export default function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center"
          : "flex items-center justify-center py-8"
      }
      role="status"
      aria-label="Chargement"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
    </div>
  );
}