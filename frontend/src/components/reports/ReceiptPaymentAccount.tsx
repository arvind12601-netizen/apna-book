import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, FileText, Upload, RefreshCw, Download } from "lucide-react";
import { getReportData, type StoredReportData } from "../../services/reportImportService";

const ReceiptPaymentAccount: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<StoredReportData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const data = getReportData("receipt-payment-account");
    setReportData(data);
  }, []);

  const rows = reportData?.rows || [];
  const receipts = rows.filter(
    (r) => String(r.Type || r.type || "").toLowerCase().trim() === "receipt"
  );
  const payments = rows.filter(
    (r) => String(r.Type || r.type || "").toLowerCase().trim() === "payment"
  );

  const totalReceipts = receipts.reduce(
    (acc, r) => acc + (parseFloat(r.Amount || r.amount || 0) || 0),
    0
  );
  const totalPayments = payments.reduce(
    (acc, r) => acc + (parseFloat(r.Amount || r.amount || 0) || 0),
    0
  );
  const netClosing = totalReceipts - totalPayments;

  const filteredReceipts = receipts.filter(
    (r) =>
      !searchTerm ||
      JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPayments = payments.filter(
    (r) =>
      !searchTerm ||
      JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`pt-[56px] px-4 min-h-[calc(100vh-64px)] ${
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-red-600 dark:text-red-400" size={28} />
              Receipt and Payment Account
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Accounting Reports • Generated from Import Vouchers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/app/vouchers/import?type=receipt-payment-account")}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Upload size={16} />
            {rows.length > 0 ? "Re-import / Update Data" : "Import Data in Vouchers"}
          </button>
        </div>
      </div>

      {/* When NO data has been imported yet */}
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
              Receipt and Payment Account
            </h2>
            <div className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs rounded-full uppercase tracking-wider mb-4 border border-red-200 dark:border-red-900">
              Pending Data Import
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm leading-relaxed mb-6">
              No data has been imported for Receipt and Payment Account yet. To generate this report, please navigate to <strong>Import Vouchers</strong> and import/create the required account summary data.
            </p>
            <button
              onClick={() => navigate("/app/vouchers/import?type=receipt-payment-account")}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md flex items-center gap-2"
            >
              <Upload size={18} />
              Go to Import Vouchers
            </button>
          </div>
        </div>
      ) : (
        /* Render Generated Report */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Receipts</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">₹{totalReceipts.toLocaleString("en-IN")}</div>
              <div className="text-xs text-gray-400 mt-1">{receipts.length} receipt entries</div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Payments</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">₹{totalPayments.toLocaleString("en-IN")}</div>
              <div className="text-xs text-gray-400 mt-1">{payments.length} payment entries</div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Net Balance</div>
              <div className={`text-2xl font-bold mt-1 ${netClosing >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                ₹{netClosing.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-gray-400 mt-1">Closing cash/bank liquidity</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search in receipts or payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-xs text-gray-500">Last updated: {new Date(reportData?.importedAt || "").toLocaleDateString("en-IN")}</span>
          </div>

          {/* T-Account Format Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receipts Column */}
            <div className={`border rounded-xl overflow-hidden ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="p-4 bg-green-50 dark:bg-green-950/40 border-b border-green-200 dark:border-green-900 flex justify-between items-center">
                <h3 className="font-bold text-green-700 dark:text-green-300 flex items-center gap-2">Receipts (Dr)</h3>
                <span className="text-sm font-bold text-green-700 dark:text-green-300">₹{totalReceipts.toLocaleString("en-IN")}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-b">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Particulars / Category</th>
                      <th className="px-3 py-2">Head</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredReceipts.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-2 text-gray-500">{r.Date || r.date || "-"}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{r.Category || r.category || "-"}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.Head || r.head || "-"}</td>
                        <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400">
                          ₹{(parseFloat(r.Amount || r.amount || 0) || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {filteredReceipts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-500">No receipt entries found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments Column */}
            <div className={`border rounded-xl overflow-hidden ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 flex justify-between items-center">
                <h3 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2">Payments (Cr)</h3>
                <span className="text-sm font-bold text-red-700 dark:text-red-300">₹{totalPayments.toLocaleString("en-IN")}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-b">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Particulars / Category</th>
                      <th className="px-3 py-2">Head</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPayments.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-2 text-gray-500">{r.Date || r.date || "-"}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{r.Category || r.category || "-"}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.Head || r.head || "-"}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600 dark:text-red-400">
                          ₹{(parseFloat(r.Amount || r.amount || 0) || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-500">No payment entries found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptPaymentAccount;
