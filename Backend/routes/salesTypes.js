const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper to determine system code from ID
function getSystemCodeFromId(id) {
  if (!id) return null;
  const upper = String(id).trim().toUpperCase();
  if (upper === "SALES" || upper === "-1") return "SALES";
  if (upper === "B2C" || upper === "-2") return "B2C";
  if (upper === "B2B" || upper === "-3") return "B2B";
  return null;
}

// =========================================================
// 1. GET ALL SALES TYPES (Predefined System + Custom DB)
// =========================================================
router.get("/", async (req, res) => {
  const { company_id, owner_type, owner_id } = req.query;

  try {
    // 1. Fetch company-specific settings for system types
    let settingsMap = {};
    if (company_id && owner_type && owner_id) {
      try {
        const [settingsRows] = await db.query(
          "SELECT system_code, prefix, suffix, current_no FROM sales_type_settings WHERE company_id = ? AND owner_type = ? AND owner_id = ?",
          [company_id, owner_type, owner_id]
        );
        for (const row of settingsRows) {
          settingsMap[row.system_code.toUpperCase()] = row;
        }
      } catch (e) {
        // Fallback if table not created yet
        console.warn("sales_type_settings lookup skipped:", e.message);
      }
    }

    // 2. Fetch custom sales types from database
    let dbQuery = "SELECT * FROM sales_types";
    let params = [];
    if (company_id && owner_type && owner_id) {
      dbQuery += " WHERE company_id = ? AND owner_type = ? AND owner_id = ?";
      params = [company_id, owner_type, owner_id];
    }
    dbQuery += " ORDER BY id ASC";
    const [rows] = await db.query(dbQuery, params);

    // Filter out duplicate default types stored in DB (e.g. old rows for Sales, B2C, B2B)
    const systemNames = ["SALES", "B2C", "B2B"];
    const legacyFallbacks = {};

    const customRows = rows.filter((r) => {
      const nameUpper = (r.sales_type || "").trim().toUpperCase();
      if (systemNames.includes(nameUpper)) {
        if (!legacyFallbacks[nameUpper]) {
          legacyFallbacks[nameUpper] = r;
        }
        return false; // suppress duplicate row from custom types list
      }
      return true;
    });

    // 3. Construct the predefined system types list
    const salesSetting = settingsMap["SALES"] || legacyFallbacks["SALES"] || {};
    const b2cSetting = settingsMap["B2C"] || legacyFallbacks["B2C"] || {};
    const b2bSetting = settingsMap["B2B"] || legacyFallbacks["B2B"] || {};

    const systemTypes = [
      {
        id: "SALES",
        code: "SALES",
        sales_type: "Sales",
        type: "Sales",
        prefix: salesSetting.prefix ?? "",
        suffix: salesSetting.suffix ?? "",
        current_no: salesSetting.current_no ?? 1,
        isSystem: true,
        canEdit: false,
        canDelete: false,
      },
      {
        id: "B2C",
        code: "B2C",
        sales_type: "B2C",
        type: "Sales",
        prefix: b2cSetting.prefix ?? "",
        suffix: b2cSetting.suffix ?? "",
        current_no: b2cSetting.current_no ?? 1,
        isSystem: true,
        canEdit: true,
        canDelete: false,
      },
      {
        id: "B2B",
        code: "B2B",
        sales_type: "B2B",
        type: "Sales",
        prefix: b2bSetting.prefix ?? "b2b/",
        suffix: b2bSetting.suffix ?? "/26-27",
        current_no: b2bSetting.current_no ?? 1,
        isSystem: true,
        canEdit: true,
        canDelete: false,
      },
    ];

    const combinedData = [
      ...systemTypes,
      ...customRows.map((r) => ({
        ...r,
        code: String(r.id),
        isSystem: false,
        canEdit: true,
        canDelete: true,
      })),
    ];

    res.json({ success: true, data: combinedData });
  } catch (err) {
    console.error("Error fetching sales types:", err);
    res.status(500).json({ success: false, message: "Error fetching sales types" });
  }
});

// =========================================================
// 2. GET SINGLE SALES TYPE (System or DB Custom)
// =========================================================
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const { company_id, owner_type, owner_id } = req.query;

  try {
    const systemCode = getSystemCodeFromId(id);

    if (systemCode) {
      let prefix = systemCode === "B2B" ? "b2b/" : "";
      let suffix = systemCode === "B2B" ? "/26-27" : "";
      let currentNo = 1;

      if (company_id && owner_type && owner_id) {
        try {
          const [settings] = await db.query(
            "SELECT prefix, suffix, current_no FROM sales_type_settings WHERE company_id = ? AND owner_type = ? AND owner_id = ? AND system_code = ?",
            [company_id, owner_type, owner_id, systemCode]
          );
          if (settings.length > 0) {
            prefix = settings[0].prefix || "";
            suffix = settings[0].suffix || "";
            currentNo = settings[0].current_no || 1;
          } else {
            const [legacy] = await db.query(
              "SELECT prefix, suffix, current_no FROM sales_types WHERE company_id = ? AND owner_type = ? AND owner_id = ? AND LOWER(sales_type) = LOWER(?)",
              [company_id, owner_type, owner_id, systemCode]
            );
            if (legacy.length > 0) {
              prefix = legacy[0].prefix || prefix;
              suffix = legacy[0].suffix || suffix;
              currentNo = legacy[0].current_no || 1;
            }
          }
        } catch (e) {
          console.warn("System type setting lookup skipped:", e.message);
        }
      }

      const displayName = systemCode === "SALES" ? "Sales" : systemCode;
      return res.json({
        success: true,
        data: {
          id: systemCode,
          code: systemCode,
          sales_type: displayName,
          type: "Sales",
          prefix,
          suffix,
          current_no: currentNo,
          isSystem: true,
          canEdit: systemCode !== "SALES",
          canDelete: false,
        },
      });
    }

    if (!company_id || !owner_type || !owner_id) {
      return res.status(400).json({
        success: false,
        message: "company_id, owner_type, and owner_id are required",
      });
    }

    const [rows] = await db.query(
      `SELECT * FROM sales_types WHERE id = ? AND company_id = ? AND owner_type = ? AND owner_id = ? LIMIT 1`,
      [id, company_id, owner_type, owner_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Sales type not found" });
    }

    res.json({
      success: true,
      data: {
        ...rows[0],
        code: String(rows[0].id),
        isSystem: false,
        canEdit: true,
        canDelete: true,
      },
    });
  } catch (err) {
    console.error("Error fetching sales type:", err);
    res.status(500).json({ success: false, message: "Error fetching sales type" });
  }
});

