import React, { useState, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Printer, Download, Search, CheckCircle, AlertCircle } from "lucide-react";
import { getReportData } from "../../services/reportImportService";

interface TaxStatusEntry {
  id: string;
  taxHead: string;
  category: "Output" | "Input";
  grossAmount: number;
  taxAmount: number;
  status: "Paid" | "Adjusted" | "Pending" | "Claimed";
}

const TaxStatusReport: React.FC = () => {
  const { theme, vouchers = [] } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const importedData = getReportData("tax-status");

  const { outputTax, inputTax, totalOutputTax, totalInputTax } = useMemo(() => {
    const outList: TaxStatusEntry[] = [];
    const inList: TaxStatusEntry[] = [];

    if (importedData && importedData.rows) {
      importedData.rows.forEach((r: any, idx: number) => {
        const cat = String(r.Category || r.category || "Output").toLowerCase().includes("in") ? "Input" : "Output";
        const item: TaxStatusEntry = {
          id: `imp-tax-${idx}`,
          taxHead: r.TaxHead || r.head || r.particulars || `Tax Entry ${idx + 1}`,
          category: cat,
          grossAmount: parseFloat(r.GrossAmount || r.gross || 0) || 0,
          taxAmount: parseFloat(r.TaxAmount || r.tax || 0) || 0,
          status: r.Status || r.status || "Paid",
        };
        if (cat === "Output") outList.push(item);
        else inList.push(item);
      });
    }

    // Generate from vouchers if any GST/TDS exists
    vouchers.forEach((v: any) => {
      const isSales = v.voucherType === "sales";
      const isPurchase = v.voucherType === "purchase";
      if (!isSales && !isPurchase) return;

      const taxAmt = parseFloat(v.gstAmount || v.taxAmount || 0);
      if (taxAmt > 0 || v.totalAmount) {
        const gross = parseFloat(v.totalAmount || v.amount || 0);
        const calcTax = taxAmt || gross * 0.18;
        const item: TaxStatusEntry = {
          id: v.id || Math.random().toString(),
          taxHead: isSales ? "Output CGST/SGST/IGST" : "Input Tax Credit (ITC)",
          category: isSales ? "Output" : "Input",
          grossAmount: gross,
          taxAmount: calcTax,
          status: isSales ? "Paid" : "Claimed",
        };
        if (isSales) outList.push(item);
        else inList.push(item);
      }
    });

    // Default fallback rows if empty
    if (outList.length === 0 && inList.length === 0) {
      outList.push(
        { id: "def-out-1", taxHead: "Output CGST @ 9%", category: "Output", grossAmount: 150000, taxAmount: 13500, status: "Paid" },
        { id: "def-out-2", taxHead: "Output SGST @ 9%", category: "Output", grossAmount: 150000, taxAmount: 13500, status: "Paid" },
        { id: "def-out-3", taxHead: "Output IGST @ 18%", category: "Output", grossAmount: 80000, taxAmount: 14400, status: "Adjusted" }
      );
      inList.push(
        { id: "def-in-1", taxHead: "Input CGST (ITC) @ 9%", category: "Input", grossAmount: 120000, taxAmount: 10800, status: "Claimed" },
        { id: "def-in-2", taxHead: "Input SGST (ITC) @ 9%", category: "Input", grossAmount: 120000, taxAmount: 10800, status: "Claimed" },
        { id: "def-in-3", taxHead: "TDS Credit Sec 194C", category: "Input", grossAmount: 50000, taxAmount: 5000, status: "Claimed" }
      );
    }

    const tOut = outList.reduce((acc, i) => acc + i.taxAmount, 0);
    const tIn = inList.reduce((acc, i) => acc + i.taxAmount, 0);

    return { outputTax: outList, inputTax: inList, totalOutputTax: tOut, totalInputTax: tIn };
  }, [importedData, vouchers]);

  const filterList = (list: TaxStatusEntry[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((i) => i.taxHead.toLowerCase().includes(term) || i.status.toLowerCase().includes(term));
  };

  const filteredOutput = filterList(outputTax);
  const filteredInput = filterList(inputTax);

  const netTaxLiability = totalOutputTax - totalInputTax;

  return (
    <div
      className={`pt-[56px] px-4 min-h-[calc(100vh-64px)] pb-12 ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/app/reports")}
            title="Back to Reports"
            className={`p-2 rounded-lg mr-3 transition-colors ${
              theme === "dark"
                ? "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                : "bg-white hover:bg-gray-100 text-gray-700 border shadow-sm"
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={28} />
              Tax Status Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              GST & Tax Liability vs Input Tax Credit Overview (50% - 50% Split Partition)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={() => alert("Exporting Tax Status Report...")}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      {/* 50% - 50% Summary Header Partition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left Partition (50%): Output Tax Liability */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-amber-950/40 to-gray-800 border-amber-900/60"
              : "bg-gradient-to-r from-amber-50 to-white border-amber-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950">
              Output Side (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">Tax Payable</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">⚖️ Total Output Tax</h3>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            ₹{totalOutputTax.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total output GST collected on sales</p>
        </div>

        {/* Right Partition (50%): Input Tax / Credit */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-950/40 to-gray-800 border-blue-900/60"
              : "bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950">
              Input Credit Side (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">ITC & TDS</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">🛡️ Total Input Credit (ITC)</h3>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            ₹{totalInputTax.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total input GST & TDS tax credit available</p>
        </div>
      </div>

      {/* Net Liability Summary Bar */}
      <div className={`p-4 rounded-xl mb-6 border flex flex-col sm:flex-row justify-between items-center ${
        netTaxLiability > 0 
          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
          : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-900 dark:text-green-200"
      }`}>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          {netTaxLiability > 0 ? <AlertCircle size={20} className="text-red-600" /> : <CheckCircle size={20} className="text-green-600" />}
          <div>
            <span className="font-bold text-sm">
              {netTaxLiability > 0 ? "Net Payable Cash Liability:" : "Net Credit Balance Available:"}
            </span>
            <span className="text-xs ml-2 opacity-80">(Output Tax Liability minus Input Credit)</span>
          </div>
        </div>
        <div className="text-xl font-black">
          ₹{Math.abs(netTaxLiability).toLocaleString("en-IN")}
        </div>
      </div>

      {/* Main Content Partition */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tax head or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3.5 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Output Heads: {filteredOutput.length} | Input Heads: {filteredInput.length}
          </span>
        </div>

        {/* 50% - 50% Split Content Partition Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Partition Table (50%): Output Tax */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900 flex items-center justify-between">
              <span className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
                📤 Output Tax (Sales Liability)
              </span>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                Left 50%
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Tax Head</th>
                    <th className="px-3 py-2.5 text-right">Taxable Gross (₹)</th>
                    <th className="px-3 py-2.5 text-right font-bold">Tax Amount (₹)</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOutput.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No output tax records found.
                      </td>
                    </tr>
                  ) : (
                    filteredOutput.map((r) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r.taxHead}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">₹{r.grossAmount.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                          ₹{r.taxAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Partition Table (50%): Input Credit */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                📥 Input Credit (ITC & TDS Claims)
              </span>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded">
                Right 50%
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Tax Head</th>
                    <th className="px-3 py-2.5 text-right">Taxable Gross (₹)</th>
                    <th className="px-3 py-2.5 text-right font-bold">Credit Amount (₹)</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInput.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No input credit records found.
                      </td>
                    </tr>
                  ) : (
                    filteredInput.map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r.taxHead}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">₹{r.grossAmount.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400">
                          ₹{r.taxAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxStatusReport;
