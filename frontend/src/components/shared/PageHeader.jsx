// src/components/shared/PageHeader.jsx
import { Button } from "@/components/ui/button.jsx";
import { Plus } from "lucide-react";

export function PageHeader({ title, description, action, actionLabel = "Add New", actionIcon: Icon = Plus, onAction, children }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onAction && (
          <Button onClick={onAction} size="sm">
            <Icon className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
