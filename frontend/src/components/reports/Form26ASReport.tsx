import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react';

const Form26ASReport: React.FC = () => {
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
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={28} />
              26AS Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Tax Credit Statement (Form 26AS) - Income Tax
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
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950/40 mb-6">
            <Clock size={52} className="text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-center">
            26AS Report
          </h2>

          <div className="px-4 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs rounded-full uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Coming Soon
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-center text-sm sm:text-base leading-relaxed mb-6">
            We are actively developing the <strong>Form 26AS Tax Credit Statement</strong> module. Soon you will be able to view, reconcile, and import your TDS credits, TCS credits, advance tax payments, and tax refund details directly within ApnaBook.
          </p>

          <div className={`w-full p-4 rounded-xl mb-6 text-xs sm:text-sm ${
            theme === 'dark' ? 'bg-gray-700/50 text-gray-300 border border-gray-600' : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            <div className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Upcoming Features:</div>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Direct import & matching of Form 26AS statement</li>
              <li>TDS / TCS Credit reconciliation with Ledger entries</li>
              <li>Advance Tax & Self-Assessment Tax verification</li>
              <li>Auto-detection of missing tax credits</li>
            </ul>
          </div>

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

export default Form26ASReport;
