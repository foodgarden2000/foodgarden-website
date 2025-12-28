
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Calendar, PartyPopper, X, User, Phone, Loader2, Tag } from 'lucide-react';
import { FestivalSpecial } from '../types';
import { getOptimizedImageURL } from '../constants';

interface FestiveSpecialsProps {
  whatsappNumber: string;
}

const FestiveSpecials: React.FC<FestiveSpecialsProps> = ({ whatsappNumber }) => {
  const [specials, setSpecials] = useState<FestivalSpecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('');
  const [formData, setFormData] = useState({
    name: '', phone: '', date: '', time: ''
  });

  useEffect(() => {
    // Only fetch available festivals. 
    // We remove orderBy to ensure the query works immediately without manual index configuration.
    const q = query(
      collection(db, "festivals"), 
      where("available", "==", true)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSpecials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FestivalSpecial));
      
      // Sort in memory instead of Firestore query to avoid index dependency
      fetchedSpecials.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setSpecials(fetchedSpecials);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching festivals:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (menuTitle: string) => {
    setSelectedMenu(menuTitle);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Hi, I would like to book the *${selectedMenu}* special menu at Food Garden.\n\n*Name:* ${formData.name}\n*Phone:* ${formData.phone}\n*Date:* ${formData.date}\n*Time:* ${formData.time}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', date: '', time: '' });
  };

  return (
    <section id="festivals" className="py-20 md:py-24 bg-brand-black text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-brand-gold/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center justify-center p-2 md:p-3 rounded-full border border-brand-gold/30 bg-brand-gold/10 mb-6 backdrop-blur-sm">
            <PartyPopper className="text-brand-gold w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-brand-gold mb-6 text-shadow-gold">Celebrations</h2>
          <p className="text-gray-300 max-w-2xl mx-auto font-sans font-light text-base md:text-lg tracking-wide leading-relaxed px-4">
            Exclusive seasonal menus designed to make your special moments unforgettable.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-gold" size={48} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {specials.map((special, index) => (
              <div key={index} className="group relative bg-brand-dark rounded-xl overflow-hidden border border-gray-800 hover:border-brand-gold transition-all duration-500 shadow-2xl flex flex-col h-full hover:-translate-y-2">
                <div className="h-56 md:h-64 overflow-hidden shrink-0 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent opacity-80 z-10"></div>
                  <img 
                    src={getOptimizedImageURL(special.image)} 
                    alt={special.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute top-4 left-4 z-20 bg-brand-gold/90 backdrop-blur text-brand-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center shadow-lg">
                    <Calendar size={10} className="mr-2" /> Limited
                  </div>
                </div>

                <div className="px-5 md:px-8 pb-8 flex flex-col flex-grow relative z-20 -mt-8 md:-mt-10">
                  <div className="bg-brand-dark p-5 md:p-6 rounded-lg shadow-xl border border-gray-800 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2 gap-4">
                       <h3 className="text-xl md:text-2xl font-display font-bold text-white leading-tight">{special.title}</h3>
                       {special.price && (
                         <div className="flex items-center gap-1 text-brand-gold font-bold text-sm md:text-base shrink-0">
                            <Tag size={12} className="md:w-[14px] md:h-[14px]" />
                            <span>{special.price}</span>
                         </div>
                       )}
                    </div>
                    <h4 className="text-brand-gold font-sans text-[10px] md:text-sm uppercase tracking-wider mb-4 italic">{special.subtitle}</h4>
                    <p className="text-gray-400 text-xs md:text-sm mb-6 flex-grow font-light leading-relaxed line-clamp-4 italic">"{special.description}"</p>
                    {special.items && special.items.length > 0 && (
                      <div className="mb-6 border-t border-gray-800 pt-4">
                        <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-3">Highlights</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {special.items.map((item, idx) => (
                            <li key={idx} className="flex items-center text-gray-300 text-[10px] md:text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold mr-2 shrink-0"></span><span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button 
                      onClick={() => handleOpenModal(special.title)}
                      className="block w-full py-3 bg-transparent border border-brand-gold text-brand-gold font-bold rounded hover:bg-brand-gold hover:text-brand-black transition-all duration-300 uppercase tracking-widest text-[10px] md:text-xs mt-auto"
                    >
                      Reserve Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {specials.length === 0 && !loading && (
              <div className="col-span-full text-center py-20 border-2 border-dashed border-gray-800 rounded-2xl">
                <p className="text-gray-400 font-serif italic text-sm md:text-base">New seasonal events coming soon!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-brand-dark border border-brand-gold/50 rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fade-in-up">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 z-10"><X size={24} /></button>
            <div className="p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-display font-bold text-brand-gold mb-1">Book Menu</h3>
              <p className="text-gray-400 text-xs md:text-sm mb-6">Experience: <span className="text-white font-bold">{selectedMenu}</span></p>
              <form onSubmit={handleConfirmBooking} className="space-y-4 md:space-y-6">
                <div className="relative"><User size={14} className="absolute left-3 top-3.5 text-gray-500" /><input type="text" required placeholder="Your Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold outline-none text-sm" /></div>
                <div className="relative"><Phone size={14} className="absolute left-3 top-3.5 text-gray-500" /><input type="tel" required placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold outline-none text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 px-3 text-white focus:border-brand-gold outline-none text-xs md:text-sm" />
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 px-3 text-white focus:border-brand-gold outline-none text-xs md:text-sm" />
                </div>
                <button type="submit" className="w-full py-4 mt-2 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded shadow-lg text-[10px] md:text-xs">Confirm Request</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FestiveSpecials;
