import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart2, Upload } from "lucide-react";
import { getReportData, type StoredReportData } from "../../services/reportImportService";

const Gstr1VsGstr3bReport: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<StoredReportData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const data = getReportData("gstr1-vs-gstr3b");
    setReportData(data);
  }, []);

  const rows = reportData?.rows || [];

  const totalGstr1Taxable = rows.reduce(
    (acc, r) => acc + (parseFloat(r["GSTR1 Taxable Value"] || r.gstr1Taxable || 0) || 0),
    0
  );
  const totalGstr3bTaxable = rows.reduce(
    (acc, r) => acc + (parseFloat(r["GSTR3B Taxable Value"] || r.gstr3bTaxable || 0) || 0),
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
              <BarChart2 className="text-red-600 dark:text-red-400" size={28} />
              GSTR1 vs GSTR3B Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              GSTR-1 Outward Supply vs GSTR-3B Summary Comparison (50% - 50% Split Partition)
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/app/vouchers/import?type=gstr1-vs-gstr3b")}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Upload size={16} />
          Import / Update Data
        </button>
      </div>

      {/* 50% - 50% Summary Header Partition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left Partition (50%): GSTR-1 Summary */}
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
            <span className="text-xs font-semibold text-gray-500">GSTR-1 Outward</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📊 GSTR-1 Outward Sales</h3>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            ₹{totalGstr1Taxable.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Sales Taxable Value in GSTR-1 Return</p>
        </div>

        {/* Right Partition (50%): GSTR-3B Summary */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-indigo-950/40 to-gray-800 border-indigo-900/60"
              : "bg-gradient-to-r from-indigo-50 to-white border-indigo-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950">
              Right Partition (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">GSTR-3B Summary</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📑 GSTR-3B Summary Sales</h3>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            ₹{totalGstr3bTaxable.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Sales Taxable Value in GSTR-3B Summary</p>
        </div>
      </div>

      {/* Main Content Partition */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <input
            type="text"
            placeholder="Search return period, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <span className="text-xs font-semibold text-gray-500">Total Periods: {filteredRows.length}</span>
        </div>

        {/* 50% - 50% Split Content Partition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Partition Table (50%): GSTR-1 Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                📊 GSTR-1 Return Data (50% Partition)
              </span>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded">
                GSTR1 Side
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Return Period</th>
                    <th className="px-3 py-2.5 text-right">GSTR1 Taxable</th>
                    <th className="px-3 py-2.5 text-right">GSTR1 IGST</th>
                    <th className="px-3 py-2.5 text-right">GSTR1 CGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No periods found in GSTR-1 return partition.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r["Return Period"] || r.returnPeriod || "-"}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-blue-600 dark:text-blue-400">₹{(parseFloat(r["GSTR1 Taxable Value"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["GSTR1 IGST"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["GSTR1 CGST"] || 0)).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Partition Table (50%): GSTR-3B Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
              <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                📑 GSTR-3B Summary Data (50% Partition)
              </span>
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded">
                GSTR3B Side
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-right">GSTR3B Taxable</th>
                    <th className="px-3 py-2.5 text-right">GSTR3B IGST</th>
                    <th className="px-3 py-2.5 text-right">GSTR3B CGST</th>
                    <th className="px-3 py-2.5 text-center">Variance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No periods found in GSTR-3B summary partition.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => {
                      const isMatched = String(r["Variance Status"] || r.varianceStatus || "Matched").toLowerCase() === "matched";
                      return (
                        <tr key={i} className="hover:bg-indigo-50/40 dark:hover:bg-gray-750">
                          <td className="px-3 py-2.5 text-right font-medium text-indigo-600 dark:text-indigo-400">₹{(parseFloat(r["GSTR3B Taxable Value"] || 0)).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["GSTR3B IGST"] || 0)).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["GSTR3B CGST"] || 0)).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMatched
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
                              }`}
                            >
                              {r["Variance Status"] || r.varianceStatus || "Matched"}
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

export default Gstr1VsGstr3bReport;
