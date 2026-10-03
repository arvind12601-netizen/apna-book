import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PieChart, Upload } from "lucide-react";
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
      className={`pt-[56px] px-4 min-h-[calc(100vh-64px)] pb-12 ${
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
              Input Tax Credit (ITC) Statement Comparison (50% - 50% Split Partition)
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/app/vouchers/import?type=gstr2a-vs-gstr2b")}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Upload size={16} />
          Import / Update Data
        </button>
      </div>

      {/* 50% - 50% Summary Header Partition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left Partition (50%): 2A Summary */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-950/40 to-gray-800 border-blue-900/60"
              : "bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950">
              Left Partition (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">2A Total ITC</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📊 GSTR-2A Statement</h3>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            ₹{total2aTax.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Dynamic Input Tax Credit per GSTR-2A</p>
        </div>

        {/* Right Partition (50%): 2B Summary */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-green-950/40 to-gray-800 border-green-900/60"
              : "bg-gradient-to-r from-green-50 to-white border-green-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 px-2 py-0.5 rounded bg-green-100 dark:bg-green-950">
              Right Partition (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">2B Eligible ITC</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📑 GSTR-2B Statement</h3>
          <div className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-2">
            ₹{total2bTax.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Auto-drafted ITC available per GSTR-2B</p>
        </div>
      </div>

      {/* Main Content Partition */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <input
            type="text"
            placeholder="Search supplier, GSTIN, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <span className="text-xs font-semibold text-gray-500">Total Entries: {filteredRows.length}</span>
        </div>

        {/* 50% - 50% Split Content Partition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Partition Table (50%): 2A Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                📊 GSTR-2A Invoices (50% Partition)
              </span>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded">
                2A Side
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Supplier GSTIN</th>
                    <th className="px-3 py-2.5">Supplier Name</th>
                    <th className="px-3 py-2.5">Invoice No</th>
                    <th className="px-3 py-2.5 text-right">2A Taxable</th>
                    <th className="px-3 py-2.5 text-right">2A Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No entries found in GSTR-2A statement partition.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 font-mono">{r["Supplier GSTIN"] || r.supplierGstin || "-"}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r["Supplier Name"] || r.supplierName || "-"}</td>
                        <td className="px-3 py-2.5 font-medium">{r["Invoice Number"] || r.invoiceNumber || "-"}</td>
                        <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["2A Taxable Amount"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400">₹{(parseFloat(r["2A Total Tax"] || 0)).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Partition Table (50%): 2B Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-green-50 dark:bg-green-950/50 border-b border-green-200 dark:border-green-900 flex items-center justify-between">
              <span className="font-bold text-sm text-green-900 dark:text-green-200 flex items-center gap-2">
                📑 GSTR-2B Invoices (50% Partition)
              </span>
              <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/60 px-2 py-0.5 rounded">
                2B Side
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">2B Taxable</th>
                    <th className="px-3 py-2.5 text-right">2B Total Tax</th>
                    <th className="px-3 py-2.5 text-center">ITC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No entries found in GSTR-2B statement partition.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => {
                      const statusStr = String(r["ITC Status"] || r.itcStatus || "Matched").toLowerCase();
                      const isMatched = statusStr.includes("matched");
                      return (
                        <tr key={i} className="hover:bg-green-50/40 dark:hover:bg-gray-750">
                          <td className="px-3 py-2.5 text-gray-500">{r["Invoice Date"] || r.invoiceDate || "-"}</td>
                          <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["2B Taxable Amount"] || 0)).toLocaleString("en-IN")}</td>
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
                    })
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

export default Gstr2aVsGstr2bReport;
