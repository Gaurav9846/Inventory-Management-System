import { Card, CardContent } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

export function StatsCard({ label, value, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", trend, trendLabel, className }) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value ?? "—"}</p>
            {trendLabel && (
              <p className={cn("text-xs mt-1", trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground")}>
                {trendLabel}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", iconBg)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
