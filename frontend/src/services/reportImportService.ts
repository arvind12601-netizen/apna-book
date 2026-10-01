import * as XLSX from "xlsx-js-style";
import axiosInstance from "../api/axiosInstance";

export type ReportType =
  | "receipt-payment-account"
  | "26as"
  | "tax-status"
  | "gstr1-vs-gstr3b"
  | "gstr2a-vs-gstr2b"
  | "books-vs-2a"
  | "books-vs-gstr1";

export interface ReportMeta {
  id: ReportType;
  name: string;
  reportPath: string;
  category: string;
  description: string;
  fields: string[];
  sampleData: Record<string, any>[];
}

export const REPORT_META_MAP: Record<ReportType, ReportMeta> = {
  "receipt-payment-account": {
    id: "receipt-payment-account",
    name: "Receipt and Payment Account",
    reportPath: "/app/reports/receipt-payment-account",
    category: "Accounting Reports",
    description: "Import summary of cash and bank receipts and payments",
    fields: ["Date", "Category", "Type", "Head", "Amount", "Remarks"],
    sampleData: [
      {
        Date: "2026-04-01",
        Category: "Opening Cash Balance",
        Type: "Receipt",
        Head: "Cash",
        Amount: 15000,
        Remarks: "Opening Balance",
      },
      {
        Date: "2026-04-01",
        Category: "Opening Bank Balance",
        Type: "Receipt",
        Head: "Bank",
        Amount: 85000,
        Remarks: "HDFC Bank Opening",
      },
      {
        Date: "2026-04-10",
        Category: "Sales Collection",
        Type: "Receipt",
        Head: "Bank",
        Amount: 120000,
        Remarks: "Customer Invoice Payments",
      },
      {
        Date: "2026-04-15",
        Category: "Office Rent",
        Type: "Payment",
        Head: "Bank",
        Amount: 25000,
        Remarks: "April Rent",
      },
      {
        Date: "2026-04-25",
        Category: "Staff Salaries",
        Type: "Payment",
        Head: "Bank",
        Amount: 45000,
        Remarks: "April Salaries",
      },
    ],
  },
  "26as": {
    id: "26as",
    name: "26Ab (Form 26AS Report)",
    reportPath: "/app/reports/26as",
    category: "Accounting Reports",
    description: "Import Form 26AS / 26AB TDS & TCS tax credit statement details",
    fields: [
      "Deductor TAN",
      "Deductor Name",
      "Section",
      "Transaction Date",
      "Total Amount Paid",
      "TDS Deducted",
      "TDS Deposited",
      "Status",
    ],
    sampleData: [
      {
        "Deductor TAN": "MUMS12345F",
        "Deductor Name": "TechCorp Solutions Pvt Ltd",
        Section: "194C",
        "Transaction Date": "2026-04-10",
        "Total Amount Paid": 150000,
        "TDS Deducted": 3000,
        "TDS Deposited": 3000,
        Status: "Matched",
      },
      {
        "Deductor TAN": "DELA98765G",
        "Deductor Name": "Alpha Enterprises Ltd",
        Section: "194J",
        "Transaction Date": "2026-04-20",
        "Total Amount Paid": 200000,
        "TDS Deducted": 20000,
        "TDS Deposited": 20000,
        Status: "Matched",
      },
    ],
  },
  "tax-status": {
    id: "tax-status",
    name: "Tax Status",
    reportPath: "/app/reports/tax-status",
    category: "Accounting Reports",
    description: "Import GST & Statutory compliance return filing status data",
    fields: [
      "Return Period",
      "Tax Type",
      "Due Date",
      "Filing Date",
      "ARN Number",
      "Tax Liability",
      "Tax Paid",
      "Compliance Status",
    ],
    sampleData: [
      {
        "Return Period": "April 2026",
        "Tax Type": "GSTR-1",
        "Due Date": "2026-05-11",
        "Filing Date": "2026-05-10",
        "ARN Number": "AA2704260011223",
        "Tax Liability": 54000,
        "Tax Paid": 54000,
        "Compliance Status": "Filed",
      },
      {
        "Return Period": "April 2026",
        "Tax Type": "GSTR-3B",
        "Due Date": "2026-05-20",
        "Filing Date": "2026-05-19",
        "ARN Number": "AA2704260011224",
        "Tax Liability": 54000,
        "Tax Paid": 54000,
        "Compliance Status": "Filed",
      },
      {
        "Return Period": "Q1 2026-27",
        "Tax Type": "TDS 26Q",
        "Due Date": "2026-07-31",
        "Filing Date": "-",
        "ARN Number": "-",
        "Tax Liability": 23000,
        "Tax Paid": 0,
        "Compliance Status": "Pending",
      },
    ],
  },
  "gstr1-vs-gstr3b": {
    id: "gstr1-vs-gstr3b",
    name: "GSTR1 vs GSTR3B",
    reportPath: "/app/reports/gstr1-vs-gstr3b",
    category: "Sales Reports",
    description: "Import GSTR-1 vs GSTR-3B reconciliation comparison data",
    fields: [
      "Return Period",
      "GSTR1 Taxable Value",
      "GSTR3B Taxable Value",
      "GSTR1 IGST",
      "GSTR3B IGST",
      "GSTR1 CGST",
      "GSTR3B CGST",
      "GSTR1 SGST",
      "GSTR3B SGST",
      "Variance Status",
    ],
    sampleData: [
      {
        "Return Period": "April 2026",
        "GSTR1 Taxable Value": 500000,
        "GSTR3B Taxable Value": 500000,
        "GSTR1 IGST": 45000,
        "GSTR3B IGST": 45000,
        "GSTR1 CGST": 22500,
        "GSTR3B CGST": 22500,
        "GSTR1 SGST": 22500,
        "GSTR3B SGST": 22500,
        "Variance Status": "Matched",
      },
      {
        "Return Period": "May 2026",
        "GSTR1 Taxable Value": 650000,
        "GSTR3B Taxable Value": 620000,
        "GSTR1 IGST": 58500,
        "GSTR3B IGST": 55800,
        "GSTR1 CGST": 29250,
        "GSTR3B CGST": 27900,
        "GSTR1 SGST": 29250,
        "GSTR3B SGST": 27900,
        "Variance Status": "Mismatched",
      },
    ],
  },
  "gstr2a-vs-gstr2b": {
    id: "gstr2a-vs-gstr2b",
    name: "GSTR2A vs GSTR2B Matching",
    reportPath: "/app/reports/gstr2a-vs-gstr2b",
    category: "Sales Reports",
    description: "Import GSTR-2A vs GSTR-2B ITC comparison and invoice matching data",
    fields: [
      "Supplier GSTIN",
      "Supplier Name",
      "Invoice Number",
      "Invoice Date",
      "2A Taxable Amount",
      "2B Taxable Amount",
      "2A Total Tax",
      "2B Total Tax",
      "ITC Status",
    ],
    sampleData: [
      {
        "Supplier GSTIN": "27AAAAA0000A1Z5",
        "Supplier Name": "Global Supplies Ltd",
        "Invoice Number": "INV-2026-001",
        "Invoice Date": "2026-04-10",
        "2A Taxable Amount": 100000,
        "2B Taxable Amount": 100000,
        "2A Total Tax": 18000,
        "2B Total Tax": 18000,
        "ITC Status": "Matched",
      },
      {
        "Supplier GSTIN": "27BBBBB1111B2Z6",
        "Supplier Name": "Nexus Logistics Inc",
        "Invoice Number": "INV-2026-089",
        "Invoice Date": "2026-04-12",
        "2A Taxable Amount": 45000,
        "2B Taxable Amount": 0,
        "2A Total Tax": 8100,
        "2B Total Tax": 0,
        "ITC Status": "2A Only",
      },
    ],
  },
  "books-vs-2a": {
    id: "books-vs-2a",
    name: "Books vs 2A",
    reportPath: "/app/reports/books-vs-2a",
    category: "Purchase Reports",
    description: "Import Books Purchase Ledger vs GSTR-2A matching data",
    fields: [
      "Supplier GSTIN",
      "Supplier Name",
      "Book Invoice No",
      "2A Invoice No",
      "Invoice Date",
      "Book Taxable Value",
      "2A Taxable Value",
      "Book Tax Amount",
      "2A Tax Amount",
      "Match Status",
    ],
    sampleData: [
      {
        "Supplier GSTIN": "27AAAAA0000A1Z5",
        "Supplier Name": "Prime Tech India",
        "Book Invoice No": "PUR-2026-001",
        "2A Invoice No": "INV-1001",
        "Invoice Date": "2026-04-05",
        "Book Taxable Value": 80000,
        "2A Taxable Value": 80000,
        "Book Tax Amount": 14400,
        "2A Tax Amount": 14400,
        "Match Status": "Matched",
      },
      {
        "Supplier GSTIN": "27CCCC2222C3Z7",
        "Supplier Name": "Apex Hardware Ltd",
        "Book Invoice No": "PUR-2026-008",
        "2A Invoice No": "-",
        "Invoice Date": "2026-04-18",
        "Book Taxable Value": 35000,
        "2A Taxable Value": 0,
        "Book Tax Amount": 6300,
        "2A Tax Amount": 0,
        "Match Status": "In Books Only",
      },
    ],
  },
  "books-vs-gstr1": {
    id: "books-vs-gstr1",
    name: "Books vs GSTR1",
    reportPath: "/app/reports/books-vs-gstr1",
    category: "Purchase Reports",
    description: "Import Books Sales Register vs Filed GSTR-1 matching data",
    fields: [
      "Customer GSTIN",
      "Customer Name",
      "Book Invoice No",
      "GSTR1 Invoice No",
      "Invoice Date",
      "Book Taxable Value",
      "GSTR1 Taxable Value",
      "Book Tax Amount",
      "GSTR1 Tax Amount",
      "Match Status",
    ],
    sampleData: [
      {
        "Customer GSTIN": "27DDDDD3333D4Z8",
        "Customer Name": "Swift Traders",
        "Book Invoice No": "SAL-2026-101",
        "GSTR1 Invoice No": "SAL-2026-101",
        "Invoice Date": "2026-04-08",
        "Book Taxable Value": 150000,
        "GSTR1 Taxable Value": 150000,
        "Book Tax Amount": 27000,
        "GSTR1 Tax Amount": 27000,
        "Match Status": "Matched",
      },
      {
        "Customer GSTIN": "27EEEEE4444E5Z9",
        "Customer Name": "Crown Enterprises",
        "Book Invoice No": "SAL-2026-104",
        "GSTR1 Invoice No": "SAL-2026-104",
        "Invoice Date": "2026-04-14",
        "Book Taxable Value": 90000,
        "GSTR1 Taxable Value": 85000,
        "Book Tax Amount": 16200,
        "GSTR1 Tax Amount": 15300,
        "Match Status": "Mismatched",
      },
    ],
  },
};

