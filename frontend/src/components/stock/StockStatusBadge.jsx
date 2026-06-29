// src/components/stock/StockStatusBadge.jsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export function StockStatusBadge({ currentStock, reorderLevel, size = "default" }) {
  let label = 'In Stock';
  let icon = CheckCircle;
  let color = 'success';

  if (currentStock === 0) {
    label = 'Out of Stock';
    icon = XCircle;
    color = 'destructive';
  } else if (currentStock <= reorderLevel) {
    label = 'Low Stock';
    icon = AlertTriangle;
    color = 'warning';
  }

  const colorClasses = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    destructive: "bg-red-100 text-red-800 border-red-200",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const IconComponent = icon;
  const sizeClass = sizeClasses[size] || sizeClasses.default;

  return (
    <Badge className={`flex items-center gap-1 ${colorClasses[color]} ${sizeClass}`}>
      <IconComponent className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
      {label}
    </Badge>
  );
}