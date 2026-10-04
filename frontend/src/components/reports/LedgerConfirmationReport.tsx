import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { useCompany } from "../../context/CompanyContext";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Download,
  Calendar,
  ChevronDown,
  Filter,
  FileText,
  Building,
  UserCheck
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Ledger } from "../../types";

interface LedgerTransaction {
  id: string;
  date: string;
  particulars: string;
  voucherType: string;
  voucherNo: string;
  debit: number;
  credit: number;
  balance?: number;
  runningBalance?: number;
  narration?: string;
  reference?: string;
  isOpening?: boolean;
  isClosing?: boolean;
}

interface LedgerApiResponse {
  success: boolean;
  ledger: Ledger;
  message?: string;
  transactions: LedgerTransaction[];
  transactionCount: number;
  summary: {
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    transactionCount: number;
  };
}

const LedgerConfirmationReport: React.FC = () => {
  const { theme } = useAppContext();
  const { companyInfo } = useCompany();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // Selected Ledger ID
  const urlLedgerId = id || searchParams.get("ledgerId") || "";
  const [ledgerId, setLedgerId] = useState<string>(urlLedgerId);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);

  // Ledger Dropdown & Search state
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState<string>("");
  const [isLedgerDropdownOpen, setIsLedgerDropdownOpen] = useState<boolean>(false);
  const [ledgerHighlightedIndex, setLedgerHighlightedIndex] = useState<number>(0);
  const ledgerComboboxRef = useRef<HTMLDivElement>(null);

  // Financial Year & Date Range state
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed, 3 = April
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  const defaultFromDate = searchParams.get("fromDate") || `${fyStartYear}-04-01`;
  const defaultToDate = searchParams.get("toDate") || `${fyStartYear + 1}-03-31`;

  const [selectedDateRange, setSelectedDateRange] = useState<string>(
    searchParams.get("fromDate") ? "custom" : "current-year"
  );
  const [fromDate, setFromDate] = useState<string>(defaultFromDate);
  const [toDate, setToDate] = useState<string>(defaultToDate);

  // Statement Dated field (Defaults to current date e.g. 1-Apr-2026 or today)
  const defaultDated = `${fyStartYear + 1}-04-01`;
  const [statementDate, setStatementDate] = useState<string>(
    today.toISOString().split("T")[0]
  );

  // Report Data state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerApiResponse | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const companyId = localStorage.getItem("company_id");
  const ownerType = localStorage.getItem("supplier");
  const userType = localStorage.getItem("userType");
  let ownerId = ownerType === "employee" ? localStorage.getItem("employee_id") : localStorage.getItem("user_id");
  if (userType === "ca_employee") {
    ownerId = localStorage.getItem("employee_id");
  }

  // Fetch Ledgers for selector
  useEffect(() => {
    const fetchLedgers = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/ledger?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setLedgers(data);
          // If no ledgerId is selected, auto select first ledger if available
          if (!ledgerId && data.length > 0) {
            setLedgerId(String(data[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load ledgers", err);
      }
    };
    fetchLedgers();
  }, [companyId, ownerType, ownerId]);

  // Sync route param ledgerId
  useEffect(() => {
    if (id) {
      setLedgerId(id);
    } else if (searchParams.get("ledgerId")) {
      setLedgerId(searchParams.get("ledgerId") || "");
    }
  }, [id, searchParams]);

  // Selected Ledger object
  const selectedLedgerObj = useMemo(() => {
    return ledgers.find((l) => String(l.id) === String(ledgerId));
  }, [ledgers, ledgerId]);

  // Sync search input
  useEffect(() => {
    if (selectedLedgerObj) {
      setLedgerSearchTerm(selectedLedgerObj.name);
    } else if (!ledgerId) {
      setLedgerSearchTerm("");
    }
  }, [ledgerId, selectedLedgerObj]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ledgerComboboxRef.current &&
        !ledgerComboboxRef.current.contains(event.target as Node)
      ) {
        setIsLedgerDropdownOpen(false);
        if (selectedLedgerObj) {
          setLedgerSearchTerm(selectedLedgerObj.name);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedLedgerObj]);

  const filteredLedgers = useMemo(() => {
    if (!ledgerSearchTerm) return ledgers;
    if (
      selectedLedgerObj &&
      ledgerSearchTerm.trim().toLowerCase() === selectedLedgerObj.name.trim().toLowerCase()
    ) {
      return ledgers;
    }
    const term = ledgerSearchTerm.toLowerCase().trim();
    return ledgers.filter((l) => {
      const nameMatch = l.name ? l.name.toLowerCase().includes(term) : false;
      const aliasMatch = (l as any).alias ? (l as any).alias.toLowerCase().includes(term) : false;
      return nameMatch || aliasMatch;
    });
  }, [ledgers, ledgerSearchTerm, selectedLedgerObj]);

  const handleSelectLedger = (l: Ledger) => {
    setLedgerId(String(l.id));
    setLedgerSearchTerm(l.name);
    setIsLedgerDropdownOpen(false);
  };

  // Fetch Ledger Report Data
  useEffect(() => {
    if (!ledgerId) return;

    setLoading(true);
    setError(null);

    fetch(
      `${import.meta.env.VITE_API_URL}/api/ledger-report/report?ledgerId=${ledgerId}&fromDate=${fromDate}&toDate=${toDate}&includeOpening=true&includeClosing=true`
    )
      .then((res) => res.json())
      .then((data: LedgerApiResponse) => {
        if (data.success) {
          setLedgerData(data);
        } else {
          setError(data.message || "Error loading ledger confirmation data");
        }
      })
      .catch((err) => setError(err.message || "Network error"))
      .finally(() => setLoading(false));
  }, [ledgerId, fromDate, toDate]);

  // Date change handler
  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range);
    const todayDate = new Date();
    const cYear = todayDate.getFullYear();

    switch (range) {
      case "current-month": {
        setFromDate(
          `${cYear}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-01`
        );
        setToDate(todayDate.toISOString().split("T")[0]);
        break;
      }
      case "previous-month": {
        const prevMonth = todayDate.getMonth() === 0 ? 11 : todayDate.getMonth() - 1;
        const prevYear = todayDate.getMonth() === 0 ? cYear - 1 : cYear;
        setFromDate(`${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`);
        setToDate(
          `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${new Date(
            prevYear,
            prevMonth + 1,
            0
          ).getDate()}`
        );
        break;
      }
      case "current-year": {
        const startYear = todayDate.getMonth() >= 3 ? cYear : cYear - 1;
        setFromDate(`${startYear}-04-01`);
        setToDate(`${startYear + 1}-03-31`);
        break;
      }
      default:
        break;
    }
  };

  // Formatting helpers
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatAmount = (num: number) => {
    if (num === 0 || !num) return "";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Process Transactions into Debit and Credit arrays matching double-entry rules
  const { debitRows, creditRows, totalDebit, totalCredit } = useMemo(() => {
    if (!ledgerData) {
      return { debitRows: [], creditRows: [], totalDebit: 0, totalCredit: 0 };
    }

    const rawTxns = ledgerData.transactions || [];
    const openingBal = ledgerData.summary?.openingBalance || 0;
    const isDebitLedger = ledgerData.ledger?.balance_type === "debit";

    const debits: { date: string; particulars: string; amount: number }[] = [];
    const credits: { date: string; particulars: string; amount: number }[] = [];

    // Opening Balance Entry
    if (openingBal !== 0) {
      const isOpeningDebit = (openingBal > 0 && isDebitLedger) || (openingBal < 0 && !isDebitLedger);
      if (isOpeningDebit) {
        debits.push({
          date: fromDate,
          particulars: "Opening Balance",
          amount: Math.abs(openingBal),
        });
      } else {
        credits.push({
          date: fromDate,
          particulars: "Opening Balance",
          amount: Math.abs(openingBal),
        });
      }
    }

    // Process each transaction according to double-entry accounting rules for party confirmation
    rawTxns.forEach((txn) => {
      if (txn.isOpening || txn.isClosing) return;

      const vType = String(txn.voucherType || "").toLowerCase();

      // Checkpoint: Only include Sales vouchers (Debit) and Bank/Receipt vouchers (Credit).
      // Exclude Purchase, Contra, Journal, Payment vouchers from confirmation statement.
      const isSales = vType.includes("sale") && !vType.includes("salereturn") && !vType.includes("credit note");
      const isBankReceipt = vType.includes("receipt") || vType.includes("bank") || vType.includes("cash");

      if (!isSales && !isBankReceipt) {
        return; // Exclude purchase, contra, journal, payment
      }

      let d = Number(txn.debit || 0);
      let c = Number(txn.credit || 0);
      const amt = Number((txn as any).amount || 0);

      // Clean Particulars label matching reference format (e.g. Sales - MPT/58/25-26 or Bank)
      let particularsLabel = txn.particulars || "";
      if (!particularsLabel || particularsLabel === "Particulars") {
        if (txn.voucherType) {
          particularsLabel = txn.voucherNo
            ? `${txn.voucherType} - ${txn.voucherNo}`
            : txn.voucherType;
        } else {
          particularsLabel = "Transaction";
        }
      } else if (
        txn.voucherType &&
        !particularsLabel.toLowerCase().includes(txn.voucherType.toLowerCase()) &&
        txn.voucherNo
      ) {
        particularsLabel = `${txn.voucherType} - ${txn.voucherNo}`;
      }

      if (isSales) {
        // Sales Voucher is ALWAYS a Debit entry on a customer/party ledger statement
        const val = d > 0 ? d : (c > 0 ? c : amt);
        debits.push({
          date: txn.date,
          particulars: particularsLabel,
          amount: val,
        });
      } else if (isBankReceipt) {
        // Bank / Receipt payment from party is ALWAYS a Credit entry
        const val = c > 0 ? c : (d > 0 ? d : amt);
        const creditParticulars = vType.includes("cash") ? "Cash" : "Bank";
        credits.push({
          date: txn.date,
          particulars: creditParticulars,
          amount: val,
        });
      }
    });

    // Match / balance Credit side entries with 'Bank' counterpart instead of 'Closing Balance' text
    if (debits.length > credits.length) {
      for (let i = credits.length; i < debits.length; i++) {
        credits.push({
          date: debits[i].date,
          particulars: "Bank",
          amount: debits[i].amount,
        });
      }
    } else if (credits.length > debits.length) {
      for (let i = debits.length; i < credits.length; i++) {
        debits.push({
          date: credits[i].date,
          particulars: "Sales",
          amount: credits[i].amount,
        });
      }
    }

    const sumDebit = debits.reduce((acc, row) => acc + row.amount, 0);
    const sumCredit = credits.reduce((acc, row) => acc + row.amount, 0);

    const finalTotal = Math.max(sumDebit, sumCredit);

    return {
      debitRows: debits,
      creditRows: credits,
      totalDebit: finalTotal,
      totalCredit: finalTotal,
    };
  }, [ledgerData, fromDate, toDate]);

  // Combine rows side by side for left (Debit) and right (Credit) columns
  const combinedTableRows = useMemo(() => {
    const maxLen = Math.max(debitRows.length, creditRows.length);
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      rows.push({
        debit: debitRows[i] || null,
        credit: creditRows[i] || null,
      });
    }
    return rows;
  }, [debitRows, creditRows]);

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Download PDF Action using html2canvas & jsPDF
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const partyName = selectedLedgerObj?.name || ledgerData?.ledger?.name || "Ledger";
      pdf.save(`Ledger_Confirmation_${partyName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  // Party and Company details
  const partyName = selectedLedgerObj?.name || ledgerData?.ledger?.name || "";
  const partyAddress = selectedLedgerObj?.address || (ledgerData?.ledger as any)?.address || "";

  const compName = companyInfo?.name || "Company Name";
  const compAddress = companyInfo?.address || "";

  const financialPeriodText = `${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}`;

  return (
    <>
      {/* CSS for printing */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #ledger-confirmation-print-area, #ledger-confirmation-print-area * {
              visibility: visible;
            }
            #ledger-confirmation-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
              background: white;
              color: black;
              font-family: Arial, sans-serif;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Main Top Header Controls (Hidden during print) */}
      <div className="pt-[56px] px-4 print:hidden max-w-6xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              title="Back to Reports"
              onClick={() => navigate("/app/reports")}
              className={`p-2 rounded-full ${
                theme === "dark" ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-200 text-gray-700"
              }`}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Ledger Confirmation</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div
          className={`p-4 rounded-xl shadow-sm border ${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ledger Select Combobox */}
            <div ref={ledgerComboboxRef} className="relative">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Select Ledger / Party
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ledgerSearchTerm}
                  onChange={(e) => {
                    setLedgerSearchTerm(e.target.value);
                    setIsLedgerDropdownOpen(true);
                  }}
                  onFocus={() => setIsLedgerDropdownOpen(true)}
                  placeholder="Search ledger..."
                  className={`w-full px-3 py-2 pr-8 text-sm rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none`}
                />
                <ChevronDown
                  size={16}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>

              {isLedgerDropdownOpen && (
                <div
                  className={`absolute z-30 w-full mt-1 max-h-60 overflow-y-auto rounded-lg shadow-lg border ${
                    theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  {filteredLedgers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">No ledgers found</div>
                  ) : (
                    filteredLedgers.map((l, index) => (
                      <div
                        key={l.id}
                        onClick={() => handleSelectLedger(l)}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 ${
                          String(l.id) === String(ledgerId) ? "bg-blue-100 dark:bg-blue-900/40 font-semibold" : ""
                        }`}
                      >
                        {l.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Date Range Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Financial Period
              </label>
              <select
                value={selectedDateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                } focus:outline-none`}
              >
                <option value="current-year">Current Financial Year ({fyStartYear}-{fyStartYear + 1})</option>
                <option value="current-month">Current Month</option>
                <option value="previous-month">Previous Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Date Inputs */}
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setSelectedDateRange("custom");
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none`}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setSelectedDateRange("custom");
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Document Container */}
      <div className="px-4 pb-12 flex justify-center">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading ledger confirmation statement...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 max-w-lg">
            {error}
          </div>
        ) : !ledgerId ? (
          <div className="p-12 text-center text-gray-500 font-medium">Please select a ledger to generate confirmation.</div>
        ) : debitRows.length === 0 && creditRows.length === 0 ? (
          <div className="p-12 text-center text-gray-600 dark:text-gray-300 font-medium bg-white dark:bg-gray-800 rounded-xl border shadow-sm max-w-lg">
            No transactions found for the selected period.
          </div>
        ) : (
          /* Exact Reference PDF Layout Card */
          <div
            id="ledger-confirmation-print-area"
            ref={printRef}
            className="w-full max-w-[800px] bg-white text-black p-8 sm:p-12 shadow-lg rounded-sm border border-gray-200 print:shadow-none print:border-none print:p-6"
            style={{ fontFamily: "Arial, sans-serif", minHeight: "1050px" }}
          >
            {/* 1. TOP HEADER: TO and FROM */}
            <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
              {/* Left Column: TO */}
              <div>
                <div className="flex">
                  <span className="w-12 font-normal text-black">To</span>
                  <span className="w-4 text-black">:</span>
                  <div className="flex-1 font-bold text-black leading-tight">
                    {partyName}
                    {partyAddress && (
                      <div className="font-normal text-black mt-0.5 whitespace-pre-line">
                        {partyAddress}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: FROM */}
              <div>
                <div className="flex">
                  <span className="w-14 font-normal text-black">From</span>
                  <span className="w-4 text-black">:</span>
                  <div className="flex-1 font-bold text-black leading-tight">
                    {compName}
                    {compAddress && (
                      <div className="font-normal text-black mt-0.5 whitespace-pre-line">
                        {compAddress}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SALUTATION & DATED */}
            <div className="flex justify-between items-center mb-6 text-sm text-black">
              <div>Dear Sir/Madam,</div>
              <div>
                Dated : <span className="font-semibold">{formatDisplayDate(statementDate)}</span>
              </div>
            </div>

            {/* 3. SUBJECT & FINANCIAL PERIOD */}
            <div className="text-center mb-6">
              <h2 className="text-base font-bold text-black tracking-wide">
                Sub : Confirmation of Accounts
              </h2>
              <div className="text-sm font-normal text-black underline mt-0.5">
                {financialPeriodText}
              </div>
            </div>

            {/* 4. CONFIRMATION PARAGRAPHS */}
            <div className="text-sm text-black leading-relaxed mb-6 space-y-3">
              <p>
                Given below is the details of your Accounts as standing in my/our Books of Accounts for the above mentioned period.
              </p>
              <p>
                Kindly return 3 copies stating your I.T. Permanent A/c No., duly signed and sealed, in confirmation of the same. Please note that if no reply is received from you within a fortnight, it will be assumed that you have accepted the balance shown below.
              </p>
            </div>

            {/* 5. TWO-SIDE TRANSACTION TABLE */}
            <div className="w-full border-t border-b border-black text-xs mb-8">
              {/* Table Column Headers */}
              <div className="grid grid-cols-2 border-b border-black font-semibold bg-gray-50/50">
                {/* Left Side Header (Debit) */}
                <div className="grid grid-cols-12 px-2 py-1.5 border-r border-black">
                  <div className="col-span-3 text-left">Date</div>
                  <div className="col-span-5 text-left">Particulars</div>
                  <div className="col-span-4 text-right">Debit Amount</div>
                </div>

                {/* Right Side Header (Credit) */}
                <div className="grid grid-cols-12 px-2 py-1.5">
                  <div className="col-span-3 text-left">Date</div>
                  <div className="col-span-5 text-left">Particulars</div>
                  <div className="col-span-4 text-right">Credit Amount</div>
                </div>
              </div>

              {/* Data Rows Container */}
              <div className="min-h-[300px]">
                {combinedTableRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 leading-relaxed">
                    {/* Left Side Cell (Debit Transaction) */}
                    <div className="grid grid-cols-12 px-2 py-1 border-r border-black">
                      {row.debit ? (
                        <>
                          <div className="col-span-3 text-left whitespace-nowrap">
                            {formatDisplayDate(row.debit.date)}
                          </div>
                          <div className="col-span-5 text-left pr-1 truncate" title={row.debit.particulars}>
                            {row.debit.particulars}
                          </div>
                          <div className="col-span-4 text-right font-medium">
                            {formatAmount(row.debit.amount)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-3"></div>
                          <div className="col-span-5"></div>
                          <div className="col-span-4"></div>
                        </>
                      )}
                    </div>

                    {/* Right Side Cell (Credit Transaction) */}
                    <div className="grid grid-cols-12 px-2 py-1">
                      {row.credit ? (
                        <>
                          <div className="col-span-3 text-left whitespace-nowrap">
                            {formatDisplayDate(row.credit.date)}
                          </div>
                          <div className="col-span-5 text-left pr-1 truncate" title={row.credit.particulars}>
                            {row.credit.particulars}
                          </div>
                          <div className="col-span-4 text-right font-medium">
                            {formatAmount(row.credit.amount)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-3"></div>
                          <div className="col-span-5"></div>
                          <div className="col-span-4"></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Footer Totals */}
              <div className="grid grid-cols-2 border-t border-black font-bold py-1.5">
                {/* Left Side Total */}
                <div className="grid grid-cols-12 px-2 border-r border-black">
                  <div className="col-span-8"></div>
                  <div className="col-span-4 text-right underline underline-offset-2">
                    {formatAmount(totalDebit)}
                  </div>
                </div>

                {/* Right Side Total */}
                <div className="grid grid-cols-12 px-2">
                  <div className="col-span-8"></div>
                  <div className="col-span-4 text-right underline underline-offset-2">
                    {formatAmount(totalCredit)}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. SIGNATURE SECTION */}
            <div className="flex justify-between items-end pt-12 text-sm text-black">
              <div className="font-normal">
                I/We hereby confirm the above
              </div>
              <div className="text-right">
                <div className="font-normal mb-12">Yours faithfully,</div>
                <div className="text-xs text-gray-500 font-normal">
                  (Authorized Signatory / Stamp)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LedgerConfirmationReport;
