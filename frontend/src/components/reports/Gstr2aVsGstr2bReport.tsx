import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, PieChart, Upload } from "lucide-react";
import { getReportData, type StoredReportData } from "../../services/reportImportService";

const Gstr2aVsGstr2bReport: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<StoredReportData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const data = getReportData("gstr2a-vs-gstr2b");
    setReportData(data);
  }, []);

  const rows = reportData?.rows || [];

  const total2aTax = rows.reduce(
    (acc, r) => acc + (parseFloat(r["2A Total Tax"] || r.twoATax || 0) || 0),
    0
  );
  const total2bTax = rows.reduce(
    (acc, r) => acc + (parseFloat(r["2B Total Tax"] || r.twoBTax || 0) || 0),
    0
  );

  const filteredRows = rows.filter((r) =>
    !searchTerm || JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`pt-[56px] px-4 min-h-[calc(100vh-64px)] ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"
      }`}
    >
      {/* Header */}
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PieChart className="text-red-600 dark:text-red-400" size={28} />
              GSTR2A vs GSTR2B Matching Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Input Tax Credit (ITC) Reconciliation • Generated from Import Vouchers
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/app/vouchers/import?type=gstr2a-vs-gstr2b")}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Upload size={16} />
          {rows.length > 0 ? "Re-import / Update Data" : "Import Data in Vouchers"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-8 pb-16">
          <div
            className={`p-8 sm:p-12 rounded-2xl flex flex-col items-center max-w-lg w-full shadow-lg border transition-all ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-950/40 mb-6 border border-red-200 dark:border-red-900/60">
              <Clock size={48} className="text-red-600 dark:text-red-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">
              GSTR2A vs GSTR2B Matching
            </h2>
            <div className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs rounded-full uppercase tracking-wider mb-4 border border-red-200 dark:border-red-900">
              Pending Data Import
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm leading-relaxed mb-6">
              No GSTR-2A vs GSTR-2B matching data has been imported yet. Please navigate to <strong>Import Vouchers</strong> to import your GSTR-2A and 2B ITC statement data.
            </p>
            <button
              onClick={() => navigate("/app/vouchers/import?type=gstr2a-vs-gstr2b")}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md flex items-center gap-2"
            >
              <Upload size={18} />
              Go to Import Vouchers
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="text-xs font-semibold text-gray-500 uppercase">Total ITC in 2A</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">₹{total2aTax.toLocaleString("en-IN")}</div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="text-xs font-semibold text-gray-500 uppercase">Eligible ITC in 2B</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">₹{total2bTax.toLocaleString("en-IN")}</div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="text-xs font-semibold text-gray-500 uppercase">Matched Invoices</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{rows.length}</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search supplier, GSTIN, invoice no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-xs text-gray-500">Total Invoices: {filteredRows.length}</span>
          </div>

          {/* Table */}
          <div className={`border rounded-xl overflow-hidden ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Supplier GSTIN</th>
                    <th className="px-3 py-2.5">Supplier Name</th>
                    <th className="px-3 py-2.5">Invoice No</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">2A Taxable</th>
                    <th className="px-3 py-2.5 text-right">2B Taxable</th>
                    <th className="px-3 py-2.5 text-right">2A Tax</th>
                    <th className="px-3 py-2.5 text-right">2B Tax</th>
                    <th className="px-3 py-2.5 text-center">ITC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.map((r, i) => {
                    const statusStr = String(r["ITC Status"] || r.itcStatus || "Matched").toLowerCase();
                    const isMatched = statusStr.includes("matched");
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 font-mono">{r["Supplier GSTIN"] || r.supplierGstin || "-"}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r["Supplier Name"] || r.supplierName || "-"}</td>
                        <td className="px-3 py-2.5 font-medium">{r["Invoice Number"] || r.invoiceNumber || "-"}</td>
                        <td className="px-3 py-2.5 text-gray-500">{r["Invoice Date"] || r.invoiceDate || "-"}</td>
                        <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["2A Taxable Amount"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["2B Taxable Amount"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400">₹{(parseFloat(r["2A Total Tax"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-green-600 dark:text-green-400">₹{(parseFloat(r["2B Total Tax"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isMatched
                                ? "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                            }`}
                          >
                            {r["ITC Status"] || r.itcStatus || "Matched"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gstr2aVsGstr2bReport;
