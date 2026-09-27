import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Eye,
  X,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useFinancialYear } from "../../hooks/useFinancialYear";

interface VoucherEntryItem {
  id: string | number;
  ledger_id?: number | string;
  ledger_name?: string;
  amount: number;
  entry_type: "debit" | "credit";
  narration?: string;
  isParty?: boolean;
  isChild?: boolean;
}

interface RawVoucher {
  id: string;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration?: string;
  reference_no?: string;
  supplier_invoice_date?: string;
  company_id?: string | number;
  owner_type?: string;
  owner_id?: string | number;
  partyId?: string | number;
  partyName?: string;
  total?: number;
  entries: VoucherEntryItem[];
}

interface AccountSummaryRow {
  id: string;
  voucherId: string;
  date: string;
  voucherNumber: string;
  voucherType: string;
  partyName: string;
  narration: string;
  debit: number;
  credit: number;
  amount: number;
  rawVoucher: RawVoucher;
}

interface CategorySummaryRow {
  key: string;
  label: string;
  isReduction: boolean;
  rows: AccountSummaryRow[];
  totalAmount: number;
  formattedAmount: string;
}

const AccountSummary: React.FC = () => {
  const { theme, ledgers = [] } = useAppContext();
  const { selectedFinYear } = useFinancialYear();

  // Date Range (Financial Year Default)
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("all");

  // Expandable Rows State
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Data Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allRawVouchers, setAllRawVouchers] = useState<RawVoucher[]>([]);

  // Modal State for Viewing Voucher Details
  const [selectedVoucher, setSelectedVoucher] = useState<RawVoucher | null>(null);

  // Owner parameters
  const companyId = localStorage.getItem("company_id") || localStorage.getItem("active_company_id") || "";
  const rawOwnerType = localStorage.getItem("supplier") || "";
  const employeeId = localStorage.getItem("employee_id");
  const userId = localStorage.getItem("user_id") || "";

  const ownerType = (rawOwnerType === "ca" || rawOwnerType === "ca_employee" || rawOwnerType === "new_ca" || rawOwnerType === "employee" || employeeId)
    ? "employee"
    : (rawOwnerType || "employee");

  const ownerId = (rawOwnerType === "ca" || rawOwnerType === "ca_employee" || rawOwnerType === "new_ca" || rawOwnerType === "employee" || employeeId)
    ? (employeeId || userId)
    : userId;

  // Set default financial year dates
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    setFromDate(`${fyStartYear}-04-01`);
    setToDate(`${fyStartYear + 1}-03-31`);
  }, [selectedFinYear]);

  // Fetch Vouchers Data from API
  const fetchData = async () => {
    if (!companyId || !ownerType || !ownerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const vouchersRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/daybookTable2?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`
      );

      if (!vouchersRes.ok) {
        throw new Error(`Failed to fetch voucher data (${vouchersRes.status})`);
      }

      const rawVouchersData: RawVoucher[] = await vouchersRes.json();
      setAllRawVouchers(Array.isArray(rawVouchersData) ? rawVouchersData : []);

    } catch (err: any) {
      console.error("Account Summary Fetch Error:", err);
      setError(err.message || "Failed to load account summary data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, ownerType, ownerId]);

  // Always format as positive number (NO minus sign anywhere)
  const formatNumber = (val: number) => {
    if (!val || Math.abs(val) < 0.001) return "0.00";
    return Math.abs(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Process & Calculate Account Summary Data
  const {
    openingNetBalance,
    summaryCategories,
    closingNetBalance
  } = useMemo(() => {
    // 1️⃣ Master Opening Balance (Customer / Party Ledgers)
    let masterOpBal = 0;
    if (Array.isArray(ledgers) && ledgers.length > 0) {
      if (selectedPartyId !== "all") {
        const partyLedger = ledgers.find((l: any) => String(l.id) === String(selectedPartyId));
        if (partyLedger) {
          masterOpBal = Math.abs(Number(partyLedger.opening_balance || partyLedger.openingBalance || 0));
        }
      } else {
        // Filter customer / debtor ledgers for opening balance
        ledgers.forEach((l: any) => {
          const gName = String(l.group_name || l.groupName || l.group_type || l.groupType || "").toLowerCase();
          if (
            gName.includes("debtor") ||
            gName.includes("customer") ||
            gName.includes("party") ||
            l.group_id === -101 ||
            l.group_id === -102
          ) {
            masterOpBal += Math.abs(Number(l.opening_balance || l.openingBalance || 0));
          }
        });
      }
    }

    let prePeriodDebit = 0;
    let prePeriodCredit = 0;

    const salesRows: AccountSummaryRow[] = [];
    const salesReturnRows: AccountSummaryRow[] = [];
    const creditNoteRows: AccountSummaryRow[] = [];
    const paymentRows: AccountSummaryRow[] = [];
    const debitNoteRows: AccountSummaryRow[] = [];
    const othersRows: AccountSummaryRow[] = [];

    const fDate = fromDate ? new Date(fromDate) : null;
    const tDate = toDate ? new Date(toDate) : null;
    if (tDate) {
      tDate.setHours(23, 59, 59, 999);
    }

    allRawVouchers.forEach((v) => {
      const vDate = new Date(v.date);
      if (isNaN(vDate.getTime())) return;

      if (selectedPartyId !== "all") {
        const matchesParty =
          String(v.partyId) === selectedPartyId ||
          v.entries?.some((e) => String(e.ledger_id) === selectedPartyId);
        if (!matchesParty) return;
      }

      let vDebit = 0;
      let vCredit = 0;

      v.entries?.forEach((e) => {
        const amt = Number(e.amount || 0);
        if (e.entry_type === "debit") vDebit += amt;
        else if (e.entry_type === "credit") vCredit += amt;
      });

      if (vDebit === 0 && vCredit === 0 && v.total) {
        vDebit = Number(v.total);
      }

      // Pre-period accumulation for Opening Balance calculation
      if (fDate && vDate < fDate) {
        prePeriodDebit += vDebit;
        prePeriodCredit += vCredit;
        return;
      }

      if (tDate && vDate > tDate) return;

      const partyName =
        v.partyName ||
        v.entries?.find((e) => e.isParty || e.entry_type === "credit")?.ledger_name ||
        v.entries?.[0]?.ledger_name ||
        "General Account";

      const narration = v.narration || v.reference_no || "";
      const rowAmt = v.total ? Number(v.total) : Math.max(vDebit, vCredit);

      const row: AccountSummaryRow = {
        id: v.id || `v-${Math.random()}`,
        voucherId: v.id,
        date: v.date,
        voucherNumber: v.voucher_number || "-",
        voucherType: v.voucher_type || "Voucher",
        partyName,
        narration,
        debit: vDebit,
        credit: vCredit,
        amount: rowAmt,
        rawVoucher: v
      };

      const vTypeLower = String(v.voucher_type || "").toLowerCase().trim();

      if (vTypeLower === "sales_return" || vTypeLower === "sales return" || vTypeLower === "sales-return" || vTypeLower === "sale_return") {
        salesReturnRows.push(row);
      } else if (vTypeLower === "sales" || vTypeLower === "sale" || vTypeLower === "sales_voucher") {
        salesRows.push(row);
      } else if (vTypeLower === "credit_note" || vTypeLower === "credit note" || vTypeLower === "credit-note") {
        creditNoteRows.push(row);
      } else if (
        vTypeLower === "receipt" ||
        vTypeLower === "payment" ||
        vTypeLower === "receipt_voucher" ||
        vTypeLower === "payment_voucher" ||
        vTypeLower === "bank"
      ) {
        paymentRows.push(row);
      } else if (vTypeLower === "debit_note" || vTypeLower === "debit note" || vTypeLower === "debit-note") {
        debitNoteRows.push(row);
      } else {
        othersRows.push(row);
      }
    });

    const sortRows = (rows: AccountSummaryRow[]) => {
      return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    sortRows(salesRows);
    sortRows(salesReturnRows);
    sortRows(creditNoteRows);
    sortRows(paymentRows);
    sortRows(debitNoteRows);
    sortRows(othersRows);

    const calcTotal = (rows: AccountSummaryRow[]) => {
      return rows.reduce((sum, r) => sum + r.amount, 0);
    };

    const salesTotal = calcTotal(salesRows);
    const salesReturnTotal = calcTotal(salesReturnRows);
    const creditNoteTotal = calcTotal(creditNoteRows);
    const paymentTotal = calcTotal(paymentRows);
    const debitNoteTotal = calcTotal(debitNoteRows);
    const othersTotal = calcTotal(othersRows);

    // Format all row amounts cleanly WITHOUT any minus sign
    const categories: CategorySummaryRow[] = [
      {
        key: "sales",
        label: "Sales to customer",
        isReduction: false,
        rows: salesRows,
        totalAmount: salesTotal,
        formattedAmount: formatNumber(salesTotal)
      },
      {
        key: "sales_return",
        label: "Sales return from customer",
        isReduction: true,
        rows: salesReturnRows,
        totalAmount: salesReturnTotal,
        formattedAmount: formatNumber(salesReturnTotal)
      },
      {
        key: "credit_note",
        label: "Credit note issued to customer",
        isReduction: true,
        rows: creditNoteRows,
        totalAmount: creditNoteTotal,
        formattedAmount: formatNumber(creditNoteTotal)
      },
      {
        key: "payment_received",
        label: "Payment received from customer",
        isReduction: true,
        rows: paymentRows,
        totalAmount: paymentTotal,
        formattedAmount: formatNumber(paymentTotal)
      },
      {
        key: "debit_note",
        label: "Debit note charged to customer",
        isReduction: false,
        rows: debitNoteRows,
        totalAmount: debitNoteTotal,
        formattedAmount: formatNumber(debitNoteTotal)
      },
      {
        key: "others_bal",
        label: "Others Bal",
        isReduction: false,
        rows: othersRows,
        totalAmount: othersTotal,
        formattedAmount: formatNumber(othersTotal)
      }
    ];

    // Calculate Opening Net Balance (always positive formatted)
    const opBal = masterOpBal + Math.abs(prePeriodDebit - prePeriodCredit);

    // Closing Net Balance formula
    const closBal = Math.max(
      0,
      opBal + salesTotal - salesReturnTotal - creditNoteTotal - paymentTotal + debitNoteTotal + othersTotal
    );

    return {
      openingNetBalance: opBal,
      summaryCategories: categories,
      closingNetBalance: closBal
    };
  }, [allRawVouchers, ledgers, selectedPartyId, fromDate, toDate]);

  // Format Date to DD.MM.YYYY
  const formatDateDot = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const toggleRowExpand = (key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="pt-[56px] px-4 min-h-screen pb-12 print:pt-0 print:px-0">
      {/* Loading State */}
      {loading ? (
        <div
          className={`max-w-4xl mx-auto p-12 rounded-2xl text-center border mt-8 shadow-sm ${
            theme === "dark" ? "bg-gray-800/80 border-gray-700/60" : "bg-white border-gray-200"
          }`}
        >
          <RefreshCw className="animate-spin text-blue-500 mx-auto mb-3" size={32} />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Calculating Account Summary...
          </p>
        </div>
      ) : error ? (
        <div className="max-w-4xl mx-auto mt-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between shadow-sm">
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        /* PURE STATEMENT CARD (NO MINUS SIGN ANYWHERE) */
        <div
          className={`max-w-4xl mx-auto rounded-2xl border shadow-xl overflow-hidden my-6 transition-all ${
            theme === "dark"
              ? "bg-gray-900 border-gray-800 text-gray-100 shadow-gray-950/50"
              : "bg-white border-gray-200 text-gray-900 shadow-gray-200/80"
          }`}
        >
          {/* Header Banner */}
          <div
            className={`p-6 sm:p-8 border-b ${
              theme === "dark"
                ? "bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border-gray-800"
                : "bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30 border-gray-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-2.5 py-1 rounded-full inline-block mb-2">
                  Financial Statement
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                  Account Summary
                </h1>
              </div>

              {/* Statement Period Badge */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  theme === "dark"
                    ? "bg-gray-800/80 border-gray-700/80 text-gray-200"
                    : "bg-white/90 border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                    Statement Period
                  </span>
                  <span className="font-mono font-bold text-sm tracking-tight">
                    {formatDateDot(fromDate)} <span className="text-gray-400 text-xs font-normal px-1">TO</span> {formatDateDot(toDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement Rows Body */}
          <div className="p-4 sm:p-8">
            <div className="space-y-1">
              {/* Row 1: Opening Net Balance */}
              <div
                className={`py-4 px-4 sm:px-6 rounded-xl flex justify-between items-center transition-all ${
                  theme === "dark"
                    ? "bg-gray-800/60 hover:bg-gray-800 border border-gray-750"
                    : "bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    <TrendingUp size={16} />
                  </div>
                  <span className="font-serif font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                    Opening Net Balance
                  </span>
                </div>
                <span className="font-mono font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100">
                  {formatNumber(openingNetBalance)}
                </span>
              </div>

              {/* Rows 2 to 7: The Categories */}
              {summaryCategories.map((cat) => {
                const isExpanded = expandedRows[cat.key];

                return (
                  <div key={cat.key} className="group">
                    {/* Category Summary Row */}
                    <div
                      onClick={() => toggleRowExpand(cat.key)}
                      className={`py-3.5 px-4 sm:px-6 rounded-xl flex justify-between items-center transition-all cursor-pointer select-none border border-transparent ${
                        theme === "dark"
                          ? "hover:bg-gray-800/70 hover:border-gray-700/60"
                          : "hover:bg-blue-50/40 hover:border-blue-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={`p-1 rounded-md transition-colors ${
                            theme === "dark"
                              ? "text-gray-400 group-hover:text-blue-400 group-hover:bg-gray-800"
                              : "text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-100/60"
                          }`}
                          title="Click to toggle voucher entries"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <span className="font-serif font-medium text-base sm:text-lg text-gray-800 dark:text-gray-200">
                          {cat.label}
                        </span>

                        {cat.rows.length > 0 && (
                          <span className="text-[11px] font-sans px-2 py-0.5 font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {cat.rows.length} {cat.rows.length === 1 ? "entry" : "entries"}
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-semibold text-base sm:text-lg tracking-tight text-gray-900 dark:text-gray-100">
                        {cat.formattedAmount}
                      </span>
                    </div>

                    {/* Expandable Voucher Breakdown Table */}
                    {isExpanded && (
                      <div
                        className={`my-3 ml-4 sm:ml-10 mr-2 p-4 rounded-xl border transition-all ${
                          theme === "dark"
                            ? "bg-gray-850 border-gray-750"
                            : "bg-slate-50/80 border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-xs">
                          <span className="font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <FileText size={14} />
                            {cat.label} — Vouchers ({cat.rows.length})
                          </span>
                          <span className="font-mono text-gray-500">
                            Subtotal: {cat.formattedAmount}
                          </span>
                        </div>

                        {cat.rows.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-3 text-center">
                            No vouchers recorded in this category during period.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr
                                  className={`border-b text-gray-500 dark:text-gray-400 font-semibold ${
                                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                                  }`}
                                >
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3">Voucher No</th>
                                  <th className="py-2 px-3">Party Name</th>
                                  <th className="py-2 px-3">Narration</th>
                                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                                  <th className="py-2 px-3 text-center print:hidden">View</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
                                {cat.rows.map((r) => (
                                  <tr
                                    key={r.id}
                                    className={`transition-colors ${
                                      theme === "dark"
                                        ? "hover:bg-gray-800/80"
                                        : "hover:bg-white"
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-mono whitespace-nowrap">{r.date}</td>
                                    <td className="py-2 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                      {r.voucherNumber}
                                    </td>
                                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                                      {r.partyName}
                                    </td>
                                    <td className="py-2 px-3 text-gray-500 max-w-xs truncate" title={r.narration}>
                                      {r.narration || "-"}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-medium">
                                      {formatNumber(r.amount)}
                                    </td>
                                    <td className="py-2 px-3 text-center print:hidden">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedVoucher(r.rawVoucher);
                                        }}
                                        className="p-1 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        title="View Voucher"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Row 8: Closing Net Balance */}
              <div
                className={`py-4 px-4 sm:px-6 rounded-xl flex justify-between items-center transition-all mt-4 border-t-2 ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-gray-850 via-gray-800 to-gray-850 border-emerald-500/50 shadow-inner"
                    : "bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-emerald-50/60 border-emerald-500/60 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <TrendingDown size={16} />
                  </div>
                  <span className="font-serif font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100">
                    Closing Net Balance
                  </span>
                </div>

                <span className="font-mono font-bold text-xl sm:text-2xl text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {formatNumber(closingNetBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Details Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-fade-in">
          <div
            className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${
              theme === "dark" ? "bg-gray-850 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"
            }`}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="text-blue-500" size={18} />
                Voucher Details: {selectedVoucher.voucher_number || selectedVoucher.id}
              </h3>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-750">
                  <span className="text-gray-400 block mb-0.5">Voucher Type</span>
                  <span className="font-semibold text-sm">{selectedVoucher.voucher_type || "N/A"}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-750">
                  <span className="text-gray-400 block mb-0.5">Date</span>
                  <span className="font-semibold font-mono text-sm">{selectedVoucher.date}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-750">
                  <span className="text-gray-400 block mb-0.5">Voucher Number</span>
                  <span className="font-semibold font-mono text-sm">{selectedVoucher.voucher_number || "-"}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-750">
                  <span className="text-gray-400 block mb-0.5">Party Name</span>
                  <span className="font-semibold text-sm">{selectedVoucher.partyName || "N/A"}</span>
                </div>
              </div>

              {selectedVoucher.narration && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-xs border border-gray-150 dark:border-gray-750">
                  <span className="font-semibold text-gray-400 block mb-1 uppercase text-[10px] tracking-wider">
                    Narration
                  </span>
                  <p className="text-gray-700 dark:text-gray-200">{selectedVoucher.narration}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-xs mb-2 uppercase tracking-wider text-gray-500">
                  Accounting Entries
                </h4>
                <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-300">
                        <th className="p-2.5">Ledger</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedVoucher.entries && selectedVoucher.entries.length > 0 ? (
                        selectedVoucher.entries.map((e, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-medium">{e.ledger_name || `Ledger #${e.ledger_id}`}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  e.entry_type === "debit"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                    : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                }`}
                              >
                                {e.entry_type}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">
                              {Number(e.amount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-400">
                            Total Amount: ₹
                            {Number(selectedVoucher.total || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSummary;
