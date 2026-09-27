import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronDown, ChevronUp, Layers, Eye, EyeOff } from 'lucide-react';
import { allSystemGroups } from '../../constants/ledgerGroups';

interface Ledger {
  id: number;
  name: string;
  groupId: number;
  openingBalance: number;
  balanceType: 'debit' | 'credit';
  closingBalance: number;
  groupName: string;
}

interface LedgerGroup {
  id: number;
  name: string;
  type: string | null;
  parent: number | null;
}

interface HierarchyLedgerNode {
  id: number;
  name: string;
  amount: number;
}

interface HierarchySubgroupNode {
  id: number;
  name: string;
  amount: number;
  ledgers: HierarchyLedgerNode[];
}

interface HierarchyGroupNode {
  id: number;
  name: string;
  amount: number;
  subgroups: HierarchySubgroupNode[];
  directLedgers: HierarchyLedgerNode[];
}

interface ScheduleNode {
  id: number;
  name: string;
  title: string;
  annexure: string;
  amount: number;
  groups: HierarchyGroupNode[];
  directLedgers: HierarchyLedgerNode[];
}

const PRIMARY_SCHEDULES = [
  { id: -4, name: 'Capital Account', title: 'SCHEDULE OF CAPITAL ACCOUNT', annexure: 'ANNEXURE-A' },
  { id: -6, name: 'Current Liabilities', title: 'SCHEDULE OF CURRENT LIABILITIES', annexure: 'ANNEXURE-B' },
  { id: -13, name: 'Loans (Liability)', title: 'SCHEDULE OF LOAN (LIABILITY)', annexure: 'ANNEXURE-C' },
  { id: -9, name: 'Fixed Assets', title: 'SCHEDULE OF FIXED ASSETS', annexure: 'ANNEXURE-D' },
  { id: -5, name: 'Current Assets', title: 'SCHEDULE OF CURRENT ASSETS', annexure: 'ANNEXURE-E' },
];