export interface StoredReportData {
  type: ReportType;
  companyId: string;
  importedAt: string;
  rows: Record<string, any>[];
}

const STORAGE_PREFIX = "apnabook_report_data_";

export async function saveReportData(
  type: ReportType,
  rows: Record<string, any>[],
  companyId?: string
): Promise<{ success: boolean; count: number; message: string }> {
  const currentCompanyId = companyId || localStorage.getItem("company_id") || "default";
  const payload: StoredReportData = {
    type,
    companyId: currentCompanyId,
    importedAt: new Date().toISOString(),
    rows,
  };

  // Try API first, fallback to local storage
  try {
    const res = await axiosInstance.post(`/reports/import/${type}`, {
      company_id: currentCompanyId,
      rows,
    });
    if (res.data && res.data.success) {
      console.log(`Report data saved via API for ${type}`);
    }
  } catch (err) {
    console.warn(`Backend endpoint /api/reports/import/${type} not reached. Falling back to frontend persistence.`);
  }

  // Local storage persistence fallback
  const storageKey = `${STORAGE_PREFIX}${currentCompanyId}_${type}`;
  localStorage.setItem(storageKey, JSON.stringify(payload));

  return {
    success: true,
    count: rows.length,
    message: `Successfully saved ${rows.length} rows for ${REPORT_META_MAP[type].name}`,
  };
}

export function getReportData(
  type: ReportType,
  companyId?: string
): StoredReportData | null {
  const currentCompanyId = companyId || localStorage.getItem("company_id") || "default";
  const storageKey = `${STORAGE_PREFIX}${currentCompanyId}_${type}`;
  const stored = localStorage.getItem(storageKey);

  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredReportData;
  } catch (e) {
    console.error("Failed to parse stored report data", e);
    return null;
  }
}

export function clearReportData(type: ReportType, companyId?: string): void {
  const currentCompanyId = companyId || localStorage.getItem("company_id") || "default";
  const storageKey = `${STORAGE_PREFIX}${currentCompanyId}_${type}`;
  localStorage.removeItem(storageKey);
}

export function downloadReportTemplate(type: ReportType): void {
  const meta = REPORT_META_MAP[type];
  if (!meta) return;

  const ws = XLSX.utils.json_to_sheet(meta.sampleData);
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  ws["!rows"] = [{ hpt: 30 }];
  ws["!cols"] = Array(range.e.c + 1).fill({ wch: 20 });

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "DC2626" } }, // Red header to indicate pending setup feature template
      alignment: { wrapText: true, horizontal: "center", vertical: "center" },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `${meta.id}_template.xlsx`);
}
