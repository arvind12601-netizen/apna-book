/**
 * Utility functions for Intelligent Bank Statement Parsing and Extraction.
 * Handles normalization, multiline joining, transaction type detection,
 * party name extraction, reference removal, and total validation.
 */

/**
 * Normalizes transaction text by replacing newlines and extra spaces.
 */
export const normalizeTransactionText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Detects the transaction type from transaction details.
 */
export const detectTransactionType = (details: string): string => {
  if (!details) return "UNKNOWN";
  const upper = details.toUpperCase();
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
};

/**
 * Helper to score candidate party names based on likelihood of being a real person/company name.
 */
const getNameScore = (name: string): number => {
  let score = name.length;
  // Reward multi-word names (e.g. MANOHAR SINGH)
  if (name.includes(" ")) score += 10;
  // Reward initials with dots or spaces e.g. P.K, M S, R K
  if (/[A-Z]\.[A-Z]/i.test(name) || /\b[A-Z]\s+[A-Z]\b/i.test(name)) score += 15;
  // Reward company terms
  if (
    /TRADERS|CORP|CONSTRUCTIONS|MULTICOM|ENTERPRISES|SERVICES|SOLUTIONS|PVT|LTD|LIMITED|COMPANY|INDUSTRIES|WORKS|STORE|STORES|AGENCY|AGENCIES/i.test(
      name
    )
  ) {
    score += 20;
  }
  return score;
};

/**
 * Intelligently extracts the Party/Transaction Name from a Transaction Details string.
 * Handles formats for NEFT, RTGS, IMPS, TRF, CLG, UPI, and common bank statement formats.
 * Removes transaction types, UTR/ref numbers, cheque numbers, account numbers, bank names, branch info, and keywords.
 * Preserves spaces, dots, initials (e.g., M S, P.K, R K) and company suffixes (e.g. CORP L).
 */
export const extractPartyName = (transactionDetails: string): string => {
  if (!transactionDetails) return "";

  const normalized = normalizeTransactionText(transactionDetails);

  // Split into segments by slashes first
  let segments = normalized.split("/").map((s) => s.trim()).filter(Boolean);

  if (segments.length <= 1) {
    // If no slashes, attempt splitting by dash or colon
    if (normalized.includes(" - ")) {
      segments = normalized.split(" - ").map((s) => s.trim()).filter(Boolean);
    } else if (normalized.includes(":")) {
      segments = normalized.split(":").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Known transaction types and short codes
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

  // Bank name regex patterns
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

  // Noise keyword regex patterns
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

  const filteredSegments: string[] = [];

  for (const seg of segments) {
    const cleanSeg = seg.trim();
    const upperSeg = cleanSeg.toUpperCase();

    // A. Check type codes
    if (TYPE_CODES.has(upperSeg)) continue;

    // B. Check pure numeric (e.g. cheque numbers, branch codes like 3252, 020580, 030826)
    if (/^\d+$/.test(cleanSeg)) continue;

    // Filter numeric ref / account / phone numbers (e.g. 91995592...)
    const numericOnly = cleanSeg.replace(/[^0-9]/g, "");
    if (
      numericOnly.length >= 5 &&
      /^\d/.test(cleanSeg) &&
      numericOnly.length >= cleanSeg.replace(/\./g, "").length / 2
    ) {
      continue;
    }

    // C. Check UTR / Reference numbers
    // Alphanumeric strings of length >= 8 containing digits and uppercase letters
    if (
      /^[A-Z0-9]{8,35}$/i.test(cleanSeg) &&
      /\d/.test(cleanSeg) &&
      /[A-Z]/i.test(cleanSeg)
    ) {
      if (!cleanSeg.includes(" ") && !cleanSeg.includes(".")) {
        continue;
      }
    }

    // Check UTR-like strings starting with digits e.g. 0001NEFT - MP TRADERS-502000
    if (/^\d{3,}[A-Z]+/i.test(cleanSeg)) continue;

    // D. Check Bank Names
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

    // E. Check Noise Keywords
    let isNoise = false;
    for (const np of NOISE_PATTERNS) {
      if (np.test(cleanSeg)) {
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    // F. Check if empty or only non-alphanumeric chars
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

  // Fallback: clean raw string directly
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
};

/**
 * Filters out UTR numbers, bank names, branch info, and reference numbers.
 */
export const removeBankAndRefInfo = (details: string): string => {
  return extractPartyName(details);
};

/**
 * Validates transaction alignment and summary totals.
 */
export const validateStatementTotals = (
  rows: Array<{ debit?: number; credit?: number; balance?: number | string }>
) => {
  let totalDebit = 0;
  let totalCredit = 0;
  let lastBalance: number | null = null;

  rows.forEach((r) => {
    totalDebit += Number(r.debit || 0);
    totalCredit += Number(r.credit || 0);
    if (r.balance !== undefined && r.balance !== null && r.balance !== "") {
      const b =
        typeof r.balance === "number"
          ? r.balance
          : parseFloat(String(r.balance).replace(/,/g, ""));
      if (!isNaN(b)) {
        lastBalance = b;
      }
    }
  });

  return {
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    closingBalance: lastBalance,
    rowCount: rows.length,
  };
};
