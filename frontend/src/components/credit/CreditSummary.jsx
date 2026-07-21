// src/components/credit/CreditSummary.jsx

import { useState, useEffect } from "react";
import { creditApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/utils/helpers";

export function CreditSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await creditApi.getSummary();
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: "Total Outstanding",
      value: formatCurrency(summary.totalRemaining),
      icon: Wallet,
      color: "bg-red-500",
      textColor: "text-red-600",
    },
    {
      title: "Total Paid",
      value: formatCurrency(summary.totalPaid),
      icon: TrendingUp,
      color: "bg-green-500",
      textColor: "text-green-600",
    },
    {
      title: "Active Accounts",
      value: summary.activeCreditAccounts,
      icon: CreditCard,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      title: "Overdue Accounts",
      value: summary.overdueAccounts,
      icon: AlertCircle,
      color: "bg-red-500",
      textColor: "text-red-600",
    },
    {
      title: "Average Installments",
      value: summary.averageInstallments,
      icon: Clock,
      color: "bg-purple-500",
      textColor: "text-purple-600",
    },
    {
      title: "Recent Payments (30 days)",
      value: `${summary.recentPaymentCount} payments`,
      subtitle: formatCurrency(summary.recentPaymentAmount),
      icon: TrendingDown,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">
                  {card.title}
                </p>
                <p className={`text-xl font-bold mt-1 ${card.textColor}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{card.subtitle}</p>
                )}
              </div>
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}