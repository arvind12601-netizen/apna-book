const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/fixed-assets-schedule
router.get('/api/fixed-assets-schedule', async (req, res) => {
  const { company_id, owner_type, owner_id, startDate, endDate } = req.query;

  if (!company_id || !owner_type || !owner_id) {
    return res.status(400).json({ error: 'Missing tenant parameters: company_id, owner_type, owner_id required' });
  }

  try {
    // 1. Fetch custom ledger_groups
    const [ledgerGroups] = await db.query(
      `SELECT id, name, type, parent FROM ledger_groups
       WHERE (company_id = ? AND owner_type = ? AND owner_id = ?)
          OR (company_id = ? AND company_id > 0)
          OR (company_id = 0 AND owner_type = 'employee' AND owner_id = 0)`,
      [company_id, owner_type, owner_id, company_id]
    );

    // 2. Identify all Group IDs that belong under Fixed Assets (-9)
    const fixedAssetGroupIds = new Set([-9]);

    let added = true;
    while (added) {
      added = false;
      for (const g of ledgerGroups) {
        const gId = Number(g.id);
        const pId = g.parent ? Number(g.parent) : null;
        const gName = String(g.name || '').toLowerCase();
        const gType = String(g.type || '').toLowerCase();

        if (
          !fixedAssetGroupIds.has(gId) &&
          ((pId !== null && fixedAssetGroupIds.has(pId)) ||
            gName.includes('fixed asset') ||
            gType.includes('fixed-asset') ||
            gType === 'fixedassets')
        ) {
          fixedAssetGroupIds.add(gId);
          added = true;
        }
      }
    }

    // 3. Fetch ledgers belonging to fixed asset groups (excluding expense/depreciation ledgers)
    const groupIdsArray = Array.from(fixedAssetGroupIds);
    const placeholders = groupIdsArray.map(() => '?').join(',');

    const [ledgers] = await db.query(
      `SELECT 
        l.id, 
        l.name, 
        l.group_id,
        CAST(l.opening_balance AS DECIMAL(15,2)) AS opening_balance,
        l.balance_type,
        l.closing_balance,
        lg.name AS group_name,
        lg.type AS group_type
      FROM ledgers l
      LEFT JOIN ledger_groups lg ON l.group_id = lg.id
      WHERE (l.company_id = ? AND ((l.owner_type = ? AND l.owner_id = ?) OR l.owner_id = 0))
        AND (l.group_id IN (${placeholders}) OR LOWER(lg.name) LIKE '%fixed asset%' OR LOWER(l.name) LIKE '%fixed asset%')
        AND LOWER(l.name) NOT LIKE '%depreciation%'
        AND LOWER(COALESCE(lg.name, '')) NOT LIKE '%expense%'
      ORDER BY l.name`,
      [company_id, owner_type, owner_id, ...groupIdsArray]
    );

    // 4. Cutoff Date: Sept 30 of the financial year (timezone-safe parsing)
    let fyYear;
    if (startDate && typeof startDate === 'string') {
      const parts = startDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      fyYear = m < 4 ? y - 1 : y;
    } else {
      const now = new Date();
      fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    }
    const cutoffDateStr = `${fyYear}-09-30`;

    // 5. Fetch transactions for each fixed asset ledger across ALL voucher types
    const ledgerIds = ledgers.map(l => l.id);
    let transactionsMap = {};

    if (ledgerIds.length > 0) {
      const lPlaceholders = ledgerIds.map(() => '?').join(',');

      let subQueries = [];
      let params = [];

      const addDateFilters = (sql, tableAlias) => {
        let q = sql;
        if (startDate) {
          q += ` AND ${tableAlias}.date >= ?`;
          params.push(startDate);
        }
        if (endDate) {
          q += ` AND ${tableAlias}.date <= ?`;
          params.push(endDate);
        }
        return q;
      };

      // 5.1 voucher_main (Payment, Receipt, Contra, Journal)
      let q1 = `
        SELECT ve.ledger_id, ve.entry_type, CAST(ve.amount AS DECIMAL(15,2)) AS amount, DATE_FORMAT(vm.date, '%Y-%m-%d') AS date_str, vm.id AS voucher_id, 'voucher_main' AS source
        FROM voucher_entries ve
        JOIN voucher_main vm ON vm.id = ve.voucher_id
        WHERE ve.ledger_id IN (${lPlaceholders}) AND vm.company_id = ?
      `;
      params.push(...ledgerIds, company_id);
      q1 = addDateFilters(q1, 'vm');
      subQueries.push(q1);

      // 5.2 purchase_vouchers (Accounting mode & General entries)
      let q2 = `
        SELECT ve.ledger_id, ve.entry_type, CAST(ve.amount AS DECIMAL(15,2)) AS amount, DATE_FORMAT(pv.date, '%Y-%m-%d') AS date_str, pv.id AS voucher_id, 'purchase' AS source
        FROM voucher_entries ve
        JOIN purchase_vouchers pv ON pv.id = ve.voucher_id
        WHERE ve.ledger_id IN (${lPlaceholders}) AND pv.company_id = ?
      `;
      params.push(...ledgerIds, company_id);
      q2 = addDateFilters(q2, 'pv');
      subQueries.push(q2);

      // 5.3 purchase_vouchers (Item Invoice mode direct purchaseLedgerId)
      let q3 = `
        SELECT pv.purchaseLedgerId AS ledger_id, 'debit' AS entry_type, CAST(COALESCE(pv.subtotal, pv.total) AS DECIMAL(15,2)) AS amount, DATE_FORMAT(pv.date, '%Y-%m-%d') AS date_str, pv.id AS voucher_id, 'purchase' AS source
        FROM purchase_vouchers pv
        WHERE pv.purchaseLedgerId IN (${lPlaceholders}) AND pv.company_id = ?
          AND NOT EXISTS (SELECT 1 FROM voucher_entries ve WHERE ve.voucher_id = pv.id AND ve.ledger_id = pv.purchaseLedgerId)
      `;
      params.push(...ledgerIds, company_id);
      q3 = addDateFilters(q3, 'pv');
      subQueries.push(q3);

      // 5.4 sales_vouchers (Accounting mode & General entries)
      let q4 = `
        SELECT ve.ledger_id, ve.entry_type, CAST(ve.amount AS DECIMAL(15,2)) AS amount, DATE_FORMAT(sv.date, '%Y-%m-%d') AS date_str, sv.id AS voucher_id, 'sales' AS source
        FROM voucher_entries ve
        JOIN sales_vouchers sv ON sv.id = ve.voucher_id
        WHERE ve.ledger_id IN (${lPlaceholders}) AND sv.company_id = ?
      `;
      params.push(...ledgerIds, company_id);
      q4 = addDateFilters(q4, 'sv');
      subQueries.push(q4);

      // 5.5 sales_vouchers (Item Invoice mode direct salesLedgerId)
      let q5 = `
        SELECT sv.salesLedgerId AS ledger_id, 'credit' AS entry_type, CAST(COALESCE(sv.subtotal, sv.total) AS DECIMAL(15,2)) AS amount, DATE_FORMAT(sv.date, '%Y-%m-%d') AS date_str, sv.id AS voucher_id, 'sales' AS source
        FROM sales_vouchers sv
        WHERE sv.salesLedgerId IN (${lPlaceholders}) AND sv.company_id = ?
          AND NOT EXISTS (SELECT 1 FROM voucher_entries ve WHERE ve.voucher_id = sv.id AND ve.ledger_id = sv.salesLedgerId)
      `;
      params.push(...ledgerIds, company_id);
      q5 = addDateFilters(q5, 'sv');
      subQueries.push(q5);

      // 5.6 debit_note_vouchers
      let q6 = `
        SELECT ve.ledger_id, ve.entry_type, CAST(ve.amount AS DECIMAL(15,2)) AS amount, DATE_FORMAT(dnv.date, '%Y-%m-%d') AS date_str, dnv.id AS voucher_id, 'debit_note' AS source
        FROM voucher_entries ve
        JOIN debit_note_vouchers dnv ON dnv.id = ve.voucher_id
        WHERE ve.ledger_id IN (${lPlaceholders}) AND dnv.company_id = ?
      `;
      params.push(...ledgerIds, company_id);
      q6 = addDateFilters(q6, 'dnv');
      subQueries.push(q6);

      // 5.7 credit_vouchers
      let q7 = `
        SELECT ve.ledger_id, ve.entry_type, CAST(ve.amount AS DECIMAL(15,2)) AS amount, DATE_FORMAT(cv.date, '%Y-%m-%d') AS date_str, cv.id AS voucher_id, 'credit_note' AS source
        FROM voucher_entries ve
        JOIN credit_vouchers cv ON cv.id = ve.voucher_id
        WHERE ve.ledger_id IN (${lPlaceholders}) AND cv.company_id = ?
      `;
      params.push(...ledgerIds, company_id);
      q7 = addDateFilters(q7, 'cv');
      subQueries.push(q7);

      const fullEntriesQuery = subQueries.join(' UNION ALL ');
      const [entries] = await db.query(fullEntriesQuery, params);

      for (const e of entries) {
        const lid = e.ledger_id;
        if (!transactionsMap[lid]) {
          transactionsMap[lid] = {
            additionBefore: 0,
            additionAfter: 0,
            salesBefore: 0,
            salesAfter: 0,
            voucherDepreciation: 0
          };
        }
        const amt = parseFloat(e.amount) || 0;
        const entryDateStr = e.date_str ? e.date_str.slice(0, 10) : '';
        const isBeforeCutoff = entryDateStr <= cutoffDateStr;

        if (e.entry_type === 'debit') {
          if (isBeforeCutoff) {
            transactionsMap[lid].additionBefore += amt;
          } else {
            transactionsMap[lid].additionAfter += amt;
          }
        } else if (e.entry_type === 'credit') {
          let isDep = false;
          if (e.source === 'voucher_main' && e.voucher_id) {
            const [opp] = await db.query(
              `SELECT ve2.ledger_id, l.name AS opp_name, lg.name AS opp_group_name
               FROM voucher_entries ve2
               LEFT JOIN ledgers l ON l.id = ve2.ledger_id
               LEFT JOIN ledger_groups lg ON lg.id = l.group_id
               WHERE ve2.voucher_id = ? AND ve2.ledger_id != ?`,
              [e.voucher_id, lid]
            );
            isDep = opp.some(o => 
              (o.opp_name || '').toLowerCase().includes('depreciation') || 
              (o.opp_group_name || '').toLowerCase().includes('depreciation')
            );
          }

          if (isDep) {
            transactionsMap[lid].voucherDepreciation += amt;
          } else {
            if (isBeforeCutoff) {
              transactionsMap[lid].salesBefore += amt;
            } else {
              transactionsMap[lid].salesAfter += amt;
            }
          }
        }
      }
    }

    const scheduleData = ledgers.map((l, index) => {
      const tx = transactionsMap[l.id] || {
        additionBefore: 0,
        additionAfter: 0,
        salesBefore: 0,
        salesAfter: 0,
        voucherDepreciation: 0
      };

      const openingVal = parseFloat(l.opening_balance) || 0;
      const opening = l.balance_type === 'credit' ? -openingVal : openingVal;

      return {
        srNo: index + 1,
        ledgerId: l.id,
        name: l.name,
        openingBalance: opening,
        additionBefore: tx.additionBefore,
        additionAfter: tx.additionAfter,
        salesBefore: tx.salesBefore,
        salesAfter: tx.salesAfter,
        voucherDepreciation: tx.voucherDepreciation,
        groupName: l.group_name || 'Fixed Assets'
      };
    });

    res.json({
      success: true,
      scheduleData,
      financialYear: `${fyYear}-${fyYear + 1}`,
      cutoffDate: cutoffDateStr
    });

  } catch (err) {
    console.error('Error fetching fixed assets schedule:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
