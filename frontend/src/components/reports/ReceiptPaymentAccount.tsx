import React, { useState, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Printer, Download, Search } from "lucide-react";
import { getReportData } from "../../services/reportImportService";

interface ReceiptPaymentEntry {
  id: string;
  date: string;
  voucherNo: string;
  particulars: string;
  type: "Receipt" | "Payment";
  head: string;
  amount: number;
}

const ReceiptPaymentAccount: React.FC = () => {
  const { theme, vouchers = [], ledgers = [] } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const importedData = getReportData("receipt-payment-account");

  const { receipts, payments, totalReceipts, totalPayments } = useMemo(() => {
    const rList: ReceiptPaymentEntry[] = [];
    const pList: ReceiptPaymentEntry[] = [];

    // Combine imported rows and system vouchers
    if (importedData && importedData.rows) {
      importedData.rows.forEach((r: any, idx: number) => {
        const type = String(r.Type || r.type || "Receipt").toLowerCase().includes("pay") ? "Payment" : "Receipt";
        const item: ReceiptPaymentEntry = {
          id: `imp-${idx}`,
          date: r.Date || r.date || "-",
          voucherNo: r.VoucherNo || r.voucherNo || `IMP-${idx + 1}`,
          particulars: r.Head || r.Category || r.particulars || "General Entry",
          type,
          head: r.Head || "Cash/Bank",
          amount: parseFloat(r.Amount || r.amount || 0) || 0,
        };
        if (type === "Receipt") rList.push(item);
        else pList.push(item);
      });
    }

    vouchers.forEach((v: any) => {
      const type = v.voucherType === "payment" ? "Payment" : v.voucherType === "receipt" ? "Receipt" : null;
      if (!type) return;
      const party = ledgers.find((l: any) => l.id === v.partyLedgerId);
      const item: ReceiptPaymentEntry = {
        id: v.id || Math.random().toString(),
        date: v.date || "-",
        voucherNo: v.voucherNumber || v.voucherNo || "VOUCH-001",
        particulars: party?.name || v.particulars || `${type} Voucher`,
        type,
        head: v.accountHead || "Cash / Bank",
        amount: parseFloat(v.amount || v.totalAmount || 0) || 0,
      };
      if (type === "Receipt") rList.push(item);
      else pList.push(item);
    });

    const tR = rList.reduce((acc, i) => acc + i.amount, 0);
    const tP = pList.reduce((acc, i) => acc + i.amount, 0);

    return { receipts: rList, payments: pList, totalReceipts: tR, totalPayments: tP };
  }, [importedData, vouchers, ledgers]);

  const filterList = (list: ReceiptPaymentEntry[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (i) =>
        i.particulars.toLowerCase().includes(term) ||
        i.voucherNo.toLowerCase().includes(term) ||
        i.head.toLowerCase().includes(term)
    );
  };

  const filteredReceipts = filterList(receipts);
  const filteredPayments = filterList(payments);

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
              <FileText className="text-blue-600 dark:text-blue-400" size={28} />
              Receipt and Payment Account
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Summary of Cash & Bank Receipts vs Payments (50% - 50% Split Partition)
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
            onClick={() => alert("Exporting Receipt & Payment Statement...")}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Download size={15} /> Export Statement
          </button>
        </div>
      </div>

      {/* 50% - 50% Summary Header Partition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left Partition (50%): Receipts Summary */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-green-950/40 to-gray-800 border-green-900/60"
              : "bg-gradient-to-r from-green-50 to-white border-green-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 px-2 py-0.5 rounded bg-green-100 dark:bg-green-950">
              Receipts Side (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">Total Inflow</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">💰 Total Receipts</h3>
          <div className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-2">
            ₹{totalReceipts.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total cash & bank collections</p>
        </div>

        {/* Right Partition (50%): Payments Summary */}
        <div
          className={`p-5 rounded-xl border relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-r from-red-950/40 to-gray-800 border-red-900/60"
              : "bg-gradient-to-r from-red-50 to-white border-red-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 px-2 py-0.5 rounded bg-red-100 dark:bg-red-950">
              Payments Side (50%)
            </span>
            <span className="text-xs font-semibold text-gray-500">Total Outflow</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">💸 Total Payments</h3>
          <div className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2">
            ₹{totalPayments.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Total cash & bank disbursements</p>
        </div>
      </div>

      {/* Main Content Partition */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search particulars, voucher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3.5 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Receipts: {filteredReceipts.length} | Payments: {filteredPayments.length}
          </span>
        </div>

        {/* 50% - 50% Split Content Partition Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Partition Table (50%): Receipts Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-green-50 dark:bg-green-950/50 border-b border-green-200 dark:border-green-900 flex items-center justify-between">
              <span className="font-bold text-sm text-green-900 dark:text-green-200 flex items-center gap-2">
                📥 Receipts (Inward Cash/Bank)
              </span>
              <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/60 px-2 py-0.5 rounded">
                Left 50%
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Voucher No</th>
                    <th className="px-3 py-2.5">Particulars / Head</th>
                    <th className="px-3 py-2.5 text-right font-bold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No receipt entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-green-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 text-gray-500">{r.date}</td>
                        <td className="px-3 py-2.5 font-mono font-medium">{r.voucherNo}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r.particulars}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-green-600 dark:text-green-400">
                          ₹{r.amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Partition Table (50%): Payments Side */}
          <div
            className={`border rounded-xl overflow-hidden flex flex-col ${
              theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 flex items-center justify-between">
              <span className="font-bold text-sm text-red-900 dark:text-red-200 flex items-center gap-2">
                📤 Payments (Outward Cash/Bank)
              </span>
              <span className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-2 py-0.5 rounded">
                Right 50%
              </span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Voucher No</th>
                    <th className="px-3 py-2.5">Particulars / Head</th>
                    <th className="px-3 py-2.5 text-right font-bold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No payment entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((r) => (
                      <tr key={r.id} className="hover:bg-red-50/40 dark:hover:bg-gray-750">
                        <td className="px-3 py-2.5 text-gray-500">{r.date}</td>
                        <td className="px-3 py-2.5 font-mono font-medium">{r.voucherNo}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">{r.particulars}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-red-600 dark:text-red-400">
                          ₹{r.amount.toLocaleString("en-IN")}
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

export default ReceiptPaymentAccount;
