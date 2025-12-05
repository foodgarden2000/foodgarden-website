import React from 'react';
import { X, Phone, Check, Search, MessageCircle } from 'lucide-react';
import { SERVICES_DATA } from '../constants';
import { ContactInfo } from '../types';

interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactInfo: ContactInfo;
}

const ServicesModal: React.FC<ServicesModalProps> = ({ isOpen, onClose, contactInfo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] md:h-[80vh] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 font-sans">Chef's Jalsa</h2>
            
            <div className="flex items-center gap-2 md:gap-3">
                <a 
                  href={`tel:${contactInfo.phone}`} 
                  className="hidden sm:flex items-center px-4 py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700 transition-colors shadow-sm"
                >
                    <Phone size={16} className="mr-2" /> Show Number
                </a>
                <a 
                  href={`https://wa.me/${contactInfo.whatsapp}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="hidden sm:flex items-center px-4 py-2 border border-green-600 text-green-700 rounded font-bold text-sm hover:bg-green-50 transition-colors shadow-sm"
                >
                   <MessageCircle size={16} className="mr-2" /> WhatsApp
                </a>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                >
                    <X size={28} />
                </button>
            </div>
        </div>

        {/* Mobile Action Bar */}
        <div className="flex sm:hidden border-b border-gray-100">
             <a 
                  href={`tel:${contactInfo.phone}`} 
                  className="flex-1 py-3 bg-green-600 text-white text-center font-bold text-sm flex items-center justify-center"
                >
                    <Phone size={16} className="mr-2" /> Show Number
                </a>
                <a 
                  href={`https://wa.me/${contactInfo.whatsapp}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 py-3 bg-white text-green-700 text-center font-bold text-sm flex items-center justify-center border-l"
                >
                   <MessageCircle size={16} className="mr-2" /> WhatsApp
                </a>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden bg-white">
            
            {/* Sidebar (Desktop) */}
            <div className="w-1/3 min-w-[250px] bg-white border-r border-gray-100 p-4 md:p-6 overflow-y-auto hidden md:block">
                <div className="relative mb-6">
                    <input 
                      type="text" 
                      placeholder="Search Services" 
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all bg-gray-50" 
                    />
                    <Search className="absolute left-3 top-2.5 text-blue-500 w-4 h-4" />
                </div>
                <ul className="space-y-1">
                    {Object.entries(SERVICES_DATA).map(([category, items]) => (
                        <li key={category}>
                           <a 
                             href={`#modal-${category.replace(/\s+/g, '-').toLowerCase()}`}
                             onClick={(e) => {
                               e.preventDefault();
                               const el = document.getElementById(`modal-${category.replace(/\s+/g, '-').toLowerCase()}`);
                               el?.scrollIntoView({ behavior: 'smooth' });
                             }}
                             className="flex justify-between items-center cursor-pointer font-medium text-gray-700 hover:text-gray-900 py-3 px-2 rounded hover:bg-gray-50 transition-colors"
                           >
                              <span>{category}</span>
                              <span className="text-gray-400 text-sm">({items.length})</span>
                           </a>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-2/3 p-6 md:p-8 overflow-y-auto scroll-smooth">
                 {/* Mobile Search (Visible only on small screens) */}
                 <div className="relative mb-6 md:hidden">
                    <input 
                      type="text" 
                      placeholder="Search Services" 
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50" 
                    />
                    <Search className="absolute left-3 top-3.5 text-blue-500 w-4 h-4" />
                </div>

                 {Object.entries(SERVICES_DATA).map(([category, items]) => (
                    <div 
                      key={category} 
                      id={`modal-${category.replace(/\s+/g, '-').toLowerCase()}`} 
                      className="mb-8 pb-6 border-b border-gray-50 last:border-0"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{category}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                            {items.map(item => (
                                <div key={item} className="flex items-start text-gray-800">
                                    <Check className="text-black w-5 h-5 mr-3 shrink-0 mt-0.5" strokeWidth={3} />
                                    <span className="text-sm font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesModal;