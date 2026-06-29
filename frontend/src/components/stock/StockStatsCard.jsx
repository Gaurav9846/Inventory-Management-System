// src/components/stock/StockStatsCard.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function StockStatsCard({ title, value, subtitle, icon: Icon, color = "blue", loading = false }) {
  const colorClasses = {
    blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" },
    red: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${colors.border}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colors.bg}`}>
              <Icon className={`h-5 w-5 ${colors.text}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}