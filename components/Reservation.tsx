
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { OrderType, UserCategory, UserProfile } from '../types';

interface ReservationProps {
  whatsappNumber: string;
  user: User | null;
  onNavigate: () => void;
}

const Reservation: React.FC<ReservationProps> = ({ whatsappNumber, user, onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    guests: '2',
    message: '',
    type: 'table_booking' as OrderType
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      });
      return () => unsub();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Please login or register to place an order.");
      onNavigate();
      return;
    }

    const userType: UserCategory = 'registered';

    const orderData = {
      userId: user.uid,
      userType: userType,
      userName: formData.name,
      userPhone: formData.phone,
      address: `Guests: ${formData.guests} | Time: ${formData.date}`,
      itemName: `${formData.type === 'table_booking' ? 'Table' : 'Cabin'} for ${formData.guests}`,
      orderType: formData.type,
      orderAmount: 0,
      quantity: parseInt(formData.guests.toString()),
      status: 'pending',
      pointsEarned: 0,
      pointsCredited: false,
      notes: formData.message,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      const whatsappMsg = `*NEW BOOKING (${userType.toUpperCase()}) - Food Garden*\n` +
                          `*ID:* ${docRef.id}\n` +
                          `*Type:* ${formData.type.replace('_', ' ').toUpperCase()}\n` +
                          `*For:* ${formData.guests} People\n` +
                          `*On:* ${formData.date}\n\n` +
                          `*Contact:*\n👤 ${formData.name}\n📞 ${formData.phone}\n` +
                          (formData.message ? `📝 Notes: ${formData.message}` : '');
      
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
      alert("Booking request received! We will confirm your table shortly.");
      setFormData({...formData, name: '', phone: '', message: ''});
    } catch (err) {
      alert("Error submitting reservation. Please try again.");
    }
  };

  return (
    <section id="reservation" className="py-20 md:py-24 relative bg-brand-black">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" alt="Reservation Background" className="w-full h-full object-cover opacity-30 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-r md:from-brand-black md:via-brand-black/80 md:to-transparent from-brand-black via-brand-black/95 to-brand-black/60"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 md:gap-12">
        <div className="w-full lg:w-5/12 text-white text-center lg:text-left">
          <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-[10px] md:text-sm mb-4">Live Reservations</h3>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 text-shadow-lg leading-tight">Secure Your <br className="hidden md:block"/> <span className="text-brand-gold italic">Preferred Spot</span></h2>
          <p className="text-gray-300 font-sans font-light text-base md:text-lg mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">Book a normal table or our exclusive premium cabins. Requests are processed in real-time by our staff at Food Garden.</p>
          <div className="flex items-center justify-center lg:justify-start space-x-8 mt-6 md:mt-12 border-t border-gray-800 pt-8">
             <div><span className="block text-brand-gold text-lg font-serif">Lunch</span><span className="text-gray-400 text-xs md:text-sm">11 AM - 4 PM</span></div>
             <div className="w-px h-10 bg-gray-800"></div>
             <div><span className="block text-brand-gold text-lg font-serif">Dinner</span><span className="text-gray-400 text-xs md:text-sm">6 PM - 10 PM</span></div>
          </div>
        </div>

        <div className="w-full lg:w-6/12">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-12 border border-white/10">
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              <div className="flex gap-2 md:gap-4 mb-6 md:mb-8">
                <button type="button" onClick={() => setFormData({...formData, type: 'table_booking'})} className={`flex-1 py-3.5 rounded-xl border font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${formData.type === 'table_booking' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-gray-700 text-gray-500'}`}>Table Booking</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'cabin_booking'})} className={`flex-1 py-3.5 rounded-xl border font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${formData.type === 'cabin_booking' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-gray-700 text-gray-500'}`}>Private Cabin</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="group relative z-0 w-full mb-2">
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="block py-3 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans" placeholder=" " />
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Your Name</label>
                </div>
                <div className="group relative z-0 w-full mb-2">
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="block py-3 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans" placeholder=" " />
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">WhatsApp Number</label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="group relative z-0 w-full mb-2">
                  <input type="datetime-local" name="date" required value={formData.date} onChange={handleChange} className="block py-3 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans scheme-dark" placeholder=" " />
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Date & Time</label>
                </div>
                <div className="group relative z-0 w-full mb-2">
                  <select name="guests" value={formData.guests} onChange={handleChange} className="block py-3 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans">
                    {[1, 2, 3, 4, 5, 6, 7, 8, '8+'].map(num => <option key={num} value={num} className="bg-brand-black">{num} People</option>)}
                  </select>
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Guests</label>
                </div>
              </div>
              <div className="group relative z-0 w-full mb-2">
                <textarea name="message" value={formData.message} onChange={handleChange} className="block py-3 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans h-20 md:h-24 resize-none" placeholder=" " />
                <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Instructions</label>
              </div>
              <div className="text-center pt-4">
                <button type="submit" className="w-full py-4 bg-brand-gold text-brand-black font-bold text-[10px] md:text-sm uppercase tracking-widest hover:bg-white transition-all duration-300 rounded shadow-lg">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reservation;
