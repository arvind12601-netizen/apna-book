import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Upload } from "lucide-react";
import { getReportData, type StoredReportData } from "../../services/reportImportService";

const BooksVs2aReport: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<StoredReportData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const data = getReportData("books-vs-2a");
    setReportData(data);
  }, []);

  const rows = reportData?.rows || [];

  const totalBookTax = rows.reduce(
    (acc, r) => acc + (parseFloat(r["Book Tax Amount"] || r.bookTax || 0) || 0),
    0
  );
  const total2aTax = rows.reduce(
    (acc, r) => acc + (parseFloat(r["2A Tax Amount"] || r.twoATax || 0) || 0),
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
              <BookOpen className="text-red-600 dark:text-red-400" size={28} />
              Books vs GSTR2A Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Purchase Register vs GSTR-2A Matching (50% - 50% Split Partition)
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/app/vouchers/import?type=books-vs-2a")}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Upload size={16} />
          Import / Update Data
        </button>
      </div>

      {/* 50% - 50% Summary Header Partition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left Partition (50%): Books Summary */}
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
            <span className="text-xs font-semibold text-gray-500">Books Tax</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📘 Books Purchase Register</h3>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            ₹{totalBookTax.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Purchase ITC recorded in Accounting Books</p>
        </div>

        {/* Right Partition (50%): GSTR2A Summary */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-teal-950/40 to-gray-800 border-teal-900/60"
              : "bg-gradient-to-r from-teal-50 to-white border-teal-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950">
              Right Partition (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">GSTR-2A Tax</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📊 GSTR-2A Statement</h3>
          <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 mt-2">
            ₹{total2aTax.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total ITC reported by Suppliers in GSTR-2A</p>
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
          {/* Left Partition Table (50%): Books Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                📘 Books Purchase Entries (50% Partition)
              </span>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded">
                Books Side
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Supplier GSTIN</th>
                    <th className="px-3 py-2.5">Supplier Name</th>
                    <th className="px-3 py-2.5">Book Inv No</th>
                    <th className="px-3 py-2.5 text-right">Book Taxable</th>
                    <th className="px-3 py-2.5 text-right">Book Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No entries found in Books Purchase partition.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 font-mono">{r["Supplier GSTIN"] || r.supplierGstin || "-"}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r["Supplier Name"] || r.supplierName || "-"}</td>
                        <td className="px-3 py-2.5 font-medium">{r["Book Invoice No"] || r.bookInvoiceNo || "-"}</td>
                        <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["Book Taxable Value"] || 0)).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400">₹{(parseFloat(r["Book Tax Amount"] || 0)).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Partition Table (50%): GSTR2A Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-teal-50 dark:bg-teal-950/50 border-b border-teal-200 dark:border-teal-900 flex items-center justify-between">
              <span className="font-bold text-sm text-teal-900 dark:text-teal-200 flex items-center gap-2">
                📊 GSTR-2A Statement (50% Partition)
              </span>
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded">
                GSTR2A Side
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">2A Inv No</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">2A Taxable</th>
                    <th className="px-3 py-2.5 text-right">2A Tax</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
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
                    filteredRows.map((r, i) => {
                      const statusStr = String(r["Match Status"] || r.matchStatus || "Matched").toLowerCase();
                      const isMatched = statusStr.includes("matched") && !statusStr.includes("mis");
                      return (
                        <tr key={i} className="hover:bg-teal-50/40 dark:hover:bg-gray-750">
                          <td className="px-3 py-2.5 font-medium">{r["2A Invoice No"] || r.twoAInvoiceNo || "-"}</td>
                          <td className="px-3 py-2.5 text-gray-500">{r["Invoice Date"] || r.invoiceDate || "-"}</td>
                          <td className="px-3 py-2.5 text-right">₹{(parseFloat(r["2A Taxable Value"] || 0)).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-teal-600 dark:text-teal-400">₹{(parseFloat(r["2A Tax Amount"] || 0)).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMatched
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                              }`}
                            >
                              {r["Match Status"] || r.matchStatus || "Matched"}
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

export default BooksVs2aReport;
