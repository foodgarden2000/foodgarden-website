import React, { useState, useEffect } from 'react';
import { FESTIVAL_SPECIALS, GOOGLE_SHEET_URL } from '../constants';
import { FestivalSpecial } from '../types';
import { Calendar, PartyPopper, X, User, Phone } from 'lucide-react';

interface FestiveSpecialsProps {
  whatsappNumber: string;
}

const FestiveSpecials: React.FC<FestiveSpecialsProps> = ({ whatsappNumber }) => {
  const [specials, setSpecials] = useState<FestivalSpecial[]>(FESTIVAL_SPECIALS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: ''
  });

  // Background colors cycle - Using dark theme logic now, so these might be less relevant for BG but used for accents
  const bgColors = ["border-orange-500", "border-pink-500", "border-yellow-500", "border-red-500", "border-amber-500"];

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const text = await response.text();
        const parsedData = parseCSV(text);
        
        if (parsedData.length > 0) {
          const mappedData: FestivalSpecial[] = parsedData.map((item: any, index: number) => {
            // Handle items splitting (try pipe first, then comma)
            let itemsList: string[] = [];
            const rawItems = item.items || item.Items || "";
            if (rawItems.includes('|')) {
               itemsList = rawItems.split('|').map((i: string) => i.trim());
            } else {
               itemsList = rawItems.split(',').map((i: string) => i.trim());
            }

            return {
              title: item.title || item.Title || "Special Event",
              subtitle: item.subtitle || item.Subtitle || "Limited Time Offer",
              description: item.description || item.Description || "",
              items: itemsList.filter((i: string) => i.length > 0),
              image: item.image || item.Image || `https://picsum.photos/600/400?random=${20 + index}`,
              color: item.color || item.Color || bgColors[index % bgColors.length]
            };
          });
          setSpecials(mappedData);
        }
      } catch (error) {
        console.error("Error fetching Google Sheet data:", error);
      }
    };

    fetchSheetData();
  }, []);

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const splitLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim());
    
    return lines.slice(1).map(line => {
      if (!line.trim()) return null;
      const values = splitLine(line);
      const entry: any = {};
      headers.forEach((header, index) => {
        entry[header] = values[index] || '';
      });
      return entry;
    }).filter(item => item !== null);
  };

  const handleOpenModal = (menuTitle: string) => {
    setSelectedMenu(menuTitle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', date: '', time: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Hi, I would like to book the *${selectedMenu}* special menu at Chef's Jalsa.\n\n*Name:* ${formData.name}\n*Phone:* ${formData.phone}\n*Date:* ${formData.date}\n*Time:* ${formData.time}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    handleCloseModal();
  };

  return (
    <section id="festivals" className="py-24 bg-brand-black text-white relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 rounded-full border border-brand-gold/30 bg-brand-gold/10 mb-6 backdrop-blur-sm">
            <PartyPopper className="text-brand-gold w-6 h-6" />
          </div>
          <h2 className="text-5xl md:text-6xl font-display font-bold text-brand-gold mb-6 text-shadow-gold">Celebrations & Events</h2>
          <p className="text-gray-300 max-w-2xl mx-auto font-sans font-light text-lg tracking-wide leading-relaxed">
            From Sankranti to Valentine's Day, we curate exclusive menus to make your special moments unforgettable.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {specials.map((special, index) => (
            <div key={index} className="group relative bg-brand-dark rounded-xl overflow-hidden border border-gray-800 hover:border-brand-gold transition-all duration-500 shadow-2xl flex flex-col h-full hover:-translate-y-2">
              
              {/* Image Container */}
              <div className="h-64 overflow-hidden shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent opacity-80 z-10"></div>
                <img 
                  src={special.image} 
                  alt={special.title} 
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/600/400?random=${index + 100}` }}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute top-4 left-4 z-20 bg-brand-gold/90 backdrop-blur text-brand-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center shadow-lg">
                   <Calendar size={12} className="mr-2" /> Limited
                </div>
              </div>

              {/* Card Content */}
              <div className="p-8 flex flex-col flex-grow relative z-20 -mt-10">
                <div className="bg-brand-dark p-6 rounded-lg shadow-xl border border-gray-800 flex flex-col flex-grow">
                  <h3 className="text-2xl font-display font-bold text-white mb-2">{special.title}</h3>
                  <h4 className="text-brand-gold font-sans text-sm uppercase tracking-wider mb-4">{special.subtitle}</h4>
                  
                  <p className="text-gray-400 text-sm mb-6 flex-grow font-light leading-relaxed">{special.description}</p>
                  
                  {special.items && special.items.length > 0 && (
                    <ul className="space-y-3 mb-8 border-t border-gray-800 pt-4">
                      {special.items.map((item, idx) => (
                        <li key={idx} className="flex items-center text-gray-300 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold mr-3"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button 
                    onClick={() => handleOpenModal(special.title)}
                    className="block w-full py-3 bg-transparent border border-brand-gold text-brand-gold font-bold rounded hover:bg-brand-gold hover:text-brand-black transition-all duration-300 uppercase tracking-widest text-xs mt-auto"
                  >
                    Reserve This Menu
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal - Styled Premium */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-brand-dark border border-brand-gold/50 rounded-xl shadow-[0_0_50px_rgba(212,175,55,0.2)] w-full max-w-md relative overflow-hidden animate-fade-in-up">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-8">
              <h3 className="text-3xl font-display font-bold text-brand-gold mb-2">Book Experience</h3>
              <p className="text-gray-400 text-sm mb-8 font-sans">Requesting: <span className="text-white font-bold">{selectedMenu}</span></p>
              
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div className="group relative">
                  <User size={16} className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-brand-gold transition-colors" />
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your Name"
                    className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
                  />
                </div>

                <div className="group relative">
                  <Phone size={16} className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-brand-gold transition-colors" />
                  <input 
                    type="tel" 
                    name="phone" 
                    required 
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                    className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group relative">
                    <input 
                      type="date" 
                      name="date" 
                      required 
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-brand-gold focus:outline-none transition-colors scheme-dark font-sans text-sm"
                    />
                  </div>
                  <div className="group relative">
                    <input 
                      type="time" 
                      name="time" 
                      required 
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-brand-gold focus:outline-none transition-colors scheme-dark font-sans text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 mt-2 bg-brand-gold text-brand-black font-bold uppercase tracking-widest hover:bg-white transition-all duration-300 rounded shadow-lg text-xs"
                >
                  Send Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FestiveSpecials;