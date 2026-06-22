import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Shipment } from "@/types";
import { format } from "date-fns";

export const exportShipmentsToExcel = async (shipments: Shipment[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Shipments");

  // Define columns
  worksheet.columns = [
    { header: "REF NO", key: "ref_no", width: 15 },
    { header: "CUSTOMER ID", key: "customer_id", width: 15 },
    { header: "POL", key: "pol", width: 20 },
    { header: "POD", key: "pod", width: 20 },
    { header: "MODE", key: "mode", width: 10 },
    { header: "CONTAINER", key: "container", width: 15 },
    { header: "COMMODITY", key: "commodity", width: 20 },
    { header: "CARRIER", key: "carrier", width: 20 },
    { header: "BL NUMBER", key: "bl_number", width: 18 },
    { header: "COST (QAR)", key: "cost", width: 15 },
    { header: "PROFIT (QAR)", key: "profit", width: 15 },
    { header: "ETD", key: "etd", width: 15 },
    { header: "ETA", key: "eta", width: 15 },
    { header: "STATUS", key: "status", width: 18 },
    { header: "DATE CREATED", key: "created_at", width: 20 },
  ];

  // Add rows
  shipments.forEach((s) => {
    worksheet.addRow({
      ref_no: s.ref_no,
      customer_id: s.customer_id || "—",
      pol: s.pol || "—",
      pod: s.pod || "—",
      mode: s.mode || "—",
      container: s.container || "—",
      commodity: s.commodity || "—",
      carrier: s.carrier || "—",
      bl_number: s.bl_number || "—",
      cost: s.cost != null ? `QAR ${Number(s.cost).toFixed(2)}` : "—",
      profit: s.profit != null ? `QAR ${Number(s.profit).toFixed(2)}` : "—",
      etd: s.etd ? format(new Date(s.etd), "dd MMM yyyy") : "—",
      eta: s.eta ? format(new Date(s.eta), "dd MMM yyyy") : "—",
      status: s.status,
      created_at: format(new Date(s.created_at), "dd MMM yyyy, HH:mm"),
    });
  });

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark Blue
    };
    cell.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 11,
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 25;

  // Style Data Rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const status = row.getCell("status").value as string;
    let bgColor = "FFFFFFFF"; // Default white

    switch (status) {
      case "Pending":         bgColor = "FFFFFBEB"; break; // Amber-50
      case "Quoted":          bgColor = "FFEFF6FF"; break; // Blue-50
      case "Customer Review": bgColor = "FFF5F3FF"; break; // Violet-50
      case "Confirmed":       bgColor = "FFF0FDF4"; break; // Green-50
      case "Files Pending":   bgColor = "FFFFF7ED"; break; // Orange-50
      case "Completed":       bgColor = "FFECFDF5"; break; // Emerald-50
      case "Return Pending":  bgColor = "FFFFF1F2"; break; // Rose-50
      case "Cancelled":       bgColor = "FFF8FAFC"; break; // Slate-50
      default:                bgColor = "FFFFFFFF"; break;
    }

    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
    });
  });

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
};

export const exportContactsToExcel = async (contacts: any[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Address Book");

  // Define columns
  worksheet.columns = [
    { header: "EMAIL", key: "email", width: 30 },
    { header: "NAME (DEAR WHO)", key: "dear_who", width: 20 },
    { header: "COUNTRY", key: "country", width: 20 },
    { header: "DEFAULT POL", key: "pol", width: 25 },
    { header: "DEFAULT POD", key: "pod", width: 25 },
    { header: "MODE", key: "mode", width: 15 },
    { header: "DATE ADDED", key: "created_at", width: 20 },
  ];

  // Add rows
  contacts.forEach((c) => {
    worksheet.addRow({
      email: c.email || "—",
      dear_who: c.dear_who || "—",
      country: c.country || "—",
      pol: c.pol || "—",
      pod: c.pod || "—",
      mode: c.mode || "—",
      created_at: c.created_at ? format(new Date(c.created_at), "dd MMM yyyy, HH:mm") : "—",
    });
  });

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark Blue
    };
    cell.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 11,
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 25;

  // Style Data Rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
    });
  });

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
};
