import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

const LoanModule: React.FC = () => {
    const { theme } = useAppContext();
    const navigate = useNavigate();

    const loanFeatures = [
        {
            title: 'Loan Management',
            items: [
                { icon: <Activity size={20} />, name: 'CMA Data', path: '/app/loan/cma' },
                { icon: <Activity size={20} />, name: 'DPR Report', path: '/app/loan/dpr' },
                { icon: <Activity size={20} />, name: 'Networth Certificate', path: '/app/loan/networth-certificate', isPending: true },
            ]
        },
        {
            title: 'Loan Documents',
            items: [
                {
                    icon: <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="PDF" className="w-12 h-12 object-contain" />,
                    name: 'Cash Budget',
                    path: '/loans/CASH BUDGET.pdf',
                    isPublic: true
                },
                {
                    icon: <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="PDF" className="w-12 h-12 object-contain" />,
                    name: 'Turnover Certificate',
                    path: '/loans/Turnover Certificate-1.pdf',
                    isPublic: true
                },
            ]
        }
    ];

    const handleNavigation = (item: any) => {
        if (item.isPublic) {
            window.open(item.path, '_blank');
        } else {
            navigate(item.path);
        }
    };

    return (
        <div className='pt-[56px] px-4 '>
            <h1 className="text-2xl font-bold mb-6">Loan Module</h1>

            <div className="grid grid-cols-1 gap-6">
                {loanFeatures.map((category, index) => (
                    <div
                        key={index}
                        className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'}`}
                    >
                        <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {category.items.map((item, itemIndex) => (
                                <button
                                    key={itemIndex}
                                    onClick={() => handleNavigation(item)}
                                    className={`p-4 rounded-lg flex flex-col items-center text-center transition-colors ${
                                        item.isPending
                                            ? theme === 'dark'
                                                ? 'bg-red-950/30 border border-red-800/50 hover:bg-red-900/40 text-red-400'
                                                : 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-600'
                                            : theme === 'dark'
                                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                                : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    <div className={`p-2 rounded-full mb-2 ${
                                        item.isPending
                                            ? theme === 'dark'
                                                ? 'bg-red-900/60 text-red-300'
                                                : 'bg-red-100 text-red-600'
                                            : theme === 'dark'
                                                ? 'bg-gray-600'
                                                : 'bg-blue-50'
                                    }`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-sm ${item.isPending ? 'font-medium text-red-600 dark:text-red-400' : ''}`}>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className={`mt-6 p-4 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'
                }`}>
                <p className="text-sm">
                    <span className="font-semibold">Note:</span> Loan module allows you to track and manage loans, EMI schedules, and repayments.
                </p>
            </div>
        </div>
    );
};

export default LoanModule;
