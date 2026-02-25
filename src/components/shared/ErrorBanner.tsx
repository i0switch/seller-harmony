import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({ error, message, onRetry, className }: ErrorBannerProps) {
  const err = error as Record<string, unknown> | undefined;
  const code = err?.code as string | undefined;
  const displayMessage = (err?.message as string | undefined) || message || "データの取得に失敗しました";
  const hint = err?.hint as string | undefined;

  return (
    <div className={`rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3 ${className || ""}`}>
      <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
      <p className="text-sm font-medium text-destructive">
        {displayMessage} {code && `(${code})`}
      </p>
      {hint && <p className="text-xs text-destructive/80 mt-1 whitespace-pre-wrap">{hint}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="hover:bg-destructive/10">
          <RefreshCw className="h-4 w-4 mr-1" /> 再試行
        </Button>
      )}
    </div>
  );
}
