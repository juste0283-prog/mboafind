// Message d'erreur d'API réutilisable.
export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300"
      role="alert"
    >
      {message}
    </div>
  );
}