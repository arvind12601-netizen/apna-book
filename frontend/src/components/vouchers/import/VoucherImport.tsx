
import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Download,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import Swal from "sweetalert2";
import ReportImportSection from "./ReportImportSection";

interface ImportedVoucher {
  id: string;
  date: string;
  voucherType: string;
  voucherNumber: string;
  partyName: string;
  amount: number;
  narration: string;
  items?: ImportedItem[];
  status: "pending" | "imported" | "error";
  errorMessage?: string;
}

interface ImportedItem {
  itemName: string;
  quantity: number;
  rate: number;
  amount: number;
  hsnCode?: string;
  gstRate?: number;
}

interface VoucherTemplate {
  name: string;
  type: string;
  description: string;
  fields: string[];
  sampleData: Record<string, string | number>[];
}

const VoucherImport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchParams = new URLSearchParams(location.search);
  const initialType = searchParams.get("type") || "payment";

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedVouchers, setImportedVouchers] = useState<ImportedVoucher[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(initialType);

  React.useEffect(() => {
    const type = new URLSearchParams(location.search).get("type");
    if (type) {
      setSelectedTemplate(type);
    }
  }, [location.search]);
  const [activeTab, setActiveTab] = useState<
    "import" | "preview" | "templates"
  >("import");
  const [ledgers, setLedgers] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchLedgers = async () => {
      const companyId = localStorage.getItem("company_id") || "";
      const ownerType = localStorage.getItem("supplier") || "";
      const ownerId = localStorage.getItem(ownerType === "employee" ? "employee_id" : "user_id") || "";
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ledger?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`);
        const data = await res.json();
        if (data.success || Array.isArray(data)) {
           setLedgers(data.data || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch ledgers", err);
      }
    };
    fetchLedgers();
  }, []);

  const voucherTemplates: VoucherTemplate[] = [

    {
      name: "Payment Voucher (No Narration)",
      type: "payment",

      description:
        "Import payment vouchers exactly like manual form (without narration)",

      fields: [
        "Date",
        "Mode",
        "Reference No",
        "Paid To",
        "Payment Mode",
        "Amount",

      ],

      sampleData: [
        {
          Date: "2024-01-15",
          Mode: "single-entry",
          "Reference No": "REF001",
          "Paid To": "Office Rent",
          "Payment Mode": "HDFC Bank",
          Amount: 25000,
        },
      ],
    }

    ,


    {
      name: "Receipt Voucher Template",
      type: "receipt",
      description: "Import receipt vouchers",
      fields: [
        "Date",
        "Mode",
        "Reference No",
        "Paid To",
        "Payment Mode",
        "Amount",

      ],
      sampleData: [
        {
          Date: "2024-01-15",
          Mode: "single-entry",
          "Reference No": "REF001",
          "Paid To": "Office Rent",
          "Payment Mode": "HDFC Bank",
          Amount: 25000,
        },
      ],
    },
    {
      name: "Credit Note Template",
      type: "credit-note",
      description: "Import credit note vouchers (Accounting Invoice mode)",
      fields: [
        "Sr No",
        "Date",
        "Ledger Name",
        "Dr/Cr",
        "Amount",
        "Narration"
      ],
      sampleData: [
        {
          "Sr No": 1,
          Date: "2026-07-14",
          "Ledger Name": "Ayush",
          "Dr/Cr": "Dr",
          Amount: 1000,
          Narration: "import"
        },
        {
          "Ledger Name": "axis bank",
          "Dr/Cr": "Cr",
          Amount: 500,
          Narration: ""
        },
        {
          "Ledger Name": "Aman",
          "Dr/Cr": "Cr",
          Amount: 500,
          Narration: ""
        }
      ],
    },
    {
      name: "Debit Note Template",
      type: "debit-note",
      description: "Import debit note vouchers (Accounting Invoice mode)",
      fields: [
        "Sr No",
        "Date",
        "Ledger Name",
        "Dr/Cr",
        "Amount",
        "Narration"
      ],
      sampleData: [
        {
          "Sr No": 1,
          Date: "2026-07-14",
          "Ledger Name": "Purchase Return",
          "Dr/Cr": "Cr",
          Amount: 1000,
          Narration: "import"
        },
        {
          "Ledger Name": "axis bank",
          "Dr/Cr": "Dr",
          Amount: 500,
          Narration: ""
        },
        {
          "Ledger Name": "Aman",
          "Dr/Cr": "Dr",
          Amount: 500,
          Narration: ""
        }
      ],
    },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(file.type)) {
      Swal.fire("Error", "Please select a valid Excel (.xlsx, .xls) or CSV file", "error");
      return;
    }

    setSelectedFile(file);
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 👇 RAW Excel JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      console.log("📌 Raw Excel Data:", jsonData);

      // 🔹 Process Data (Format Dates & Validate Ledgers)
      let lastDate = "";
      let lastSrNo = "";
      let formattedData = (jsonData as any[]).map((row) => {
        let hasError = false;
        let errorMessage = "";

        let rowDate = row["Date"];
        if (!rowDate) {
          rowDate = lastDate;
        } else {
          rowDate = formatDate(row["Date"]);
          lastDate = rowDate;
        }

        let rowSrNo = row["Sr No"] || row["Srno"] || "";
        if (!rowSrNo) {
          rowSrNo = lastSrNo;
        } else {
          lastSrNo = rowSrNo;
        }
        row["Sr No"] = rowSrNo;

        Object.keys(row).forEach(key => {
          if (key === "Debit Ledger" || key === "Credit Ledger" || key === "Paid To" || key === "Payment Mode" || key === "Party Name" || key === "Return Ledger" || key === "Ledger Name") {
            const val = row[key];
            if (val) {
              const matched = ledgers.find(l => l.name && l.name.toLowerCase().trim() === String(val).toLowerCase().trim());
              if (!matched) {
                hasError = true;
                errorMessage = `Ledger not found: ${val}`;
              }
            }
          }
        });

        return {
          ...row,
          Date: rowDate, // ✅ Fix Date Format here
          status: hasError ? "error" : "pending",
          errorMessage,
        };
      });

      // 🔹 Auto-generate Credit/Debit Note Numbers for Preview
      if ((selectedTemplate === "credit-note" || selectedTemplate === "debit-note") && formattedData.length > 0) {
        try {
          const companyId = localStorage.getItem("company_id") || "";
          const ownerType = localStorage.getItem("supplier") || "";
          const ownerId = localStorage.getItem(ownerType === "employee" ? "employee_id" : "user_id") || "";
          const sampleDate = formattedData[0]?.Date || new Date().toISOString().split("T")[0];

          const routeName = selectedTemplate === "credit-note" ? "CreditNotevoucher" : "DebitNotevoucher";
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/${routeName}/next-number?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}&date=${sampleDate}`);
          const result = await res.json();
          
          if (result.success && result.voucherNumber) {
            const parts = result.voucherNumber.split("/");
            const lastSeqStr = parts.pop();
            const lastSeq = parseInt(lastSeqStr || "0", 10);
            const prefix = parts.join("/") + "/";

            let currentSeqOffset = lastSeq;
            const groupToSeqMap: Record<string, string> = {};

            formattedData = formattedData.map((row) => {
              const srNo = row["Sr No"] || row["Srno"] || "";
              const rowDate = row.Date || "unknown";
              const groupKey = srNo || rowDate;

              if (!groupToSeqMap[groupKey]) {
                groupToSeqMap[groupKey] = prefix + String(currentSeqOffset).padStart(6, "0");
                currentSeqOffset++;
              }
              return {
                [selectedTemplate === "credit-note" ? "Credit Note No." : "Debit Note No."]: groupToSeqMap[groupKey],
                ...row,
              };
            });
          }
        } catch (error) {
          console.error(`Failed to fetch next ${selectedTemplate} number`, error);
        }
      }

      console.log("📌 Processed Excel Data:", formattedData);

      setImportedVouchers(formattedData);
      setActiveTab("preview");
    } catch (err) {
      console.error("File Read Error:", err);
      Swal.fire("Error", "Invalid Excel file!", "error");
    } finally {
      setIsProcessing(false);
    }
  };




  const formatDate = (dateValue: unknown): string => {
    if (!dateValue) return "";

    try {
      // Handle Excel date numbers
      if (typeof dateValue === "number") {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split("T")[0];
      }

      // Handle string dates
      if (typeof dateValue === "string") {
        const parts = dateValue.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }

      return new Date(dateValue as string | number | Date)
        .toISOString()
        .split("T")[0];
    } catch {
      return "";
    }
  };


  const saveImportedVouchers = async () => {
    setIsProcessing(true);

    try {
      const companyId = localStorage.getItem("company_id") || "";
      const ownerType = localStorage.getItem("supplier") || "";
      const ownerId =
        localStorage.getItem(
          ownerType === "employee" ? "employee_id" : "user_id"
        ) || "";

      const payload = {
        rows: importedVouchers,
        companyId,
        ownerType,
        ownerId,
      };

      console.log("📤 Sending Import Data:", payload);

      let endpoint = "";
      switch (selectedTemplate) {
        case "payment":
          endpoint = `${import.meta.env.VITE_API_URL}/api/payment_import`;
          break;
        case "receipt":
          endpoint = `${import.meta.env.VITE_API_URL}/api/receipt_import`;
          break;
        case "credit-note":
          endpoint = `${import.meta.env.VITE_API_URL}/api/credit_note_import`;
          break;
        case "debit-note":
          endpoint = `${import.meta.env.VITE_API_URL}/api/debit_note_import`;
          break;
        default:
          Swal.fire("Error", "Invalid template selected", "error");
          setIsProcessing(false);
          return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
      );

      const result = await res.json();

      console.log("📥 Import Result:", result);

      if (result.success) {
        setImportedVouchers(prev => prev.map(v => ({ ...v, status: "imported" })));
        Swal.fire("Success", `Imported Successfully: ${result.imported}`, "success");
      } else {
        // If there are errors, mark everything as error for now, or just leave as pending
        setImportedVouchers(prev => prev.map(v => ({ ...v, status: "error", errorMessage: "Failed to import" })));
        Swal.fire("Warning", "Some rows failed. Check console for errors.", "warning");
        console.log("Errors:", result.errors);
      }
    } catch (err) {
      console.error("Import Error:", err);
      Swal.fire("Error", "Import Failed!", "error");
    } finally {
      setIsProcessing(false);
    }
  };




  const downloadTemplate = (template: VoucherTemplate) => {
    const ws = XLSX.utils.json_to_sheet(template.sampleData);
    
    // Add styles to headers
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
    ws['!rows'] = [{ hpt: 35 }]; // Set height for first row to fit 2 lines
    ws['!cols'] = Array(range.e.c + 1).fill({ wch: 18 }); // Make columns wider

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }, // Indigo background
            alignment: { wrapText: true, horizontal: "center", vertical: "center" }
        };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${template.name.replace(" ", "_")}.xlsx`);
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportedVouchers([]);
    setActiveTab("import");
  };

  return (
    <div className="pt-[56px] px-4">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            title="Back to Vouchers"
            type="button"
            onClick={() => navigate(new URLSearchParams(window.location.search).get("returnUrl") || "/app/vouchers")}
            className="mr-4 p-2 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            Import Vouchers
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          Import vouchers from Excel or CSV files - data will auto-fill like
          Tally
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            {
              id: "import",
              label: "Import Data",
              icon: <Upload className="h-4 w-4" />,
            },
            {
              id: "preview",
              label: "Preview & Save",
              icon: <FileText className="h-4 w-4" />,
            },
            {
              id: "templates",
              label: "Download Templates",
              icon: <Download className="h-4 w-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "import" | "preview" | "templates")
              }
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Import Tab */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* Template Selection */}
          {!searchParams.get("type") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Voucher Type
              </label>
              <select
                title="Select Voucher Type"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="payment">Payment Voucher</option>
                <option value="receipt">Receipt Voucher</option>
                <option value="credit-note">Credit Note Voucher</option>
                <option value="debit-note">Debit Note Voucher</option>
              </select>
            </div>
          )}

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your Excel/CSV file here, or click to browse
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Supports .xlsx, .xls, and .csv files up to 10MB
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) =>
                e.target.files?.[0] && handleFileSelect(e.target.files[0])
              }
              className="hidden"
              title="Select file for import"
            />
          </div>

          {/* Selected File Display */}
          {selectedFile && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedFile.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-blue-700">Processing file...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Preview Imported Vouchers
              </h3>
              <p className="text-sm text-gray-600">
                Review the data before saving to your accounts
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={resetImport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={saveImportedVouchers}
                disabled={isProcessing || importedVouchers.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {isProcessing ? "Saving..." : "Save All Vouchers"}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Ready to Import
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                {(() => {
                  const filtered = importedVouchers.filter((v) => v.status === "pending");
                  const uniqueGroups = new Set();
                  filtered.forEach((v, i) => uniqueGroups.add(v["Credit Note No."] || v["Invoice number"] || v["Voucher No"] || v["Sr No"] || `row_${i}`));
                  return uniqueGroups.size;
                })()}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900">Errors</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-2">
                {(() => {
                  const filtered = importedVouchers.filter((v) => v.status === "error");
                  const uniqueGroups = new Set();
                  filtered.forEach((v, i) => uniqueGroups.add(v["Credit Note No."] || v["Invoice number"] || v["Voucher No"] || v["Sr No"] || `row_${i}`));
                  return uniqueGroups.size;
                })()}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Imported</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-2">
                {(() => {
                  const filtered = importedVouchers.filter((v) => v.status === "imported");
                  const uniqueGroups = new Set();
                  filtered.forEach((v, i) => uniqueGroups.add(v["Credit Note No."] || v["Invoice number"] || v["Voucher No"] || v["Sr No"] || `row_${i}`));
                  return uniqueGroups.size;
                })()}
              </div>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Status Column (Fixed) */}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>

                    {/* Dynamic Columns from Excel */}
                    {importedVouchers.length > 0 &&
                      Object.keys(importedVouchers[0])
                        .filter(key => key !== "status" && key !== "errorMessage")
                        .map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importedVouchers.map((row: any, rowIndex: number) => {
                    let hasError = false;
                    let hasMatch = false;

                    Object.keys(row)
                      .filter(key => key !== "status" && key !== "errorMessage")
                      .forEach(key => {
                        const val = row[key];
                        if (key === "Debit Ledger" || key === "Credit Ledger" || key === "Paid To" || key === "Payment Mode" || key === "Party Name" || key === "Return Ledger" || key === "Ledger Name") {
                          if (val) {
                            const matched = ledgers.find(l => l.name && l.name.toLowerCase().trim() === String(val).toLowerCase().trim());
                            if (matched) {
                              hasMatch = true;
                            } else {
                              hasError = true;
                            }
                          }
                        }
                      });
                      
                    let rowBgClass = "hover:bg-gray-50";
                    if (hasError) rowBgClass = "bg-red-50 hover:bg-red-100";
                    else if (hasMatch) rowBgClass = "bg-green-50 hover:bg-green-100";

                    return (
                    <tr key={rowIndex} className={rowBgClass}>
                      {/* Status Cell */}
                      <td className="px-4 py-3 text-sm">
                        {row.status === "error" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Error
                          </span>
                        ) : row.status === "imported" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Imported
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Ready
                          </span>
                        )}
                        {row.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {row.errorMessage}
                          </div>
                        )}
                      </td>

                      {/* Dynamic Data Cells */}
                      {Object.keys(row)
                        .filter(key => key !== "status" && key !== "errorMessage")
                        .map((key, colIndex) => {
                          const val = row[key];
                          let displayVal = val !== undefined && val !== null ? String(val) : "-";

                          if (key === "Debit Ledger" || key === "Credit Ledger" || key === "Paid To" || key === "Payment Mode" || key === "Party Name" || key === "Return Ledger" || key === "Ledger Name") {
                            if (val) {
                              const matched = ledgers.find(l => l.name && l.name.toLowerCase().trim() === String(val).toLowerCase().trim());
                              if (matched) {
                                displayVal = `${val} (ID: ${matched.id})`;
                              }
                            }
                          } else if (key === "Date" || key.includes("Date")) {
                            displayVal = formatDate(val);
                          }

                          // Visual Grouping: Hide repeating header info for grouped rows
                          if (rowIndex > 0 && (key === "Credit Note No." || key === "Debit Note No." || key === "Sr No" || key === "Date")) {
                            const prevRow = importedVouchers[rowIndex - 1];
                            if (prevRow && String(prevRow[key]) === String(val)) {
                              displayVal = ""; // Leave blank for cleaner grouped look
                            }
                          }

                          return (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                    </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Download Import Templates
            </h3>
            <p className="text-sm text-gray-600">
              Use these templates to format your data for import
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {voucherTemplates
              .filter(t => !searchParams.get("type") || t.type === searchParams.get("type"))
              .map((template) => (
              <div
                key={template.type}
                className="border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Excel
                  </span>
                </div>

                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Required Fields:
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {template.fields.map((field, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => downloadTemplate(template)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Template</span>
                </button>
              </div>
            ))}
          </div>

          {/* Import Guidelines */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Import Guidelines
            </h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Use the exact column headers as shown in templates</li>
              <li>• Dates should be in DD/MM/YYYY format</li>
              <li>• Amount fields should contain only numeric values</li>
              <li>
                • Party names should match existing ledger names for
                auto-mapping
              </li>
              <li>
                • Item names should match existing stock items for auto-mapping
              </li>
              <li>• GST rates should be in percentage (e.g., 18 for 18%)</li>
              <li>• Remove any extra columns not mentioned in the template</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherImport;

