import React, { useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Swal from "sweetalert2";
import type { SalesType } from "../../../types";

type FormState = Omit<SalesType, "id" | "created_at" | "updated_at" | "type">;

const SalesTypeForm: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const companyId = localStorage.getItem("company_id");
  const ownerType = localStorage.getItem("supplier");
  const ownerId = localStorage.getItem(
    ownerType === "employee" ? "employee_id" : "user_id"
  );

  const [isSystemType, setIsSystemType] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    sales_type: "",
    prefix: "",
    suffix: "",
    current_no: 1,
  });

  useEffect(() => {
    if (!isEditMode || !id) return;

    const fetchOne = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/sales-types/${id}?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`
        );
        const json = await res.json();
        if (!res.ok || !json?.success)
          throw new Error(json?.message || "Not found");

        const s: SalesType = json.data;
        setIsSystemType(Boolean(s.isSystem));
        setFormData({
          sales_type: s.sales_type || "",
          prefix: s.prefix || "",
          suffix: s.suffix || "",
          current_no: Number(s.current_no ?? 1),
        });
      } catch (err) {
        console.error("Error fetching sales type:", err);
        Swal.fire("Error", "Sales type not found", "error").then(() => {
          navigate("/app/masters/sales-types");
        });
      }
    };

    fetchOne();
  }, [id, isEditMode, navigate, companyId, ownerType, ownerId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "current_no" ? Number(value || 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId || !ownerType || !ownerId) {
      Swal.fire("Error", "Missing authentication information", "error");
      return;
    }

    const payload = {
      ...formData,
      type: "Sales",
      company_id: companyId,
      owner_type: ownerType,
      owner_id: ownerId,
    };

    const url = isEditMode
      ? `${import.meta.env.VITE_API_URL}/api/sales-types/${id}`
      : `${import.meta.env.VITE_API_URL}/api/sales-types`;

    const method = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        Swal.fire("Error", json?.message || "Something went wrong", "error");
        return;
      }

      Swal.fire(
        "Success",
        isEditMode ? "Sales type updated" : "Sales type created",
        "success"
      ).then(() => {
        navigate("/app/masters/sales-types");
      });
    } catch (err) {
      console.error("Save sales type error:", err);
      Swal.fire("Error", "Server error. Please try again later.", "error");
    }
  };

  return (
    <div className="pt-[56px] px-4">
      <div className="flex items-center mb-6">
        <button
          title="Back to Sales Types"
          onClick={() => navigate("/app/masters/sales-types")}
          className={`mr-4 p-2 rounded-full ${
            theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
          }`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit" : "Create"} Sales Voucher Type
        </h1>
      </div>

      <div
        className={`p-6 rounded-lg ${
          theme === "dark" ? "bg-gray-800" : "bg-white shadow"
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="sales_type"
              >
                Sales Type * {isSystemType && <span className="text-xs text-gray-400">(System Default - Name is fixed)</span>}
              </label>
              <input
                id="sales_type"
                name="sales_type"
                value={formData.sales_type}
                onChange={handleChange}
                required
                readOnly={isSystemType}
                placeholder="e.g., Retail Sale"
                className={`w-full p-2 rounded border ${
                  isSystemType
                    ? theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-gray-400"
                      : "bg-gray-100 border-gray-300 text-gray-500"
                    : theme === "dark"
                    ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                    : "bg-white border-gray-300 focus:border-blue-500"
                } outline-none transition-colors`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="type">
                Type *
              </label>
              <input
                id="type"
                name="type"
                value={"Sales"}
                required
                readOnly
                placeholder="e.g., sales"
                className={`w-full p-2 rounded border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white opacity-70"
                    : "bg-gray-100 border-gray-300 opacity-70"
                } outline-none transition-colors`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="prefix"
              >
                Prefix
              </label>
              <input
                id="prefix"
                name="prefix"
                value={formData.prefix}
                onChange={handleChange}
                placeholder="e.g., SLS"
                className={`w-full p-2 rounded border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                    : "bg-white border-gray-300 focus:border-blue-500"
                } outline-none transition-colors`}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="suffix"
              >
                Suffix
              </label>
              <input
                id="suffix"
                name="suffix"
                value={formData.suffix}
                onChange={handleChange}
                placeholder="e.g., /24-25"
                className={`w-full p-2 rounded border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                    : "bg-white border-gray-300 focus:border-blue-500"
                } outline-none transition-colors`}
              />
            </div>

            {!isEditMode && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="current_no"
                >
                  Current No
                </label>
                <input
                  type="number"
                  id="current_no"
                  name="current_no"
                  value={formData.current_no}
                  onChange={handleChange}
                  min={1}
                  className={`w-full p-2 rounded border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                      : "bg-white border-gray-300 focus:border-blue-500"
                  } outline-none transition-colors`}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-2">
            <button
              type="button"
              onClick={() => navigate("/app/masters/sales-types")}
              className={`px-4 py-2 rounded ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-200 hover:bg-gray-300"
              } transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex items-center px-4 py-2 rounded ${
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } transition-colors`}
            >
              <Save size={18} className="mr-1" />
              {isEditMode ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesTypeForm;
