
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractPartyName, detectTransactionType, validateStatementTotals } = require('../utils/bankStatementParser');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.post('/extract-bank-statement', upload.single('statementFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.'
      });
    }

    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Extract detailed bank statement data from the provided image/pdf. Return ONLY a JSON object exactly structured as follows: { "bankName": string, "rows": [{ "Date": string (DD-MM-YYYY or DD/MM/YYYY), "Particulars": string (the extracted party/person/company name), "transactionDetails": string (full raw transaction details), "transactionType": string, "Voucher": string (can be \'payment\', \'receipt\', \'contra\', \'journal\' or null), "Debit": number, "Credit": number, "Balance": string, "Narration": string, "Reference number": string }] }. If any field is not found, use null or 0 (for numbers). Do not include markdown formatting like ```json. The bankName should be the name of the bank found at the top.'
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();

      return res.status(response.status).json({
        error: 'Failed to extract data from Gemini API',
        status: response.status,
        details: errorData
      });
    }

    const data = await response.json();

    const extractedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      return res.status(500).json({
        error: 'No extraction content returned from AI.',
        response: data
      });
    }

    const cleanJson = extractedText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsedData;

    try {
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      return res.status(500).json({
        error: 'Gemini returned invalid JSON.',
        rawResponse: extractedText
      });
    }

    if (parsedData && Array.isArray(parsedData.rows)) {
      parsedData.rows = parsedData.rows.map((row) => {
        const rawDetails = row.transactionDetails || row.Particulars || row.Narration || "";
        const partyName = extractPartyName(rawDetails) || row.Particulars || "";
        return {
          ...row,
          Particulars: partyName,
          name: partyName,
          transactionType: row.transactionType || detectTransactionType(rawDetails),
          transactionDetails: rawDetails,
          Narration: ""
        };
      });

      parsedData.validation = validateStatementTotals(parsedData.rows);
    }

    return res.status(200).json(parsedData);

  } catch (error) {
    // console.error('========== EXTRACTION ERROR ==========');
    // console.error(error);
    // console.error('======================================');

    return res.status(500).json({
      error: 'Internal server error during statement extraction.',
      details: error.message || String(error)
    });
  }
});

module.exports = router;