// =========================================================
// 3. CREATE CUSTOM SALES TYPE
// =========================================================
router.post("/", async (req, res) => {
  const {
    sales_type,
    prefix,
    suffix,
    current_no,
    company_id,
    owner_type,
    owner_id,
  } = req.body || {};

  if (!sales_type || !sales_type.trim()) {
    return res.status(400).json({
      success: false,
      message: "sales_type is required",
    });
  }

  if (!company_id || !owner_type || !owner_id) {
    return res.status(400).json({
      success: false,
      message: "company_id, owner_type, and owner_id are required",
    });
  }

  const cleanName = sales_type.trim();
  const upperName = cleanName.toUpperCase();

  if (["SALES", "B2C", "B2B"].includes(upperName)) {
    return res.status(400).json({
      success: false,
      message: `"${cleanName}" is a predefined system sales type and cannot be created as a custom type`,
    });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM sales_types WHERE company_id = ? AND owner_type = ? AND owner_id = ? AND LOWER(sales_type) = LOWER(?)",
      [company_id, owner_type, owner_id, cleanName]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Sales type "${cleanName}" already exists for this company`,
      });
    }

    const currentNo = Number.isFinite(Number(current_no)) ? Number(current_no) : 1;

    const [result] = await db.query(
      `INSERT INTO sales_types
        (sales_type, type, prefix, suffix, current_no, company_id, owner_type, owner_id)
       VALUES (?, 'Sales', ?, ?, ?, ?, ?, ?)`,
      [
        cleanName,
        prefix || "",
        suffix || "",
        currentNo,
        company_id,
        owner_type,
        owner_id,
      ]
    );

    return res.json({
      success: true,
      message: "Sales type created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Error creating sales type:", err);
    return res.status(500).json({
      success: false,
      message: "Error creating sales type",
    });
  }
});

// =========================================================
// 4. UPDATE SALES TYPE (System Settings or Custom DB Type)
// =========================================================
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    prefix,
    suffix,
    company_id,
    owner_type,
    owner_id,
    sales_type,
  } = req.body || {};

  const systemCode = getSystemCodeFromId(id);

  if (systemCode === "SALES") {
    return res.status(403).json({
      success: false,
      message: "System default Sales type cannot be modified",
    });
  }

  if (!company_id || !owner_type || !owner_id) {
    return res.status(400).json({
      success: false,
      message: "company_id, owner_type, and owner_id are required",
    });
  }

  try {
    if (systemCode) {
      await db.query(
        `INSERT INTO sales_type_settings (company_id, owner_type, owner_id, system_code, prefix, suffix)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE prefix = VALUES(prefix), suffix = VALUES(suffix)`,
        [
          company_id,
          owner_type,
          owner_id,
          systemCode,
          prefix || "",
          suffix || "",
        ]
      );

      return res.json({
        success: true,
        message: `${systemCode} settings updated successfully`,
      });
    }

    if (!sales_type || !sales_type.trim()) {
      return res.status(400).json({
        success: false,
        message: "sales_type name is required",
      });
    }

    if (["SALES", "B2C", "B2B"].includes(sales_type.trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Cannot rename custom type to a system default name",
      });
    }

    const [dup] = await db.query(
      "SELECT id FROM sales_types WHERE company_id = ? AND owner_type = ? AND owner_id = ? AND LOWER(sales_type) = LOWER(?) AND id != ?",
      [company_id, owner_type, owner_id, sales_type.trim(), id]
    );
    if (dup.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Sales type with this name already exists",
      });
    }

    const [result] = await db.query(
      `UPDATE sales_types
       SET sales_type = ?, prefix = ?, suffix = ?
       WHERE id = ? AND company_id = ? AND owner_type = ? AND owner_id = ?`,
      [
        sales_type.trim(),
        prefix || "",
        suffix || "",
        id,
        company_id,
        owner_type,
        owner_id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sales type not found or not allowed",
      });
    }

    res.json({
      success: true,
      message: "Sales type updated successfully",
    });
  } catch (err) {
    console.error("Error updating sales type:", err);
    res.status(500).json({ success: false, message: "Error updating sales type" });
  }
});

// =========================================================
// 5. DELETE CUSTOM SALES TYPE
// =========================================================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const systemCode = getSystemCodeFromId(id);

  if (systemCode) {
    return res.status(403).json({
      success: false,
      message: "System sales type cannot be deleted",
    });
  }

  try {
    const [refs] = await db.query(
      "SELECT COUNT(*) AS count FROM sales_vouchers WHERE sales_type_id = ?",
      [id]
    );
    if (refs[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete sales type because it is referenced in existing sales vouchers",
      });
    }

    const [result] = await db.query("DELETE FROM sales_types WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sales type not found",
      });
    }

    res.json({ success: true, message: "Sales type deleted successfully" });
  } catch (err) {
    console.error("Error deleting sales type:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting sales type",
    });
  }
});

module.exports = router;
