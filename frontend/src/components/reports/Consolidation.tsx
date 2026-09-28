import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { ArrowLeft, Printer, Download, Settings, ChevronDown, ChevronRight, User, Calendar } from "lucide-react";
import { useAuth } from "../../home/context/AuthContext";
import { useFinancialYear, getFinancialYearRange, getAvailableFinYears } from "../../hooks/useFinancialYear";
import FixedAssetsSchedule from "./FixedAssetsSchedule";

interface Company {
  id: number;
  name: string;
}

interface Ledger {
  id: number;
  name: string;
  groupId: number;
  openingBalance: number;
  balanceType: "debit" | "credit";
  groupName: string;
  groupType: string | null;
  companyId: number;
  companyName: string;
  closing_balance?: number;
}

interface LedgerGroup {
  id: number;
  name: string;
  type: string | null;
  parent: number | null;
  companyId: number;
}

const formatINR = (value: number) => {
  if (value === undefined || value === null || isNaN(value)) return "₹0.00";
  return "₹" + Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: 2 });
};

const ConsolidatedFinancialReport: React.FC = () => {
  const { theme } = useAppContext();
  const { user } = useAuth();
  const { selectedFinYear, setSelectedFinYear } = useFinancialYear();
  const navigate = useNavigate();

  const employeeId = localStorage.getItem("employee_id") || "";
  const userId = localStorage.getItem("user_id") || "";
  const userType = localStorage.getItem("userType") || "";
  const supplier = localStorage.getItem("supplier") || "employee";
  const ownerId = supplier === "employee" ? employeeId : userId;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetailedView, setIsDetailedView] = useState(false);

  const [salesData, setSalesData] = useState<Record<number, number>>({});
  const [purchaseData, setPurchaseData] = useState<Record<number, number>>({});

  const [debitCreditData, setDebitCreditData] = useState<
    Record<string, { debit: number; credit: number }>
  >({});

  const [profitLossData, setProfitLossData] = useState<
    Record<number, { netProfit: number; netLoss: number; transferredProfit: number; transferredLoss: number }>
  >({});

  const [showItemWise, setShowItemWise] = useState(false);
  const [stockItemsMap, setStockItemsMap] = useState<Record<number, any[]>>({});
  const [purchaseHistoryMap, setPurchaseHistoryMap] = useState<Record<number, any[]>>({});
  const [salesHistoryMap, setSalesHistoryMap] = useState<Record<number, any[]>>({});

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    liabilities: true,
    assets: true,
    trading: true,
    profitLoss: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!employeeId && !userId) return;
      setLoading(true);
      setError(null);
      try {
        const { startDate, endDate } = getFinancialYearRange(selectedFinYear);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const url = `${import.meta.env.VITE_API_URL}/api/consolidated-balance-sheet?employee_id=${employeeId}&ca_id=${userId}&ca_employee_id=${userId}&user_type=${userType}&startDate=${startStr}&endDate=${endStr}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load consolidated data");
        const data = await res.json();

        setCompanies(data.companies || []);
        setLedgers(data.ledgers || []);
        setLedgerGroups(data.ledgerGroups || []);
        setDebitCreditData(data.debitCreditData || {});
        setProfitLossData(data.profitLossData || {});
        setSalesData(data.salesData || {});
        setPurchaseData(data.purchaseData || {});

        // Load Item-wise setting
        const storedItemWise = localStorage.getItem("PL_SHOW_ITEM_WISE");
        if (storedItemWise !== null) {
          setShowItemWise(storedItemWise === "true");
        }

        // Fetch Inventory Data for all companies
        if (data.companies && data.companies.length > 0) {
          data.companies.forEach(async (c: Company) => {
            // Stock Items
            try {
              const stockRes = await fetch(`${import.meta.env.VITE_API_URL}/api/stock-items?company_id=${c.id}&owner_type=${supplier}&owner_id=${ownerId}`);
              const stockData = await stockRes.json();
              setStockItemsMap(prev => ({ ...prev, [c.id]: stockData.data || [] }));
            } catch (err) { console.error(`Stock fetch error for ${c.id}`, err); }

            // Purchase History
            try {
              const purRes = await fetch(`${import.meta.env.VITE_API_URL}/api/purchase-vouchers/purchase-history?company_id=${c.id}&owner_type=${supplier}&owner_id=${ownerId}`);
              const purData = await purRes.json();
              setPurchaseHistoryMap(prev => ({ ...prev, [c.id]: purData.data || [] }));
            } catch (err) { console.error(`Purchase fetch error for ${c.id}`, err); }

            // Sales History
            try {
              const saleRes = await fetch(`${import.meta.env.VITE_API_URL}/api/sales-vouchers/sale-history?company_id=${c.id}&owner_type=${supplier}&owner_id=${ownerId}`);
              const saleData = await saleRes.json();
              setSalesHistoryMap(prev => ({ ...prev, [c.id]: saleData.data || [] }));
            } catch (err) { console.error(`Sales fetch error for ${c.id}`, err); }
          });
        }
      } catch (err: any) {
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [employeeId, userId, selectedFinYear]);

  const calculateClosingBalance = (ledger: Ledger): number => {
    const opening = Number(ledger.openingBalance) || 0;
    const key = `${ledger.companyId}_${ledger.id}`;
    const debit = debitCreditData[key]?.debit || 0;
    const credit = debitCreditData[key]?.credit || 0;

    if (ledger.groupName?.toLowerCase() === "stock-in-hand") {
      // Use database closing_balance for stock-in-hand
      return Number(ledger.closing_balance) || 0;
    }

    return ledger.balanceType === "debit" ? (opening + debit - credit) : (opening + credit - debit);
  };

  const calculateGroupTotalByCompany = (groupId: number, companyId: number): number => {
    const findSubGroups = (id: number): number[] => {
      let results = [id];
      ledgerGroups.filter(g => Number(g.parent) === Number(id)).forEach(c => {
        results = [...results, ...findSubGroups(Number(c.id))];
      });
      return results;
    };
    const allGroupIds = findSubGroups(groupId);
    const companyLedgers = ledgers.filter(l => allGroupIds.includes(Number(l.groupId)) && l.companyId === companyId);
    return companyLedgers.reduce((sum, ledger) => sum + Math.abs(calculateClosingBalance(ledger)), 0);
  };

  const getIndirectExpenseForCompany = (companyId: number) => calculateGroupTotalByCompany(-10, companyId);
  const getIndirectIncomeForCompany = (companyId: number) => calculateGroupTotalByCompany(-11, companyId);

  const getInventoryCalculations = (companyId: number) => {
    const stockItems = stockItemsMap[companyId] || [];
    const pHistory = purchaseHistoryMap[companyId] || [];
    const sHistory = salesHistoryMap[companyId] || [];

    const itemMap: Record<string, any> = {};

    stockItems.forEach((item: any) => {
      const itemName = item.name;
      if (!itemMap[itemName]) {
        itemMap[itemName] = {
          name: itemName,
          openingQty: 0,
          openingValue: 0,
          inwardQty: 0,
          inwardValue: 0,
          outwardQty: 0,
          outwardValue: 0,
          closingQty: 0,
          closingValue: 0,
          avgRate: 0
        };
      }
      let batchesProcessed = false;
      const batches = typeof item.batches === 'string' ? JSON.parse(item.batches) : (item.batches || []);
      if (batches.length > 0) {
        batches.forEach((b: any) => {
          const q = Number(b.batchQuantity || 0);
          const r = Number(b.openingRate || 0);
          itemMap[itemName].openingQty += q;
          itemMap[itemName].openingValue += q * r;
          batchesProcessed = true;
        });
      }
      if (!batchesProcessed && (Number(item.openingBalance || 0) > 0)) {
        const q = Number(item.openingBalance || 0);
        const r = Number(item.openingRate || item.rate || 0);
        itemMap[itemName].openingQty += q;
        itemMap[itemName].openingValue += q * r;
      }
    });

    pHistory.forEach((p: any) => {
      const itemName = p.itemName;
      if (!itemMap[itemName]) {
        itemMap[itemName] = { name: itemName, openingQty: 0, openingValue: 0, inwardQty: 0, inwardValue: 0, outwardQty: 0, outwardValue: 0, closingQty: 0, closingValue: 0, avgRate: 0 };
      }
      const q = Number(p.purchaseQuantity || 0);
      const v = q * Number(p.rate || p.purchaseRate || 0);
      itemMap[itemName].inwardQty += q;
      itemMap[itemName].inwardValue += v;
    });

    sHistory.forEach((s: any) => {
      const itemName = s.itemName;
      if (!itemMap[itemName]) return;
      const q = Math.abs(Number(s.qtyChange || s.quantity || 0));
      itemMap[itemName].outwardQty += q;
    });

    let totalOpeningValue = 0;
    let totalClosingValue = 0;

    Object.values(itemMap).forEach((item: any) => {
      const totalInQty = item.openingQty + item.inwardQty;
      const totalInValue = item.openingValue + item.inwardValue;
      item.avgRate = totalInQty > 0 ? totalInValue / totalInQty : 0;
      item.closingQty = totalInQty - item.outwardQty;
      item.closingValue = item.closingQty * item.avgRate;
      if (Math.abs(item.closingQty) < 0.001) item.closingQty = 0;
      if (Math.abs(item.closingValue) < 0.01) item.closingValue = 0;
      totalOpeningValue += item.openingValue;
      totalClosingValue += Math.max(0, item.closingValue);
    });

    return { totalOpeningValue, totalClosingValue };
  };

  const getCompanyOpeningStock = (companyId: number) => {
    if (showItemWise) {
      return getInventoryCalculations(companyId).totalOpeningValue;
    }
    const stockLedgers = ledgers.filter(l => {
      const gname = (l.groupName || "").toLowerCase();
      const gtype = (l.groupType || "").toLowerCase();
      return (gname.includes("stock") || gtype.includes("stock")) && l.companyId === companyId;
    });
    return stockLedgers.reduce((sum, l) => sum + (Number(l.openingBalance) || 0), 0);
  };

  const getCompanyClosingStock = (companyId: number) => {
    // If both sales and purchase are 0, return 0 for Trading Account purposes
    const sales = getSalesForCompany(companyId);
    const purchase = getPurchaseForCompany(companyId);
    if (sales === 0 && purchase === 0) {
      return 0;
    }

    if (showItemWise) {
      return getInventoryCalculations(companyId).totalClosingValue;
    }
    const stockLedgers = ledgers.filter(l => {
      const gname = (l.groupName || "").toLowerCase();
      const gtype = (l.groupType || "").toLowerCase();
      return (gname.includes("stock") || gtype.includes("stock")) && l.companyId === companyId;
    });
    return stockLedgers.reduce((sum, l) => sum + Math.abs(calculateClosingBalance(l)), 0);
  };

  const getCompanyGrossProfit = (companyId: number) => {
    const sale = getSalesForCompany(companyId);
    const directInc = getDirectIncomeForCompany(companyId);
    const closingStock = getCompanyClosingStock(companyId);
    const purchase = getPurchaseForCompany(companyId);
    const openingStock = getCompanyOpeningStock(companyId);
    const directExp = getDirectExpenseForCompany(companyId);
    return (sale + directInc + closingStock) - (purchase + openingStock + directExp);
  };

  const getStockLedgersForCompany = (companyId: number) => {
    return ledgers.filter(l => {
      const gname = (l.groupName || "").toLowerCase();
      const gtype = (l.groupType || "").toLowerCase();
      return (gname.includes("stock") || gtype.includes("stock")) && l.companyId === companyId;
    });
  };

  const getCompanyProfitLoss = (companyId: number) => {
    const grossProfit = getCompanyGrossProfit(companyId);
    const indirectInc = getIndirectIncomeForCompany(companyId);
    const indirectExp = getIndirectExpenseForCompany(companyId);
    return (grossProfit + indirectInc) - indirectExp;
  };

  const getTotalForGroup = (groupId: number) => {
    return companies.reduce((sum, c) => sum + calculateGroupTotalByCompany(groupId, c.id), 0);
  };

  const getSalesForCompany = (companyId: number) => {
    return salesData[companyId] || 0;
  };

  const getPurchaseForCompany = (companyId: number) => {
    return purchaseData[companyId] || 0;
  };

  const getTotalSales = () => companies.reduce((sum, c) => sum + getSalesForCompany(c.id), 0);
  const getTotalPurchase = () => companies.reduce((sum, c) => sum + getPurchaseForCompany(c.id), 0);
  const getTotalPL = () => companies.reduce((sum, c) => sum + getCompanyProfitLoss(c.id), 0);

  const getDirectExpenseForCompany = (companyId: number) => calculateGroupTotalByCompany(-7, companyId);
  const getDirectIncomeForCompany = (companyId: number) => calculateGroupTotalByCompany(-8, companyId);

  const getTotalDirectExpense = () => companies.reduce((sum, c) => sum + getDirectExpenseForCompany(c.id), 0);
  const getTotalDirectIncome = () => companies.reduce((sum, c) => sum + getDirectIncomeForCompany(c.id), 0);
  const getTotalIndirectIncome = () => companies.reduce((sum, c) => sum + getIndirectIncomeForCompany(c.id), 0);

  const getTotalGrossProfit = () => {
    return companies.reduce((sum, c) => sum + getCompanyGrossProfit(c.id), 0);
  };

  // Get ledgers for a group by company
  const getLedgersForGroup = (groupId: number, companyId: number) => {
    const findSubGroups = (id: number): number[] => {
      let results = [id];
      ledgerGroups.filter(g => Number(g.parent) === Number(id)).forEach(c => {
        results = [...results, ...findSubGroups(Number(c.id))];
      });
      return results;
    };
    const allGroupIds = findSubGroups(groupId);
    return ledgers.filter(l => allGroupIds.includes(Number(l.groupId)) && l.companyId === companyId);
  };

  const findSubGroups = (id: number): number[] => {
    let results = [id];
    ledgerGroups.filter((g) => Number(g.parent) === Number(id)).forEach((child) => {
      results = [...results, ...findSubGroups(Number(child.id))];
    });
    return results;
  };

  const renderRowWithLedgers = (
    label: string,
    groupId: number | string,
    getValue: (cid: number) => number,
    totalVal: number
  ) => {
    const isGroup = typeof groupId === "number";
    const isOpeningStock = label === "Opening Stock";
    const isClosingStock = label === "Closing Stock";

    return (
      <React.Fragment key={label}>
        <tr className={isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
          <td className={tdClass}>{label}</td>
          {companies.map((c) => (
            <td key={c.id} className={tdRightClass}>
              {formatINR(getValue(c.id))}
            </td>
          ))}
          <td className={`${tdRightClass} font-bold text-indigo-600`}>
            {formatINR(totalVal)}
          </td>
        </tr>

        {isDetailedView && (
          <>
            {isGroup &&
              /* Find unique ledger names across all companies for this group */
              Array.from(
                new Set(
                  ledgers
                    .filter((l) =>
                      findSubGroups(groupId as number).includes(Number(l.groupId))
                    )
                    .map((l) => l.name)
                )
              ).map((ledgerName) => (
                <tr
                  key={ledgerName}
                  className={`text-xs ${isDark ? "bg-gray-750" : "bg-gray-50"}`}
                >
                  <td className={`${tdClass} pl-6 italic text-gray-500`}>
                    ↳ {ledgerName}
                  </td>
                  {companies.map((c) => {
                    const ledger = ledgers.find(
                      (l) => l.name === ledgerName && l.companyId === c.id
                    );
                    const value = ledger
                      ? isOpeningStock
                        ? Number(ledger.openingBalance) || 0
                        : calculateClosingBalance(ledger)
                      : 0;
                    return (
                      <td key={c.id} className={`${tdRightClass} text-gray-400`}>
                        {value !== 0 ? formatINR(Math.abs(value)) : "—"}
                      </td>
                    );
                  })}
                  <td className={`${tdRightClass} text-indigo-400 font-medium`}>
                    {formatINR(
                      companies.reduce((sum, c) => {
                        const ledger = ledgers.find(
                          (l) => l.name === ledgerName && l.companyId === c.id
                        );
                        return (
                          sum +
                          (ledger
                            ? isOpeningStock
                              ? Math.abs(Number(ledger.openingBalance) || 0)
                              : Math.abs(calculateClosingBalance(ledger))
                            : 0)
                        );
                      }, 0)
                    )}
                  </td>
                </tr>
              ))}

            {(isClosingStock || isOpeningStock) &&
              companies.some((c) => (stockItemsMap[c.id] || []).length > 0) &&
              Array.from(
                new Set(
                  companies.flatMap((c) =>
                    (stockItemsMap[c.id] || []).map((item) => item.name)
                  )
                )
              ).map((itemName) => (
                <tr
                  key={itemName + (isClosingStock ? "_cl" : "_op")}
                  className={`text-xs ${isDark ? "bg-gray-750" : "bg-gray-50"}`}
                >
                  <td className={`${tdClass} pl-6 italic text-gray-500`}>
                    ↳ {itemName} (Item)
                  </td>
                  {companies.map((c) => {
                    const stockItems = stockItemsMap[c.id] || [];
                    const pHistory = purchaseHistoryMap[c.id] || [];
                    const sHistory = salesHistoryMap[c.id] || [];
                    const itemCalcs = stockItems.find((i) => i.name === itemName);
                    let itemVal = 0;
                    if (itemCalcs) {
                      let openingQty = 0;
                      let openingVal = 0;
                      const batches =
                        typeof itemCalcs.batches === "string"
                          ? JSON.parse(itemCalcs.batches)
                          : itemCalcs.batches || [];
                      if (batches.length > 0) {
                        batches.forEach((b: any) => {
                          openingQty += Number(b.batchQuantity || 0);
                          openingVal +=
                            Number(b.batchQuantity || 0) *
                            Number(b.openingRate || 0);
                        });
                      } else if (Number(itemCalcs.openingBalance || 0) > 0) {
                        openingQty = Number(itemCalcs.openingBalance);
                        openingVal =
                          openingQty *
                          Number(itemCalcs.openingRate || itemCalcs.rate || 0);
                      }

                      if (isOpeningStock) {
                        itemVal = openingVal;
                      } else {
                        const itemInwardQty = pHistory
                          .filter((p) => p.itemName === itemName)
                          .reduce(
                            (s, p) => s + (Number(p.purchaseQuantity) || 0),
                            0
                          );
                        const itemInwardVal = pHistory
                          .filter((p) => p.itemName === itemName)
                          .reduce(
                            (s, p) =>
                              s +
                              Number(p.purchaseQuantity) *
                              Number(p.rate || p.purchaseRate || 0),
                            0
                          );
                        const itemOutwardQty = sHistory
                          .filter((s) => s.itemName === itemName)
                          .reduce(
                            (s, s_item) =>
                              s +
                              Math.abs(
                                Number(s_item.qtyChange || s_item.quantity || 0)
                              ),
                            0
                          );
                        const totalInQty = openingQty + itemInwardQty;
                        const totalInVal = openingVal + itemInwardVal;
                        const avgRate =
                          totalInQty > 0 ? totalInVal / totalInQty : 0;
                        itemVal = Math.max(0, (totalInQty - itemOutwardQty) * avgRate);
                      }
                    }
                    return (
                      <td key={c.id} className={`${tdRightClass} text-gray-400`}>
                        {itemVal > 0 ? formatINR(itemVal) : "—"}
                      </td>
                    );
                  })}
                  <td className={`${tdRightClass} text-indigo-400 font-medium`}>
                    {formatINR(
                      companies.reduce((sum, c) => {
                        const stockItems = stockItemsMap[c.id] || [];
                        const itemCalcs = stockItems.find(
                          (i) => i.name === itemName
                        );
                        if (!itemCalcs) return sum;
                        let openingQty = 0;
                        let openingVal = 0;
                        const batches =
                          typeof itemCalcs.batches === "string"
                            ? JSON.parse(itemCalcs.batches)
                            : itemCalcs.batches || [];
                        if (batches.length > 0) {
                          batches.forEach((b: any) => {
                            openingQty += Number(b.batchQuantity || 0);
                            openingVal +=
                              Number(b.batchQuantity || 0) *
                              Number(b.openingRate || 0);
                          });
                        } else if (Number(itemCalcs.openingBalance || 0) > 0) {
                          openingQty = Number(itemCalcs.openingBalance);
                          openingVal =
                            openingQty *
                            Number(itemCalcs.openingRate || itemCalcs.rate || 0);
                        }
                        if (isOpeningStock) return sum + openingVal;
                        const pHistory = purchaseHistoryMap[c.id] || [];
                        const sHistory = salesHistoryMap[c.id] || [];
                        const itemInwardQty = pHistory
                          .filter((p) => p.itemName === itemName)
                          .reduce(
                            (s, p) => s + (Number(p.purchaseQuantity) || 0),
                            0
                          );
                        const itemInwardVal = pHistory
                          .filter((p) => p.itemName === itemName)
                          .reduce(
                            (s, p) =>
                              s +
                              Number(p.purchaseQuantity) *
                              Number(p.rate || p.purchaseRate || 0),
                            0
                          );
                        const itemOutwardQty = sHistory
                          .filter((s) => s.itemName === itemName)
                          .reduce(
                            (s, s_item) =>
                              s +
                              Math.abs(
                                Number(s_item.qtyChange || s_item.quantity || 0)
                              ),
                            0
                          );
                        const totalInQty = openingQty + itemInwardQty;
                        const totalInVal = openingVal + itemInwardVal;
                        return (
                          sum +
                          Math.max(
                            0,
                            (totalInQty - itemOutwardQty) *
                            (totalInQty > 0 ? totalInVal / totalInQty : 0)
                          )
                        );
                      }, 0)
                    )}
                  </td>
                </tr>
              ))}
          </>
        )}
      </React.Fragment>
    );
  };

  const liabilityGroups = [
    { id: -4, name: "Capital Account" },
    { id: -13, name: "Loans (Liability)" },
    { id: -6, name: "Current Liabilities" },
    { id: -19, name: "TDS Payable" },
  ];

  const assetGroups = [
    { id: -9, name: "Fixed Assets" },
    { id: -5, name: "Current Assets" },
  ];

  if (loading) return <div className="pt-[56px] px-4 text-center py-10">Loading consolidated report...</div>;
  if (!employeeId) return <div className="pt-[56px] px-4 text-center py-10">No employee ID found.</div>;
  if (error) return <div className="pt-[56px] px-4 text-center py-10 text-red-600">{error}</div>;
  if (companies.length === 0) return <div className="pt-[56px] px-4 text-center py-10">No companies assigned.</div>;

  const isDark = theme === "dark";
  const tableClass = `w-full text-sm border-collapse`;
  const thClass = `px-3 py-2 text-left font-semibold border border-gray-300 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100'}`;
  const thRightClass = `px-3 py-2 text-right font-semibold border border-gray-300 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100'}`;
  const tdClass = `px-3 py-2 border border-gray-300 ${isDark ? 'border-gray-600' : ''}`;
  const tdRightClass = `px-3 py-2 text-right font-mono border border-gray-300 ${isDark ? 'border-gray-600' : ''}`;
  const totalRowClass = `font-bold ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`;

  return (
    <div className={`pt-[56px] px-4 pb-8 min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Print Header - Visible only when printing */}


      {/* Header */}
      <div className="flex items-center mb-6 flex-wrap gap-2">
        <button
          title="Back to Reports"
          type="button"
          onClick={() => navigate("/app/reports")}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold">Consolidated Financial Report</h1>
            <p className="text-xs text-gray-500">{companies.length} {companies.length === 1 ? 'Company' : 'Companies'}</p>
          </div>
          <button
            onClick={() => navigate('/app/reports/fixed-assets-schedule')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all print:hidden ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-indigo-400 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-indigo-600 hover:bg-gray-50 shadow-sm'
            }`}
          >
            Fixed Assets Schedule
          </button>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex items-center gap-2 mr-2">
            <Calendar size={16} className="text-indigo-500" />
            <select
              value={selectedFinYear}
              onChange={(e) => setSelectedFinYear(e.target.value)}
              className={`text-xs p-2 rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
                }`}
            >
              {getAvailableFinYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button
            title="Toggle Item-wise Mode"
            onClick={() => {
              const newVal = !showItemWise;
              setShowItemWise(newVal);
              localStorage.setItem("PL_SHOW_ITEM_WISE", String(newVal));
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all text-xs font-medium border ${showItemWise
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
              : isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
          >
            <div className={`w-3 h-3 rounded-full ${showItemWise ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-gray-400'}`}></div>
            Item-wise
          </button>
          <button
            title="Toggle Detailed View"
            onClick={() => setIsDetailedView(!isDetailedView)}
            className={`p-2 rounded-md transition-all ${isDetailedView ? 'bg-blue-600 text-white' : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
          >
            <Settings size={18} />
          </button>
          <button title="Print" className={`p-2 rounded-md ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} onClick={() => window.print()}><Printer size={18} /></button>
          <button title="Download" className={`p-2 rounded-md ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><Download size={18} /></button>
        </div>
      </div>

      {isDetailedView && (
        <div className={`mb-4 p-3 rounded border text-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
          <strong>Detailed Mode:</strong> Showing ledger-wise breakdown for each group
        </div>
      )}


      <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 uppercase">Consolidated Financial Report</h1>
            <p className="text-sm text-indigo-600 font-bold mt-1">FY: {selectedFinYear}</p>
            <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-indigo-700">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-700">{user?.address}</p>
            <p className="text-sm text-gray-700">Phone: {user?.phoneNumber} | Email: {user?.email}</p>
            {user?.pan && <p className="text-sm font-semibold text-gray-800">PAN: {user.pan}</p>}
          </div>
        </div>
      </div>

      {/* CONSOLIDATED COLUMNAR TABLE */}
      <div className={`rounded border overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr className={isDark ? 'bg-gray-700' : 'bg-gray-100'}>
                <th className={thClass} style={{ minWidth: '250px' }}>Particulars</th>
                {companies.map(c => (
                  <th key={c.id} className={thRightClass}>{c.name}</th>
                ))}
                <th className={`${thRightClass} text-indigo-600`}>Consolidated Total</th>
              </tr>
            </thead>
            <tbody>
              {/* TRADING ACCOUNT SECTION */}
              <tr className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'} font-bold`}>
                <td colSpan={companies.length + 2} className={tdClass}>Trading Account</td>
              </tr>

              {renderRowWithLedgers('Sales', -16, getSalesForCompany, getTotalSales())}
              {renderRowWithLedgers('Direct Income', -8, getDirectIncomeForCompany, getTotalDirectIncome())}
              {renderRowWithLedgers('Closing Stock', 'closing_stock', getCompanyClosingStock, companies.reduce((sum, c) => sum + getCompanyClosingStock(c.id), 0))}

              {/* Total of Credit side */}
              <tr className={`text-xs ${isDark ? 'bg-gray-750' : 'bg-blue-50/50'} font-semibold`}>
                <td className={tdClass}>Total of Credit side</td>
                {companies.map(c => (
                  <td key={c.id} className={tdRightClass}>{formatINR(getSalesForCompany(c.id) + getDirectIncomeForCompany(c.id) + getCompanyClosingStock(c.id))}</td>
                ))}
                <td className={`${tdRightClass} text-indigo-600 font-bold`}>{formatINR(getTotalSales() + getTotalDirectIncome() + companies.reduce((sum, c) => sum + getCompanyClosingStock(c.id), 0))}</td>
              </tr>

              {renderRowWithLedgers('Purchase', -15, getPurchaseForCompany, getTotalPurchase())}
              {renderRowWithLedgers('Opening Stock', 'opening_stock', getCompanyOpeningStock, companies.reduce((sum, c) => sum + getCompanyOpeningStock(c.id), 0))}
              {renderRowWithLedgers('Direct Expense', -7, getDirectExpenseForCompany, getTotalDirectExpense())}

              {/* Total of Debit side */}
              <tr className={`text-xs ${isDark ? 'bg-gray-750' : 'bg-red-50/50'} font-semibold`}>
                <td className={tdClass}>Total of Debit side</td>
                {companies.map(c => (
                  <td key={c.id} className={tdRightClass}>{formatINR(getPurchaseForCompany(c.id) + getCompanyOpeningStock(c.id) + getDirectExpenseForCompany(c.id))}</td>
                ))}
                <td className={`${tdRightClass} text-indigo-600 font-bold`}>{formatINR(getTotalPurchase() + companies.reduce((sum, c) => sum + getCompanyOpeningStock(c.id), 0) + getTotalDirectExpense())}</td>
              </tr>
              <tr className={`${totalRowClass} border-t-2`}>
                <td className={tdClass}>Gross Profit</td>
                {companies.map(c => {
                  const gp = getCompanyGrossProfit(c.id);
                  return <td key={c.id} className={`${tdRightClass} ${gp >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatINR(gp)}</td>;
                })}
                <td className={`${tdRightClass} font-bold text-indigo-600`}>{formatINR(getTotalGrossProfit())}</td>
              </tr>

              {/* P&L ACCOUNT SECTION */}
              <tr className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'} font-bold`}>
                <td colSpan={companies.length + 2} className={tdClass}>Profit & Loss Account</td>
              </tr>

              {renderRowWithLedgers('Indirect Income', -11, getIndirectIncomeForCompany, getTotalIndirectIncome())}
              {renderRowWithLedgers('Indirect Expense', -10, getIndirectExpenseForCompany, companies.reduce((sum, c) => sum + getIndirectExpenseForCompany(c.id), 0))}
              {renderRowWithLedgers('Gross Profit (b/f)', 'gp_bf', getCompanyGrossProfit, getTotalGrossProfit())}

              <tr className={`${totalRowClass} border-t-2`}>
                <td className={tdClass}>Net Profit</td>
                {companies.map(c => {
                  const np = getCompanyProfitLoss(c.id);
                  return <td key={c.id} className={`${tdRightClass} ${np >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatINR(np)}</td>;
                })}
                <td className={`${tdRightClass} font-bold text-indigo-600`}>{formatINR(getTotalPL())}</td>
              </tr>

              {/* LIABILITIES SECTION */}
              <tr className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'} font-bold`}>
                <td colSpan={companies.length + 2} className={tdClass}>Liabilities</td>
              </tr>
              {liabilityGroups.map(group => renderRowWithLedgers(group.name, group.id, (cid) => calculateGroupTotalByCompany(group.id, cid), getTotalForGroup(group.id)))}

              {renderRowWithLedgers('Profit & Loss A/c', 'pl_ac', getCompanyProfitLoss, getTotalPL())}

              <tr className={`${totalRowClass} border-t-2`}>
                <td className={tdClass}>Total Liabilities</td>
                {companies.map(c => {
                  const np = getCompanyProfitLoss(c.id);
                  const liabTotal = liabilityGroups.reduce((sum, g) => sum + calculateGroupTotalByCompany(g.id, c.id), 0) + np;
                  return <td key={c.id} className={tdRightClass}>{formatINR(liabTotal)}</td>;
                })}
                <td className={`${tdRightClass} font-bold text-indigo-600`}>{formatINR(liabilityGroups.reduce((sum, g) => sum + getTotalForGroup(g.id), 0) + getTotalPL())}</td>
              </tr>

              {/* ASSETS SECTION */}
              <tr className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'} font-bold`}>
                <td colSpan={companies.length + 2} className={tdClass}>Assets</td>
              </tr>
              {assetGroups.map(group => renderRowWithLedgers(group.name, group.id, (cid) => calculateGroupTotalByCompany(group.id, cid), getTotalForGroup(group.id)))}

              <tr className={`${totalRowClass} border-t-2`}>
                <td className={tdClass}>Total Assets</td>
                {companies.map(c => (
                  <td key={c.id} className={tdRightClass}>{formatINR(assetGroups.reduce((sum, g) => sum + calculateGroupTotalByCompany(g.id, c.id), 0))}</td>
                ))}
                <td className={`${tdRightClass} font-bold text-indigo-600`}>{formatINR(assetGroups.reduce((sum, g) => sum + getTotalForGroup(g.id), 0))}</td>
              </tr>

              {/* Difference Row (if any) */}
              {companies.some(c => (assetGroups.reduce((sum, g) => sum + calculateGroupTotalByCompany(g.id, c.id), 0) - (liabilityGroups.reduce((sum, g) => sum + calculateGroupTotalByCompany(g.id, c.id), 0) + getCompanyProfitLoss(c.id))) !== 0) && (
                <tr className="bg-red-50 text-red-600 text-xs italic">
                  <td className={tdClass}>Difference</td>
                  {companies.map(c => {
                    const liab = liabilityGroups.reduce((sum, g) => sum + calculateGroupTotalByCompany(g.id, c.id), 0) + getCompanyProfitLoss(c.id);
                    const asst = assetGroups.reduce((sum, g) => sum + calculateGroupTotalByCompany(g.id, c.id), 0);
                    return <td key={c.id} className={tdRightClass}>{formatINR(asst - liab)}</td>;
                  })}
                  <td className={tdRightClass}>{formatINR(assetGroups.reduce((sum, g) => sum + getTotalForGroup(g.id), 0) - (liabilityGroups.reduce((sum, g) => sum + getTotalForGroup(g.id), 0) + getTotalPL()))}</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* SCHEDULE OF FIXED ASSETS AT BOTTOM OF CONSOLIDATION */}
      <FixedAssetsSchedule embedded={true} />

    </div>
  );
};

export default ConsolidatedFinancialReport;
