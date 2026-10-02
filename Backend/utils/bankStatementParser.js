/**
 * Utility functions for Bank Statement Extraction & Party Name Parsing (Backend)
 */

function normalizeTransactionText(text) {
  if (!text) return "";
  return String(text)
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectTransactionType(details) {
  if (!details) return "UNKNOWN";
  const upper = String(details).toUpperCase();
  if (/\bRTGS\b/.test(upper)) return "RTGS";
  if (/\bNEFT\b/.test(upper)) return "NEFT";
  if (/\bIMPS\b/.test(upper)) return "IMPS";
  if (/\bUPI\b/.test(upper)) return "UPI";
  if (/\bCLG\b|\bCLEARING\b/.test(upper)) return "CLG";
  if (/\bTRF\b|\bTRANSFER\b|\bFT\b/.test(upper)) return "TRF";
  if (/\bCHQ\b|\bCHEQUE\b/.test(upper)) return "CHEQUE";
  if (/\bATM\b/.test(upper)) return "ATM";
  if (/\bPOS\b/.test(upper)) return "POS";
  if (/\bINF\b|\bINB\b/.test(upper)) return "NET BANKING";
  return "OTHER";
}

function getNameScore(name) {
  let score = name.length;
  // Penalize digits/numbers in party names
  if (/\d/.test(name)) score -= 20;
  if (name.includes(" ")) score += 10;
  if (/[A-Z]\.[A-Z]/i.test(name) || /\b[A-Z]\s+[A-Z]\b/i.test(name)) score += 15;
  if (
    /TRADERS|CORP|CONSTRUCTIONS|MULTICOM|ENTERPRISES|SERVICES|SOLUTIONS|PVT|LTD|LIMITED|COMPANY|INDUSTRIES|WORKS|STORE|STORES|AGENCY|AGENCIES/i.test(
      name
    )
  ) {
    score += 20;
  }
  return score;
}

function extractPartyName(transactionDetails) {
  if (!transactionDetails) return "";

  const normalized = normalizeTransactionText(transactionDetails);

  let segments = normalized.split("/").map((s) => s.trim()).filter(Boolean);

  if (segments.length <= 1) {
    if (normalized.includes(" - ")) {
      segments = normalized.split(" - ").map((s) => s.trim()).filter(Boolean);
    } else if (normalized.includes(":")) {
      segments = normalized.split(":").map((s) => s.trim()).filter(Boolean);
    }
  }

  const TYPE_CODES = new Set([
    "NEFT",
    "RTGS",
    "IMPS",
    "TRF",
    "CLG",
    "UPI",
    "INF",
    "FT",
    "ACH",
    "DD",
    "INB",
    "MOB",
    "POS",
    "ATM",
    "INT",
    "SK",
    "P2A",
    "WDL",
    "DEP",
    "TR",
    "TP",
    "BY",
    "TO",
    "TRANSFER",
    "CLEARING",
    "PAYMENT",
    "RECEIPT",
    "CREDIT",
    "DEBIT",
  ]);

  const BANK_PATTERNS = [
    /HSBC(\s+BANK)?/i,
    /ICICI(\s+BANK)?/i,
    /HDFC(\s+BANK)?/i,
    /STATE\s+BANK(\s+OF\s+INDIA)?/i,
    /\bSBI\b/i,
    /BANK\s+OF\s+INDIA/i,
    /\bBOI\b/i,
    /PUNJAB\s+NATIONAL\s+BANK/i,
    /\bPNB\b/i,
    /BANK\s+OF\s+BARODA/i,
    /\bBOB\b/i,
    /CANARA(\s+BANK)?/i,
    /UNION\s+BANK(\s+OF\s+INDIA)?/i,
    /INDIAN\s+BANK/i,
    /ALLAHABA(D)?(\s+BANK)?/i,
    /AXIS(\s+BANK)?/i,
    /KOTAK(\s+MAHINDRA)?(\s+BANK)?/i,
    /IDBI(\s+BANK)?/i,
    /YES\s+BANK/i,
    /FEDERAL\s+BANK/i,
    /INDUSIND(\s+BANK)?/i,
    /BANDHAN\s+BANK/i,
    /CENTRAL\s+BANK(\s+OF\s+INDIA)?/i,
    /UCO\s+BANK/i,
    /\bBANK\b/i,
  ];

  const NOISE_PATTERNS = [
    /^BY\s+CHQ$/i,
    /^CHQ$/i,
    /^CHEQUE$/i,
    /^FUNDTRAN$/i,
    /^FUND\s+TRAN$/i,
    /^FUND\s+TRANSFER$/i,
    /^ATTN$/i,
    /^ATTEN$/i,
    /^INVOICE/i,
    /^VENDOR/i,
    /^REF/i,
    /^NO$/i,
    /^NUM$/i,
    /^\d{4}NEFT/i,
    /^MP\s+TRADERS/i,
  ];

  const filteredSegments = [];

  for (const seg of segments) {
    const cleanSeg = seg.trim();
    const upperSeg = cleanSeg.toUpperCase();

    if (TYPE_CODES.has(upperSeg)) continue;
    if (/^\d+$/.test(cleanSeg)) continue;

    // Filter numeric ref / account / phone numbers (e.g. 91995592...)
    const numericOnly = cleanSeg.replace(/[^0-9]/g, "");
    if (numericOnly.length >= 5 && /^\d/.test(cleanSeg) && numericOnly.length >= cleanSeg.replace(/\./g, "").length / 2) {
      continue;
    }

    if (
      /^[A-Z0-9]{8,35}$/i.test(cleanSeg) &&
      /\d/.test(cleanSeg) &&
      /[A-Z]/i.test(cleanSeg)
    ) {
      if (!cleanSeg.includes(" ") && !cleanSeg.includes(".")) {
        continue;
      }
    }

    if (/^\d{3,}[A-Z]+/i.test(cleanSeg)) continue;

    let isBank = false;
    for (const bp of BANK_PATTERNS) {
      if (bp.test(cleanSeg)) {
        const withoutBank = cleanSeg.replace(bp, "").trim();
        if (!withoutBank || withoutBank.length < 3) {
          isBank = true;
          break;
        }
      }
    }
    if (isBank) continue;

    let isNoise = false;
    for (const np of NOISE_PATTERNS) {
      if (np.test(cleanSeg)) {
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    if (!/[A-Za-z0-9]/.test(cleanSeg)) continue;

    filteredSegments.push(cleanSeg);
  }

  if (filteredSegments.length === 1) {
    return filteredSegments[0];
  }

  if (filteredSegments.length > 1) {
    const best = filteredSegments.reduce((acc, curr) => {
      const accScore = getNameScore(acc);
      const currScore = getNameScore(curr);
      return currScore > accScore ? curr : acc;
    }, filteredSegments[0]);
    return best;
  }

  let fallback = normalized;
  fallback = fallback.replace(
    /^(RTGS|NEFT|IMPS|TRF|CLG|UPI|INF|FT)\s*[\/\-:]\s*/i,
    ""
  );
  fallback = fallback.replace(
    /[\/\-:]\s*(BY CHQ|FundTran|ATTN|Invoice).*$/i,
    ""
  );
  return fallback.trim();
}

function validateStatementTotals(rows) {
  let totalDebit = 0;
  let totalCredit = 0;
  let lastBalance = null;

  (rows || []).forEach((r) => {
    totalDebit += Number(r.debit || r.Debit || 0);
    totalCredit += Number(r.credit || r.Credit || 0);
    const balVal = r.balance !== undefined ? r.balance : r.Balance;
    if (balVal !== undefined && balVal !== null && balVal !== "") {
      const b =
        typeof balVal === "number"
          ? balVal
          : parseFloat(String(balVal).replace(/,/g, ""));
      if (!isNaN(b)) {
        lastBalance = b;
      }
    }
  });

  return {
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    closingBalance: lastBalance,
    rowCount: (rows || []).length,
  };
}

module.exports = {
  normalizeTransactionText,
  detectTransactionType,
  extractPartyName,
  validateStatementTotals,
};
