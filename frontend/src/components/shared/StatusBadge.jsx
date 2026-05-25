import { cn } from "@/lib/utils.js";
import { statusColors } from "@/utils/helpers.js";

export function StatusBadge({ value, className }) {
  const key   = String(value).toUpperCase();
  const color = statusColors[key] || statusColors[value] || "bg-gray-100 text-gray-700 border-gray-200";
  const label = String(value).replace(/_/g, " ");

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", color, className)}>
      {label}
    </span>
  );
}