export const ScheduleHierarchy: React.FC = () => {
  const { theme } = useAppContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schedulesData, setSchedulesData] = useState<ScheduleNode[]>([]);
  const [collapsedSchedules, setCollapsedSchedules] = useState<Record<number, boolean>>({});

  const companyId = localStorage.getItem('company_id') || localStorage.getItem('active_company_id') || '';
  const rawOwnerType = localStorage.getItem('supplier') || '';
  const employeeId = localStorage.getItem('employee_id');
  const userId = localStorage.getItem('user_id') || '';

  const ownerType = (rawOwnerType === 'ca' || rawOwnerType === 'ca_employee' || rawOwnerType === 'new_ca' || rawOwnerType === 'employee' || employeeId)
    ? 'employee'
    : (rawOwnerType || 'employee');

  const ownerId = (rawOwnerType === 'ca' || rawOwnerType === 'ca_employee' || rawOwnerType === 'new_ca' || rawOwnerType === 'employee' || employeeId)
    ? (employeeId || userId)
    : userId;

  const toggleSchedule = (schedId: number) => {
    setCollapsedSchedules(prev => ({
      ...prev,
      [schedId]: !prev[schedId],
    }));
  };

  const collapseAll = () => {
    const next: Record<number, boolean> = {};
    schedulesData.forEach(s => {
      next[s.id] = true;
    });
    setCollapsedSchedules(next);
  };

  const expandAll = () => {
    setCollapsedSchedules({});
  };

  useEffect(() => {
    const fetchHierarchyData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const bsUrl = `${import.meta.env.VITE_API_URL}/api/balance-sheet?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`;
        const res = await fetch(bsUrl);
        if (!res.ok) throw new Error('Failed to load schedule hierarchy data');
        const data = await res.json();

        // 1. Deduplicate ledgers by ID
        const fetchedLedgersMap = new Map<number, Ledger>();
        (data.ledgers || []).forEach((l: any) => {
          const id = Number(l.id);
          if (!fetchedLedgersMap.has(id)) {
            fetchedLedgersMap.set(id, {
              id,
              name: (l.name || '').trim(),
              groupId: Number(l.group_id || l.groupId),
              openingBalance: parseFloat(l.opening_balance || l.openingBalance) || 0,
              balanceType: l.balance_type || l.balanceType,
              closingBalance: parseFloat(l.closing_balance || l.closingBalance) || 0,
              groupName: l.group_name || l.groupName,
            });
          }
        });
        const fetchedLedgers = Array.from(fetchedLedgersMap.values());

        const fetchedGroups: LedgerGroup[] = (data.ledgerGroups || []).map((g: any) => ({
          id: Number(g.id),
          name: (g.name || '').trim(),
          type: g.type || null,
          parent: g.parent ? Number(g.parent) : null,
        }));

        const systemGroupsMapped = allSystemGroups.map(g => ({
          id: g.id,
          name: (g.name || '').trim(),
          parent: g.parent || null,
          type: g.nature || null,
        }));

        const allGroupsMap = new Map<number, LedgerGroup>();
        [...systemGroupsMapped, ...fetchedGroups].forEach(g => {
          allGroupsMap.set(g.id, g);
        });
        const allGroups = Array.from(allGroupsMap.values());

        let debitCreditMap: Record<number, { debit: number; credit: number }> = {};
        if (fetchedLedgers.length > 0) {
          const ledgerIds = fetchedLedgers.map(l => l.id).join(',');
          const groupUrl = `${import.meta.env.VITE_API_URL}/api/group?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}&ledgerIds=${ledgerIds}`;
          const gRes = await fetch(groupUrl);
          if (gRes.ok) {
            const gData = await gRes.json();
            if (gData.success && gData.data) {
              debitCreditMap = gData.data;
            }
          }
        }

        const getLedgerAmount = (l: Ledger): number => {
          const o = l.openingBalance || 0;
          const debit = debitCreditMap[l.id]?.debit || 0;
          const credit = debitCreditMap[l.id]?.credit || 0;
          const openingSigned = l.balanceType === 'debit' ? o : -o;
          const closingSigned = openingSigned + debit - credit;
          return Math.abs(closingSigned);
        };

        // Helper to deduplicate ledger nodes by normalized name and sum amounts
        const mergeLedgersByName = (nodeList: HierarchyLedgerNode[]): HierarchyLedgerNode[] => {
          const map = new Map<string, HierarchyLedgerNode>();
          nodeList.forEach(item => {
            const key = item.name.trim().toLowerCase();
            if (map.has(key)) {
              const existing = map.get(key)!;
              existing.amount += item.amount;
            } else {
              map.set(key, { id: item.id, name: item.name.trim(), amount: item.amount });
            }
          });
          return Array.from(map.values());
        };

        const constructedSchedules: ScheduleNode[] = PRIMARY_SCHEDULES.map(sched => {
          // Direct child groups under schedule
          const directGroups = allGroups.filter(g => Number(g.parent) === sched.id);

          // Group direct child groups by normalized name to prevent duplicate group headers
          const groupNameMap = new Map<string, LedgerGroup[]>();
          directGroups.forEach(g => {
            const key = g.name.trim().toLowerCase();
            if (!groupNameMap.has(key)) {
              groupNameMap.set(key, []);
            }
            groupNameMap.get(key)!.push(g);
          });

          // Direct ledgers under Schedule (deduplicated by name)
          const rawScheduleLedgers = fetchedLedgers
            .filter(l => Number(l.groupId) === sched.id)
            .map(l => ({ id: l.id, name: l.name, amount: getLedgerAmount(l) }));
          const directScheduleLedgers = mergeLedgersByName(rawScheduleLedgers);

          const groupNodes: HierarchyGroupNode[] = [];

          groupNameMap.forEach((matchingGroups) => {
            const displayName = matchingGroups[0].name.trim();
            const groupIds = matchingGroups.map(g => g.id);

            // Find all subgroups under ANY of these group IDs
            const subgroupsRaw = allGroups.filter(sg => groupIds.includes(Number(sg.parent)));

            // Group subgroups by normalized subgroup name
            const sgNameMap = new Map<string, LedgerGroup[]>();
            subgroupsRaw.forEach(sg => {
              const key = sg.name.trim().toLowerCase();
              if (!sgNameMap.has(key)) {
                sgNameMap.set(key, []);
              }
              sgNameMap.get(key)!.push(sg);
            });

            // Direct ledgers under ANY of these group IDs (merged by name)
            const rawGroupLedgers = fetchedLedgers
              .filter(l => groupIds.includes(Number(l.groupId)))
              .map(l => ({ id: l.id, name: l.name, amount: getLedgerAmount(l) }));
            const directGroupLedgers = mergeLedgersByName(rawGroupLedgers);

            const subgroupNodes: HierarchySubgroupNode[] = [];

            sgNameMap.forEach((matchingSubgroups) => {
              const sgDisplayName = matchingSubgroups[0].name.trim();
              const sgIds = matchingSubgroups.map(sg => sg.id);

              const rawSgLedgers = fetchedLedgers
                .filter(l => sgIds.includes(Number(l.groupId)))
                .map(l => ({ id: l.id, name: l.name, amount: getLedgerAmount(l) }));
              const sgLedgers = mergeLedgersByName(rawSgLedgers);

              const sgTotal = sgLedgers.reduce((sum, l) => sum + l.amount, 0);

              subgroupNodes.push({
                id: sgIds[0],
                name: sgDisplayName,
                amount: sgTotal,
                ledgers: sgLedgers,
              });
            });

            const subTotal = subgroupNodes.reduce((sum, sg) => sum + sg.amount, 0);
            const directLedgersTotal = directGroupLedgers.reduce((sum, l) => sum + l.amount, 0);
            const groupTotal = subTotal + directLedgersTotal;

            groupNodes.push({
              id: groupIds[0],
              name: displayName,
              amount: groupTotal,
              subgroups: subgroupNodes,
              directLedgers: directGroupLedgers,
            });
          });

          const groupsTotal = groupNodes.reduce((sum, g) => sum + g.amount, 0);
          const directScheduleTotal = directScheduleLedgers.reduce((sum, l) => sum + l.amount, 0);
          const scheduleTotal = groupsTotal + directScheduleTotal;

          return {
            id: sched.id,
            name: sched.name,
            title: sched.title,
            annexure: sched.annexure,
            amount: scheduleTotal,
            groups: groupNodes,
            directLedgers: directScheduleLedgers,
          };
        });

        setSchedulesData(constructedSchedules);
      } catch (err: any) {
        console.error('Schedule hierarchy fetch error:', err);
        setError(err.message || 'Failed to load schedule hierarchy');
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchyData();
  }, [companyId, ownerType, ownerId]);

  const formatAmount = (amt: number) =>
    amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
        <p className="text-sm font-semibold">Loading Schedule Annexures...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} text-red-500 text-sm font-semibold`}>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-10">
      {/* Top Header & Global Controls */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3">
          <Layers className="text-blue-600 dark:text-blue-400" size={24} />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Audit Schedule Annexures</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Hierarchical Schedule → Group → Subgroup → Ledger Annexures
            </p>
          </div>
        </div>

        {/* Global Expand / Collapse Control Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={expandAll}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 border transition-all ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <Eye size={14} />
            <span>Expand All (Sabhi Kholein)</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 border transition-all ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <EyeOff size={14} />
            <span>Collapse All (Sabhi Band Karein)</span>
          </button>
        </div>
      </div>

      {/* List of Schedules */}
      {schedulesData.map(schedule => {
        const isCollapsed = !!collapsedSchedules[schedule.id];

        return (
          <div key={schedule.id} className="space-y-2">
            {/* Header Line: Clickable to Expand / Collapse */}
            <div
              onClick={() => toggleSchedule(schedule.id)}
              className="flex justify-between items-baseline font-bold tracking-wide text-sm md:text-base border-b-2 border-gray-900 dark:border-gray-100 pb-1.5 cursor-pointer select-none group"
            >
              <div className="flex items-center space-x-2 uppercase text-gray-900 dark:text-gray-100 font-extrabold tracking-wider">
                <span className="p-1 rounded group-hover:bg-blue-100 dark:group-hover:bg-gray-800 transition-colors">
                  {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
                <span>{schedule.title} AS ON 31ST MARCH, 2024</span>
                {isCollapsed && (
                  <span className="normal-case text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold ml-2">
                    [ Band / Closed - ₹{formatAmount(schedule.amount)} ]
                  </span>
                )}
              </div>
              <span className="uppercase text-gray-900 dark:text-gray-100 font-extrabold tracking-wider">
                {schedule.annexure}
              </span>
            </div>

            {/* Formal Audit Annexure Table (Hidden when collapsed) */}
            {!isCollapsed && (
              <table className={`w-full text-sm border-collapse border-2 ${
                theme === 'dark' ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-900 bg-white text-gray-900'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${
                    theme === 'dark' ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-900 bg-gray-100 text-gray-900'
                  }`}>
                    <th className="text-left px-4 py-2 font-black uppercase tracking-wider w-3/4 border-r border-gray-900 dark:border-gray-600">
                      PARTICULARS
                    </th>
                    <th className="text-right px-4 py-2 font-black uppercase tracking-wider w-1/4">
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                  {schedule.groups.length === 0 && schedule.directLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-gray-500 italic text-center">
                        No records found under this schedule.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Direct Ledgers under Schedule */}
                      {schedule.directLedgers.map(l => (
                        <tr key={`sched-dl-${l.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-1.5 pl-6 font-semibold border-r border-gray-900 dark:border-gray-600">
                            {l.name}
                          </td>
                          <td className="px-4 py-1.5 text-right font-mono font-semibold">
                            {formatAmount(l.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* Level 1: Groups */}
                      {schedule.groups.map(group => (
                        <React.Fragment key={group.id}>
                          {/* Group Header Row */}
                          <tr className={`font-bold ${theme === 'dark' ? 'bg-gray-800/70 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                            <td className="px-4 py-2 font-black uppercase border-r border-gray-900 dark:border-gray-600">
                              {group.name}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-black text-base">
                              {formatAmount(group.amount)}
                            </td>
                          </tr>

                          {/* Direct Ledgers under Group (No subgroup) */}
                          {group.directLedgers.map(l => (
                            <tr key={`grp-dl-${l.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-1.5 pl-8 border-r border-gray-900 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold">
                                {l.name}
                              </td>
                              <td className="px-4 py-1.5 text-right font-mono font-semibold">
                                {formatAmount(l.amount)}
                              </td>
                            </tr>
                          ))}

                          {/* Level 2: Subgroups */}
                          {group.subgroups.map(subgroup => (
                            <React.Fragment key={subgroup.id}>
                              {/* Subgroup Header Row */}
                              <tr className={`font-bold ${theme === 'dark' ? 'bg-gray-800/40 text-gray-200' : 'bg-gray-100/60 text-gray-800'}`}>
                                <td className="px-4 py-1.5 pl-8 font-black border-r border-gray-900 dark:border-gray-600">
                                  {subgroup.name}
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono font-black">
                                  {formatAmount(subgroup.amount)}
                                </td>
                              </tr>

                              {/* Level 3: Ledgers under Subgroup */}
                              {subgroup.ledgers.map(l => (
                                <tr key={`sg-l-${l.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <td className="px-4 py-1.5 pl-12 border-r border-gray-900 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold">
                                    {l.name}
                                  </td>
                                  <td className="px-4 py-1.5 text-right font-mono font-semibold">
                                    {formatAmount(l.amount)}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </tbody>

                {/* Total Footer Row */}
                <tfoot>
                  <tr className={`border-t-2 border-gray-900 dark:border-gray-600 ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
                  }`}>
                    <td className="px-4 py-2 text-right font-black italic uppercase border-r border-gray-900 dark:border-gray-600 pr-6">
                      TOTAL:-
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-black text-base border-t-2 border-b-4 border-double border-gray-900 dark:border-gray-100">
                      {formatAmount(schedule.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleHierarchy;
