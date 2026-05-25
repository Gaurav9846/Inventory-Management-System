// src/components/shared/LoadingSpinner.jsx
import { cn } from "@/lib/utils.js";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className, text = "Loading…" }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 skeleton rounded flex-1" style={{ opacity: 1 - j * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
