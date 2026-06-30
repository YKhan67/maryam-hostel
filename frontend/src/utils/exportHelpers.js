// src/utils/exportHelpers.js

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Convert inventory rows to a flat array of objects that Excel/PDF can use.
 */
function mapRows(rows) {
  return rows.map((r) => ({
    Date: r.date || "",
    Hostel: r.hostel || "",
    Vendor: r.vendor || "",
    Invoice: r.invoice_no || "",
    Item: r.item || "",
    Qty: r.quantity ?? "",
    "Unit price": r.price_per_unit ?? "",
    "Total cost": r.total_cost ?? "",
  }));
}

export function exportInventoryToExcel(rows, meta = {}) {
  if (!rows || rows.length === 0) {
    alert("No rows to export.");
    return;
  }

  const data = mapRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  const fileName =
    meta.fileName ||
    `maryam_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, fileName);
}

export function exportInventoryToPdf(rows, meta = {}) {
  if (!rows || rows.length === 0) {
    alert("No rows to export.");
    return;
  }

  const doc = new jsPDF("l", "pt"); // landscape, points
  const mapped = mapRows(rows);

  const title = meta.title || "Maryam Hostel – Inventory Report";
  const filters = meta.filters || "";

  doc.setFontSize(16);
  doc.text(title, 40, 40);

  if (filters) {
    doc.setFontSize(10);
    doc.text(`Filters: ${filters}`, 40, 60);
  }

  // Use autoTable helper instead of doc.autoTable
  autoTable(doc, {
    startY: 80,
    head: [Object.keys(mapped[0])],
    body: mapped.map((r) => Object.values(r)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [230, 230, 230] },
  });

  const fileName =
    meta.fileName ||
    `maryam_inventory_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
