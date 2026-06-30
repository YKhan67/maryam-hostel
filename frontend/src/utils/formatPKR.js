// src/utils/formatPKR.js
export function formatPKR(value) {
  if (value == null || isNaN(value)) return "PKR 0";

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2, // or 2 if you prefer decimals
  }).format(Number(value));
}
