interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="flex items-start justify-between p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-start">
        <span className="mr-2 text-red-600">⚠️</span>
        <p className="text-sm text-red-800">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 text-red-600 hover:text-red-800"
        >
          ×
        </button>
      )}
    </div>
  );
}
