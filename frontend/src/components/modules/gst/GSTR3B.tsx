import React, { useState, useEffect } from "react";
import { useAppContext } from "../../../context/AppContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Printer,
  Filter,
  Upload,
  Save,
  Calculator,
  FileText,
  X,
} from "lucide-react";

// Helper function to get month name
const getMonthName = (month: string): string => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[parseInt(month) - 1] || "";
};

const GSTR3B: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // get company Information
  const companyId = localStorage.getItem("company_id");
  const ownerType = localStorage.getItem("supplier");
  const ownerId = localStorage.getItem(
    ownerType === "employee" ? "employee_id" : "user_id"
  );

  // New state variables for enhanced features
  const [showDraftPreview, setShowDraftPreview] = useState(false);
  const [showPreviewMode, setShowPreviewMode] = useState(false);
  const [showArnModal, setShowArnModal] = useState(false);
  const [generatedArn, setGeneratedArn] = useState("");
  const [draftData, setDraftData] = useState<any | null>(null);

  //basic information
  const [basicInfo, setBasicInfo] = useState({
    gstin: "",
    legalName: "",
    tradeName: "",
    arn: "",
  });

  useEffect(() => {
    const companyRaw = localStorage.getItem("companyInfo");

    if (!companyRaw) return;

    try {
      const company = JSON.parse(companyRaw);

      setBasicInfo({
        gstin: company.gst_number || "",
        legalName: company.name || "",
        tradeName: company.name || "",
        arn: "",
      });
    } catch (error) {
      console.error("Company data parse error", error);
    }
  }, []);

  const [threepointone, setThreepointone] = useState({
    a: {
      taxableValue: 0,
      integratedTax: 0,
      centralTax: 0,
      stateUTTax: 0,
      cess: 0,
    },
    b: {
      taxableValue: 0,
    },
    c: {
      taxableValue: 0,
    },
    d: {
      taxableValue: 0,
      integratedTax: 0,
      centralTax: 0,
      stateUTTax: 0,
      cess: 0,
    },
  });

  // const filterledger = 'Nill Rated' ,'Exempted','Zero Rated'

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        if (!companyId || !ownerType || !ownerId) return;

        const res = await fetch(
          `${import.meta.env.VITE_API_URL
          }/api/gstr3b?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`
        );

        const json = await res.json();
        if (!isMounted) return;

        const a = json?.a;
        const b = json?.b;
        const c = json?.c;
        const d = json?.d;

        setThreepointone({
          a: {
            taxableValue: a?.taxable_value ?? 0,
            integratedTax: a?.integrated_tax ?? 0,
            centralTax: a?.central_tax ?? 0,
            stateUTTax: a?.state_tax ?? 0,
            cess: 0,
          },
          b: {
            taxableValue: b?.total ?? 0,
          },
          c: {
            taxableValue: (c?.nil?.total ?? 0) + (c?.exempted?.total ?? 0),
          },
          d: {
            taxableValue: d?.taxable_value ?? 0,
            integratedTax: d?.integrated_tax ?? 0,
            centralTax: d?.central_tax ?? 0,
            stateUTTax: d?.state_tax ?? 0,
            cess: 0,
          },
        });
      } catch (err) {
        console.error("GSTR3B error", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const [purchaseData, setPurchaseData] = useState({
    a: "",
    b: "",
    c: {
      taxableValue: "",
      centralTax: "",
      state_tax: "",
      integrated_tax: "",
    },
    d: "",
    e: {
      integratedTax: '',
      centralTax: '',
      stateTax: ''
    },
    f: {
      nillExampt: '',
      nongst: ''
    },
  });
  // purchase Data get
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL
          }/api/gstr3b/purchase?company_id=${companyId}&owner_type=${ownerType}&owner_id=${ownerId}`
        );
        const data = await res.json();
        console.log("purchase data", data);

        setPurchaseData((prev) => ({
          ...prev,
          c: {
            taxableValue: data.c?.taxable_value,
            centralTax: data.c?.central_tax,
            state_tax: data.c?.state_tax,
            integrated_tax: data.c?.integrated_tax,
          },
          e: {
            integratedTax: data.e?.integrated_tax,
            centralTax: data.e?.central_tax,
            stateTax: data.e?.state_tax
          },
          f: {
            nillExampt: data.f?.a,
            nongst: data.f?.b
          }
        }));
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, []);


  // date create
  const formatDateTimeIST = () => {
    return new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };


  // json download
  const handleDownloadJSON = () => {
    const payload = {
      returnType: "GSTR-3B",

      company: {
        companyId,
        ownerType,
        ownerId,
      },

      basicInfo: {
        gstin: basicInfo.gstin,
        legalName: basicInfo.legalName,
        tradeName: basicInfo.tradeName,
      },

      section3_1: {
        outwardTaxable: threepointone.a,
        zeroRated: threepointone.b,
        nilExempted: threepointone.c,
        reverseCharge: threepointone.d,
      },

      purchaseITC: {
        reverseChargeITC: {
          igst: threepointone.d.integratedTax,
          cgst: threepointone.d.centralTax,
          sgst: threepointone.d.stateUTTax,
          cess: threepointone.d.cess,
        },
        otherITC: purchaseData.e,
      },

      exemptAndNonGST: {
        exemptNil: purchaseData.f?.nillExampt,
        nonGST: purchaseData.f?.nongst,
      },

      generatedAt: formatDateTimeIST(),
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR3B_${basicInfo.gstin}_${Date.now()}.json`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="pt-[56px] px-4 ">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          title="Back to Reports"
          type="button"
          onClick={() => navigate("/app/gst")}
          className={`mr-4 p-2 rounded-full ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
            }`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">GSTR-3B Return</h1>
        <div className="ml-auto flex space-x-2">
          <button
            title="Load Draft"
            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
          >
            <FileText size={18} />
          </button>
          <button
            title="Save Draft"
            type="button"
            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
          >
            <Save size={18} />
          </button>
          <button
            title="Calculate"
            className={`p-2 rounded-md ${isCalculating ? "animate-pulse" : ""
              } ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"}`}
          >
            <Calculator size={18} />
          </button>
          <button
            title="Toggle Filters"
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
          >
            <Filter size={18} />
          </button>
          <button
            title="Upload Report"
            type="button"
            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
          >
            <Upload size={18} />
          </button>
          <button
            title="Print Report"
            type="button"
            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
          >
            <Printer size={18} />
          </button>
          <button
            title="Download Report"
            type="button"
            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div
          className={`p-4 mb-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h3 className="font-semibold mb-4">Return Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Month</label>
              <select
                title="Select Month"
                // onChange={(e) => updateReturnPeriod("month", e.target.value)}
                className={`w-full p-2 rounded border ${theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
                  }`}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option
                    key={i + 1}
                    value={(i + 1).toString().padStart(2, "0")}
                  >
                    {getMonthName((i + 1).toString().padStart(2, "0"))}
                  </option>
                ))}
              </select>
            </div>


          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information Section */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                GSTIN of Supplier *
              </label>
              <input
                type="text"
                value={basicInfo.gstin}
                readOnly
                className="w-full p-2 rounded border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Legal Name of Registered Person *
              </label>
              <input
                type="text"
                value={basicInfo.legalName}
                readOnly
                className="w-full p-2 rounded border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Trade Name (if any)
              </label>
              <input
                type="text"
                value={basicInfo.tradeName}
                readOnly
                className="w-full p-2 rounded border"
              />
            </div>

          </div>
        </div>

        {/* Section 3.1 - Outward Supplies */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">
            3.1 Details of Outward Supplies and inward supplies liable to
            reverse charge
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b-2 border-gray-300"
                    }`}
                >
                  <th className="px-4 py-3 text-left">Nature of Supply</th>
                  <th className="px-4 py-3 text-right">Taxable Value</th>
                  <th className="px-4 py-3 text-right">Integrated Tax</th>
                  <th className="px-4 py-3 text-right">Central Tax</th>
                  <th className="px-4 py-3 text-right">State/UT Tax</th>
                  <th className="px-4 py-3 text-right">Cess</th>
                </tr>
              </thead>

              <tbody>
                {/* Row A */}

                <tr>
                  <td className="px-4 py-3">
                    (a) Outward taxable supplies (other than zero rated, nil
                    rated and exempted)
                  </td>

                  {/* Taxable Value */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone?.a?.taxableValue ?? 0}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* Integrated Tax */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone?.a?.integratedTax ?? 0}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* Central Tax */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone?.a?.centralTax ?? 0}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* State / UT Tax */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone?.a?.stateUTTax ?? 0}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* Cess */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone?.a?.cess ?? 0}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* Row B */}
                <tr>
                  <td className="px-4 py-3">
                    (b) Outward taxable supplies (zero rated)
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.b.taxableValue}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* Row C */}
                <tr>
                  <td className="px-4 py-3">
                    (c) Other outward supplies (Nil rated, exempted)
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.c.taxableValue}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* Row D */}
                <tr>
                  <td className="px-4 py-3">
                    (d) Inward supplies (liable to reverse charge)
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.taxableValue}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.integratedTax}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.centralTax}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.stateUTTax}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.cess}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3.1.1 - Amendment to outward supplies */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">
            3.1.1 Amendment to outward supplies reported in returns of earlier
            tax periods
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b-2 border-gray-300"
                    }`}
                >
                  <th className="px-4 py-3 text-left">Particulars</th>
                  <th className="px-4 py-3 text-right">Taxable Value</th>
                  <th className="px-4 py-3 text-right">Integrated Tax</th>
                  <th className="px-4 py-3 text-right">Central Tax</th>
                  <th className="px-4 py-3 text-right">State/UT Tax</th>
                  <th className="px-4 py-3 text-right">Cess</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="px-4 py-3">Amendment to outward supplies</td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3.2 - Of the supplies shown in 3.1(a) above, details of inter-State supplies */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">
            3.2 Of the supplies shown in 3.1(a) above, details of inter-State
            supplies made to unregistered persons, composition taxable person
            and UIN holders
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b-2 border-gray-300"
                    }`}
                >
                  <th className="px-4 py-3 text-left">Nature of Supply</th>
                  <th className="px-4 py-3 text-right">Taxable Value</th>
                  <th className="px-4 py-3 text-right">Integrated Tax</th>
                  <th className="px-4 py-3 text-right">Central Tax</th>
                  <th className="px-4 py-3 text-right">State/UT Tax</th>
                  <th className="px-4 py-3 text-right">Cess</th>
                </tr>
              </thead>

              <tbody>
                {/* Unregistered Persons */}
                <tr>
                  <td className="px-4 py-3">
                    Supplies made to Unregistered Persons
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* Composition Taxable Persons */}
                <tr>
                  <td className="px-4 py-3">
                    Supplies made to Composition Taxable Persons
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4 - Eligible ITC */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">4. Eligible ITC</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b-2 border-gray-300"
                    }`}
                >
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-right">Integrated Tax</th>
                  <th className="px-4 py-3 text-right">Central Tax</th>
                  <th className="px-4 py-3 text-right">State/UT Tax</th>
                  <th className="px-4 py-3 text-right">Cess</th>
                </tr>
              </thead>

              <tbody>
                {/* Header Row */}
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b border-gray-200"
                    }`}
                >
                  <td className="px-4 py-3 font-bold">
                    (A) ITC Available (whether in full or part)
                  </td>
                  <td className="px-4 py-3 text-center font-bold" colSpan={4}>
                    -
                  </td>
                </tr>

                {/* (1) Import of goods */}
                <tr>
                  <td className="px-4 py-3">(1) Import of goods</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* (2) Import of services */}
                <tr>
                  <td className="px-4 py-3">(2) Import of services</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* (3) Reverse charge */}
                <tr>
                  <td className="px-4 py-3">
                    (3) Inward supplies liable to reverse charge (other than 1 &
                    2 above)
                  </td>

                  {/* IGST */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.integratedTax}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* CGST */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.centralTax}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* SGST */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.stateUTTax}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>

                  {/* CESS */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={threepointone.d.cess}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* (4) ISD */}
                <tr>
                  <td className="px-4 py-3">(4) Inward supplies from ISD</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* (5) Others */}
                <tr>
                  <td className="px-4 py-3">(5) All other ITC</td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={Number(purchaseData.e?.integratedTax)}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={Number(purchaseData.e?.centralTax)}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={Number(purchaseData.e?.stateTax)}
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      readOnly
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4.1 - ITC Reversed (Option B) */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">4.1 ITC Reversed</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b-2 border-gray-300"
                    }`}
                >
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-right">Integrated Tax</th>
                  <th className="px-4 py-3 text-right">Central Tax</th>
                  <th className="px-4 py-3 text-right">State/UT Tax</th>
                  <th className="px-4 py-3 text-right">Cess</th>
                </tr>
              </thead>

              <tbody>
                {/* Header Row */}
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b border-gray-200"
                    }`}
                >
                  <td className="px-4 py-3 font-bold">(B) ITC Reversed</td>
                  <td className="px-4 py-3 text-center font-bold" colSpan={4}>
                    -
                  </td>
                </tr>

                {/* (1) Rule 42 & 43 */}
                <tr>
                  <td className="px-4 py-3">
                    (1) As per Rule 42 &amp; 43 of CGST Rules
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* (2) Others */}
                <tr>
                  <td className="px-4 py-3">(2) Others</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5 - Values of exempt, nil-rated and non-GST inward supplies */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">
            5. Values of exempt, nil-rated and non-GST inward supplies
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exempt / Nil Rated */}
            <div>
              <label className="block text-sm font-medium mb-2">
                From a supplier under composition scheme, Exempt and Nil rated
                supply
              </label>
              <input
                type="number"
                value={purchaseData.f?.nillExampt}
                readOnly
                className="w-full p-2 text-right border rounded"
              />
            </div>

            {/* Non-GST */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Non GST supply
              </label>
              <input
                type="number"
                value={purchaseData.f?.nongst}
                readOnly
                className="w-full p-2 text-right border rounded"
              />
            </div>
          </div>
        </div>

        {/* Section 6.1 - Interest & Late Fee */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">
            6.1 Interest & Late fee for previous tax period
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* IGST */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Integrated Tax
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full p-2 text-right border rounded"
              />
            </div>

            {/* CGST */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Central Tax
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full p-2 text-right border rounded"
              />
            </div>

            {/* SGST */}
            <div>
              <label className="block text-sm font-medium mb-2">
                State/UT Tax
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full p-2 text-right border rounded"
              />
            </div>

            {/* CESS */}
            <div>
              <label className="block text-sm font-medium mb-2">Cess</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full p-2 text-right border rounded"
              />
            </div>
          </div>
        </div>

        {/* Section 6.2 - Payment of Tax */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">6.2 Payment of Tax</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`${theme === "dark"
                    ? "border-b border-gray-700"
                    : "border-b-2 border-gray-300"
                    }`}
                >
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Interest</th>
                  <th className="px-4 py-3 text-right">Penalty</th>
                  <th className="px-4 py-3 text-right">Fees</th>
                  <th className="px-4 py-3 text-right">Others</th>
                </tr>
              </thead>

              <tbody>
                {/* IGST */}
                <tr
                  className={
                    theme === "dark"
                      ? "border-b border-gray-700"
                      : "border-b border-gray-200"
                  }
                >
                  <td className="px-4 py-3">IGST</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* CGST */}
                <tr
                  className={
                    theme === "dark"
                      ? "border-b border-gray-700"
                      : "border-b border-gray-200"
                  }
                >
                  <td className="px-4 py-3">CGST</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* SGST */}
                <tr
                  className={
                    theme === "dark"
                      ? "border-b border-gray-700"
                      : "border-b border-gray-200"
                  }
                >
                  <td className="px-4 py-3">SGST</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>

                {/* CESS */}
                <tr
                  className={
                    theme === "dark"
                      ? "border-b border-gray-700"
                      : "border-b border-gray-200"
                  }
                >
                  <td className="px-4 py-3">CESS</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-full p-2 text-right border rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Tax Liability Calculation */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">Tax Liability Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Net Tax Liability */}
            <div>
              <h3 className="font-semibold mb-4">Net Tax Liability</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Outward Tax</span>
                  <span className="font-mono text-lg">₹ 0.00</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Inward Tax</span>
                  <span className="font-mono text-lg">₹ 0.00</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Eligible ITC</span>
                  <span className="font-mono text-lg text-green-600">
                    - ₹ 0.00
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total ITC Reversed</span>
                  <span className="font-mono text-lg text-red-600">
                    + ₹ 0.00
                  </span>
                </div>

                <hr
                  className={`my-3 ${theme === "dark" ? "border-gray-600" : "border-gray-300"
                    }`}
                />

                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Net Tax Liability</span>
                  <span className="font-mono text-blue-600">₹ 0.00</span>
                </div>
              </div>
            </div>

            {/* Backup & Liability */}
            <div>
              <h3 className="font-semibold mb-4">Tax Backup & Liability</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Tax Backup Available</span>
                  <span className="font-mono text-lg">₹ 0.00</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Current Liability</span>
                  <span className="font-mono text-lg">₹ 0.00</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Interest & Penalty</span>
                  <span className="font-mono text-lg">₹ 0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Section */}
        <div
          className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow"
            }`}
        >
          <h2 className="text-xl font-bold mb-4">Verification</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                title="Select verification date"
                className={`w-full p-2 rounded border ${theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
                  }`}
              />
            </div>

            {/* Authorized Signatory */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Name of Authorized Signatory *
              </label>
              <input
                type="text"
                placeholder="Enter signatory name"
                className={`w-full p-2 rounded border ${theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
                  }`}
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Designation / Status *
              </label>
              <select
                title="Select designation or status"
                className={`w-full p-2 rounded border ${theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
                  }`}
              >
                <option value="">Select Designation</option>
                <option value="Proprietor">Proprietor</option>
                <option value="Partner">Partner</option>
                <option value="Company Secretary">Company Secretary</option>
                <option value="Chartered Accountant">
                  Chartered Accountant
                </option>
                <option value="Authorized Signatory">
                  Authorized Signatory
                </option>
              </select>
            </div>

            {/* Place */}
            <div>
              <label className="block text-sm font-medium mb-2">Place</label>
              <input
                type="text"
                placeholder="Enter place"
                className={`w-full p-2 rounded border ${theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
                  }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className={`mt-10 flex justify-end border-t pt-6
  ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}
      >
        <button
          type="button"
          onClick={handleDownloadJSON}
          className="flex items-center gap-2 px-6 py-2 rounded-md
      bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <Download size={18} />
          Download JSON
        </button>
      </div>



    </div>
  );
};

export default GSTR3B;
