import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, CheckCircle, Upload } from 'lucide-react';

interface ReportComingSoonProps {
  title: string;
  category?: string;
}

const ReportComingSoon: React.FC<ReportComingSoonProps> = ({ title, category = 'Report' }) => {
  const { theme } = useAppContext();
  const navigate = useNavigate();

  const isVsReport = title.toLowerCase().includes('vs');

  // Split title for vs reports
  const titleParts = title.split(/vs/i);
  const leftSideName = titleParts[0]?.trim() || 'Books Data';
  const rightSideName = titleParts[1]?.trim() ? `VS ${titleParts[1].trim()}` : 'VS Target Data';

  return (
    <div className={`pt-[56px] px-4 min-h-[calc(100vh-64px)] pb-12 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2 border-b border-gray-200 dark:border-gray-800 pb-4">
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
              <FileText className="text-red-600 dark:text-red-400" size={28} />
              {title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {category} {isVsReport ? '• (50% - 50% Split Partition Layout)' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/app/reports')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to All Reports
        </button>
      </div>

      {isVsReport ? (
        <div className="space-y-6">
          {/* 50% - 50% Summary Header Partition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Left Partition (50%) */}
            <div
              className={`p-5 rounded-xl border relative overflow-hidden ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-950/40 to-gray-800 border-blue-900/60'
                  : 'bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950">
                  Left Partition (50%)
                </span>
                <span className="text-xs font-semibold text-gray-500">{leftSideName}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">📘 {leftSideName}</h3>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                0 Records
              </div>
              <p className="text-xs text-gray-500 mt-1">Primary source ledger records for matching</p>
            </div>

            {/* Right Partition (50%) */}
            <div
              className={`p-5 rounded-xl border relative overflow-hidden ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-teal-950/40 to-gray-800 border-teal-900/60'
                  : 'bg-gradient-to-r from-teal-50 to-white border-teal-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950">
                  Right Partition (50%)
                </span>
                <span className="text-xs font-semibold text-gray-500">{rightSideName}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">📊 {rightSideName}</h3>
              <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-2">
                0 Records
              </div>
              <p className="text-xs text-gray-500 mt-1">Target statement data for reconciliation</p>
            </div>
          </div>

          {/* 50% - 50% Split Partition Containers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Partition Box (50%) */}
            <div
              className={`p-6 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-900 mb-4 flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-900 dark:text-blue-200">
                    📘 {leftSideName} (50% Partition)
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    Side A
                  </span>
                </div>
                <div className="py-8 text-center text-gray-500 text-sm">
                  No data loaded for {leftSideName} partition.
                </div>
              </div>
            </div>

            {/* Right Partition Box (50%) */}
            <div
              className={`p-6 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded-lg border border-teal-200 dark:border-teal-900 mb-4 flex items-center justify-between">
                  <span className="font-bold text-sm text-teal-900 dark:text-teal-200">
                    📊 {rightSideName} (50% Partition)
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-teal-100 text-teal-800 rounded">
                    Side B
                  </span>
                </div>
                <div className="py-8 text-center text-gray-500 text-sm">
                  No statement loaded for {rightSideName} partition.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Non-VS Coming Soon Card */
        <div className="flex flex-col items-center justify-center pt-8 pb-16">
          <div
            className={`p-8 sm:p-12 rounded-2xl flex flex-col items-center max-w-lg w-full shadow-lg border transition-all ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-950/40 mb-6">
              <Clock size={48} className="text-red-600 dark:text-red-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-center">{title}</h2>
            <div className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-xs rounded-full uppercase tracking-wider mb-4">
              Coming Soon
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm leading-relaxed mb-6">
              We are actively developing the <strong>{title}</strong> report module. This report will be available soon with comprehensive features.
            </p>
            <button
              onClick={() => navigate('/app/reports')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to All Reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportComingSoon;
