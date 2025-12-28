
import React, { useState } from 'react';
import { X, Coffee, Sofa, ShoppingBag, PartyPopper, Cake, Users, Phone, Loader2, ArrowLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Order, OrderType, UserCategory } from '../types';

interface BookOnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onNavigate: (view: 'home' | 'dashboard' | 'admin', section?: string) => void;
  whatsappNumber: string;
}

type BookingStep = 'selection' | 'event_form';
type EventType = 'kitty' | 'birthday' | 'club';

const BookOnlineModal: React.FC<BookOnlineModalProps> = ({ isOpen, onClose, user, onNavigate, whatsappNumber }) => {
  const [step, setStep] = useState<BookingStep>('selection');
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    people: 10,
    note: ''
  });

  if (!isOpen) return null;

  const handleSelection = (type: string) => {
    if (!user) {
      alert("Please login to continue with your booking.");
      onNavigate('dashboard');
      onClose();
      return;
    }

    if (type === 'table') {
      onClose();
      const el = document.getElementById('reservation');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'cabin') {
      onClose();
      const el = document.getElementById('reservation');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'order') {
      onClose();
      const el = document.getElementById('menu');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setSelectedEventType(type as EventType);
      setStep('event_form');
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEventType) return;

    setLoading(true);
    try {
      let mappedType: OrderType = 'kitty_party';
      if (selectedEventType === 'birthday') mappedType = 'birthday_party';
      if (selectedEventType === 'club') mappedType = 'club_meeting';

      const bookingData: Order = {
        userId: user.uid,
        userType: 'registered', 
        userName: formData.name,
        userPhone: formData.phone,
        address: `Guests: ${formData.people} | ${formData.date} at ${formData.time}`,
        itemName: `${selectedEventType.toUpperCase()} Event Booking`,
        orderType: mappedType,
        orderAmount: 0, 
        quantity: formData.people,
        status: 'pending',
        paymentMode: 'cash',
        pointsUsed: 0,
        amountEquivalent: 0,
        pointsDeducted: false,
        pointsEarned: 0,
        pointsCredited: false,
        notes: formData.note,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "orders"), bookingData);
      
      const msg = `*NEW ${selectedEventType.toUpperCase()} BOOKING - Food Garden*\n` +
                  `*ID:* ${docRef.id}\n` +
                  `*Name:* ${formData.name}\n` +
                  `*Guests:* ${formData.people}\n` +
                  `*Date:* ${formData.date} at ${formData.time}\n` +
                  `*Note:* ${formData.note}`;

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      alert("Your booking request has been submitted! You can track status in your dashboard.");
      onClose();
      setStep('selection');
    } catch (err) {
      console.error(err);
      alert("Failed to submit booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-brand-dark border border-brand-gold/30 rounded-2xl w-full max-w-xl overflow-hidden animate-fade-in-up shadow-2xl flex flex-col">
        <div className="p-6 bg-brand-black flex justify-between items-center border-b border-brand-gold/10">
          <div className="flex items-center gap-3">
            {step === 'event_form' && (
              <button onClick={() => setStep('selection')} className="text-gray-400 hover:text-white transition-colors">
                {/* Fixed: changed size(20) to size={20} to fix "Type 'boolean' is not assignable to type 'string | number'" error */}
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h3 className="text-xl font-display font-bold text-brand-gold uppercase tracking-widest">
                {step === 'selection' ? 'Book Online' : `${selectedEventType?.toUpperCase()} BOOKING`}
              </h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Food Garden Premium Services</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"><X /></button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh]">
          {step === 'selection' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { id: 'table', label: 'Table Booking', icon: Coffee, color: 'text-blue-400' },
                { id: 'cabin', label: 'Private Cabin', icon: Sofa, color: 'text-purple-400' },
                { id: 'order', label: 'Online Order', icon: ShoppingBag, color: 'text-green-400' },
                { id: 'kitty', label: 'Kitty Party', icon: Users, color: 'text-pink-400' },
                { id: 'birthday', label: 'Birthday Party', icon: Cake, color: 'text-orange-400' },
                { id: 'club', label: 'Club Meeting', icon: PartyPopper, color: 'text-brand-gold' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelection(item.id)}
                  className="flex flex-col items-center justify-center p-6 bg-brand-black/40 border border-white/5 rounded-xl hover:border-brand-gold transition-all group"
                >
                  <item.icon size={32} className={`${item.color} mb-3 group-hover:scale-110 transition-transform`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmitEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none" placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Phone Number</label>
                  <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none" placeholder="WhatsApp preferred" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Preferred Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Preferred Time</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Number of People</label>
                <input type="number" min="5" max="100" required value={formData.people} onChange={e => setFormData({...formData, people: parseInt(e.target.value)})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Special Requirements</label>
                <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none h-24 resize-none" placeholder="Decoration, food preferences, etc." />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Submit Booking'}
                </button>
                <a 
                  href="tel:8809477481" 
                  className="px-6 py-4 border border-brand-gold/30 text-brand-gold rounded-lg flex items-center justify-center hover:bg-brand-gold/10 transition-all"
                >
                  <Phone size={18} />
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookOnlineModal;
