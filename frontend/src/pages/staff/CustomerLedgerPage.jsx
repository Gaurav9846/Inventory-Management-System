// src/pages/staff/CustomerLedgerPage.jsx

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CustomerLedger } from "@/components/credit/CustomerLedger";

export default function CustomerLedgerPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Ledger</h1>
          <p className="text-gray-600 mt-1">Complete transaction history and outstanding balance</p>
        </div>
      </div>

      <CustomerLedger customerId={customerId} />
    </div>
  );
}