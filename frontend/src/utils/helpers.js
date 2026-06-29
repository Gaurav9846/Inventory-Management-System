// src/utils/helpers.js
import { format, formatDistanceToNow as fnsFormatDistanceToNow } from "date-fns";

export const formatDate = (date, fmt = "dd MMM yyyy") =>
  date ? format(new Date(date), fmt) : "—";

export const formatDateTime = (date) =>
  date ? format(new Date(date), "dd MMM yyyy, hh:mm a") : "—";

// ✅ Add this export for formatDistanceToNow
export const formatDistanceToNow = (date) =>
  date ? fnsFormatDistanceToNow(new Date(date), { addSuffix: true }) : "—";

export const timeAgo = (date) =>
  date ? fnsFormatDistanceToNow(new Date(date), { addSuffix: true }) : "—";

export const formatCurrency = (amount, currency = "NPR") =>
  amount != null
    ? `${currency} ${Number(amount).toLocaleString("en-NP", { minimumFractionDigits: 2 })}`
    : "—";

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

export const statusColors = {
  PENDING:    "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED:   "bg-blue-100 text-blue-800 border-blue-200",
  RECEIVED:   "bg-green-100 text-green-800 border-green-200",
  CANCELLED:  "bg-red-100 text-red-800 border-red-200",
  PROCESSING: "bg-purple-100 text-purple-800 border-purple-200",
  DISPATCHED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  COMPLETED:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_TRANSIT: "bg-cyan-100 text-cyan-800 border-cyan-200",
  DELIVERED:  "bg-green-100 text-green-800 border-green-200",
  RETURNED:   "bg-orange-100 text-orange-800 border-orange-200",
  FAILED:     "bg-red-100 text-red-800 border-red-200",
  REFUNDED:   "bg-gray-100 text-gray-800 border-gray-200",
  IN:         "bg-green-100 text-green-800 border-green-200",
  OUT:        "bg-red-100 text-red-800 border-red-200",
  ADJUSTMENT: "bg-blue-100 text-blue-800 border-blue-200",
  ADMIN:      "bg-purple-100 text-purple-800 border-purple-200",
  MANAGER:    "bg-blue-100 text-blue-800 border-blue-200",
  STAFF:      "bg-gray-100 text-gray-800 border-gray-200",
  true:       "bg-green-100 text-green-800 border-green-200",
  false:      "bg-red-100 text-red-800 border-red-200",
};

export const truncate = (str, n = 40) =>
  str && str.length > n ? `${str.slice(0, n)}…` : str;

export const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);