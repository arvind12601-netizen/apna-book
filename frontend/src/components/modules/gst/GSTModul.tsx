import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, BarChart2, Calculator, Settings, 
  Download, Upload, CheckCircle, AlertCircle 
} from 'lucide-react';

const GSTModule: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();

  const gstFeatures = [
    {
      title: 'GST Returns',
      items: [
        { icon: <FileText size={20} />, name: 'GSTR-1', path: '/app/gst/gstr-1' },
        { icon: <FileText size={20} />, name: 'GSTR-2A', path: '/app/gst/gstr-2a' },
        { icon: <FileText size={20} />, name: 'GSTR-3B', path: '/app/gst/gstr-3b' },
        { icon: <FileText size={20} />, name: 'GSTR-9', path: '/app/gst/gstr-9' },
        { icon: <FileText size={20} />, name: 'GSTR-9C', path: '/app/gst/gstr-9c' },
        { icon: <FileText size={20} />, name: 'Reconciliation', path: '/app/gst/reconciliation' },
        { icon: <FileText size={20} />, name: 'E-Way-Bill', path: '/app/gst/e-way-bill' },
        
      ]
    },
    {
      title: 'GST Configuration',
      items: [
        { icon: <Calculator size={20} />, name: 'GST Calculator', path: '/app/gst/calculator' }
      ]
    },
    {
      title: 'Import/Export',
      items: [
        { icon: <Upload size={20} />, name: 'Import Data', path: '/app/gst/import' },
        { icon: <Download size={20} />, name: 'Export Returns', path: '/app/gst/export' },
        
        { icon: <BarChart2 size={20} />, name: 'Summary Reports', path: '/app/gst/summary' },
        { icon: <CheckCircle size={20} />, name: 'GST Registration', path: '/app/gst/registration' },
        { icon: <AlertCircle size={20} />, name: 'Compliance Check', path: '/app/gst/compliance' },
      ]
    }
  ];

  return (
    <div className='pt-[56px] px-4 '>
      <h1 className="text-2xl font-bold mb-6">GST Module</h1>
      
      <div className="grid grid-cols-1 gap-6">
        {gstFeatures.map((category, index) => (
          <div 
            key={index}
            className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'}`}
          >
            <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {category.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  onClick={() => navigate(item.path)}
                  className={`p-4 rounded-lg flex flex-col items-center text-center transition-colors ${
                    theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-2 rounded-full mb-2 ${
                    theme === 'dark' 
                      ? 'bg-gray-600' 
                      : 'bg-orange-50'
                  }`}>
                    {item.icon}
                  </div>
                  <span className="text-sm">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className={`mt-6 p-4 rounded ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-orange-50'
      }`}>
        <p className="text-sm">
          <span className="font-semibold">GST Compliance:</span> Ensure all returns are filed on time to avoid penalties.
        </p>
      </div>
    </div>
  );
};

export default GSTModule;