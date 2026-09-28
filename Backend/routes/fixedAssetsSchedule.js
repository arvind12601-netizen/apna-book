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

    // 3. Fetch ledgers belonging to fixed asset groups
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
      ORDER BY l.name`,
      [company_id, owner_type, owner_id, ...groupIdsArray]
    );

    // 4. Cutoff Date: Sept 30 of the financial year
    let startD = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 3, 1);
    let fyYear = startD.getFullYear();
    if (startD.getMonth() < 3) {
      fyYear -= 1;
    }
    const cutoffDateStr = `${fyYear}-09-30 23:59:59`;

    // 5. Fetch transactions for each fixed asset ledger in voucher_entries
    const ledgerIds = ledgers.map(l => l.id);
    let transactionsMap = {};

    if (ledgerIds.length > 0) {
      const lPlaceholders = ledgerIds.map(() => '?').join(',');
      let entriesQuery = `
        SELECT 
          ve.ledger_id,
          ve.entry_type,
          CAST(ve.amount AS DECIMAL(15,2)) AS amount,
          vm.date
         FROM voucher_entries ve
         JOIN voucher_main vm ON vm.id = ve.voucher_id
         WHERE ve.ledger_id IN (${lPlaceholders})
           AND vm.company_id = ?
      `;
      const params = [...ledgerIds, company_id];

      if (startDate) {
        entriesQuery += ` AND vm.date >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        entriesQuery += ` AND vm.date <= ?`;
        params.push(endDate);
      }

      const [entries] = await db.query(entriesQuery, params);

      entries.forEach(e => {
        const lid = e.ledger_id;
        if (!transactionsMap[lid]) {
          transactionsMap[lid] = {
            additionBefore: 0,
            additionAfter: 0,
            salesBefore: 0,
            salesAfter: 0
          };
        }
        const amt = parseFloat(e.amount) || 0;
        const entryDate = new Date(e.date);
        const isBeforeCutoff = entryDate <= new Date(cutoffDateStr);

        if (e.entry_type === 'debit') {
          if (isBeforeCutoff) {
            transactionsMap[lid].additionBefore += amt;
          } else {
            transactionsMap[lid].additionAfter += amt;
          }
        } else if (e.entry_type === 'credit') {
          if (isBeforeCutoff) {
            transactionsMap[lid].salesBefore += amt;
          } else {
            transactionsMap[lid].salesAfter += amt;
          }
        }
      });
    }

    const scheduleData = ledgers.map((l, index) => {
      const tx = transactionsMap[l.id] || {
        additionBefore: 0,
        additionAfter: 0,
        salesBefore: 0,
        salesAfter: 0
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
        groupName: l.group_name || 'Fixed Assets'
      };
    });

    res.json({
      success: true,
      scheduleData,
      financialYear: `${fyYear}-${fyYear + 1}`,
      cutoffDate: `${fyYear}-09-30`
    });

  } catch (err) {
    console.error('Error fetching fixed assets schedule:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
