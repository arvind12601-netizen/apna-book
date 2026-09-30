import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react';

const TaxStatusReport: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className={`pt-[56px] px-4 min-h-[calc(100vh-64px)] ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/app/reports')}
            title="Back to Reports"
            className={`p-2 rounded-lg mr-3 transition-colors ${
              theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-white hover:bg-gray-100 text-gray-700 border shadow-sm'
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-red-600 dark:text-red-400" size={28} />
              Tax Status
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Tax Compliance & Filing Status
            </p>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="flex flex-col items-center justify-center pt-8 pb-16">
        <div
          className={`p-8 sm:p-12 rounded-2xl flex flex-col items-center max-w-xl w-full shadow-lg border transition-all ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="p-4 rounded-full bg-red-100 dark:bg-red-950/40 mb-6">
            <Clock size={52} className="text-red-600 dark:text-red-400 animate-pulse" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-center">
            Tax Status
          </h2>

          <div className="px-4 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-xs rounded-full uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Coming Soon
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-center text-sm sm:text-base leading-relaxed mb-6">
            We are actively developing the <strong>Tax Status</strong> module. Soon you will be able to track real-time tax compliance, filing deadlines, GST/TDS status, and tax liabilities directly within ApnaBook.
          </p>

          <button
            onClick={() => navigate('/app/reports')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxStatusReport;
