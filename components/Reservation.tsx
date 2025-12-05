import React, { useState } from 'react';

interface ReservationProps {
  whatsappNumber: string;
}

const Reservation: React.FC<ReservationProps> = ({ whatsappNumber }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    guests: '2',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create a clean message string using standard newlines
    const message = `Hi, I would like to book a table at Chef's Jalsa.\n\nName: ${formData.name}\nPhone: ${formData.phone}\nDate: ${formData.date}\nGuests: ${formData.guests}\nMessage: ${formData.message}`;
    
    // Use encodeURIComponent to ensure all characters (spaces, newlines, symbols) are URL-safe
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section id="reservation" className="py-24 relative bg-brand-black">
      {/* Background with dark overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" 
          alt="Reservation Background" 
          className="w-full h-full object-cover opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/80 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Content */}
        <div className="w-full lg:w-5/12 text-white">
          <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-sm mb-4">Reservations</h3>
          <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-shadow-lg leading-tight">
            Book Your <br/> <span className="text-brand-gold italic">Experience</span>
          </h2>
          <p className="text-gray-300 font-sans font-light text-lg mb-8 leading-relaxed">
            Reserve your spot for an unforgettable dining experience in Jhumri Telaiya. For special events or large groups, please call us directly.
          </p>
          
          <div className="flex items-center space-x-8 mt-12 border-t border-gray-800 pt-8">
             <div>
                <span className="block text-brand-gold text-lg font-serif">Lunch Time</span>
                <span className="text-gray-400 text-sm">11:00 AM - 04:00 PM</span>
             </div>
             <div>
                <span className="block text-brand-gold text-lg font-serif">Dinner Time</span>
                <span className="text-gray-400 text-sm">06:00 PM - 10:30 PM</span>
             </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="w-full lg:w-6/12">
          <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group relative z-0 w-full mb-2">
                  <input 
                    type="text" 
                    name="name" 
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans"
                    placeholder=" "
                  />
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Your Name</label>
                </div>
                
                <div className="group relative z-0 w-full mb-2">
                  <input 
                    type="tel" 
                    name="phone"
                    required 
                    value={formData.phone}
                    onChange={handleChange}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans"
                    placeholder=" "
                  />
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Phone Number</label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group relative z-0 w-full mb-2">
                  <input 
                    type="datetime-local" 
                    name="date"
                    required 
                    value={formData.date}
                    onChange={handleChange}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans scheme-dark"
                    placeholder=" "
                  />
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Date & Time</label>
                </div>

                <div className="group relative z-0 w-full mb-2">
                  <select 
                    name="guests"
                    value={formData.guests}
                    onChange={handleChange}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, '8+'].map(num => (
                      <option key={num} value={num} className="bg-brand-black">{num} People</option>
                    ))}
                  </select>
                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Guests</label>
                </div>
              </div>

              <div className="group relative z-0 w-full mb-2">
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer font-sans h-24 resize-none"
                  placeholder=" "
                ></textarea>
                <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Special Requests (Optional)</label>
              </div>

              <div className="text-center pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-brand-gold text-brand-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all duration-300 rounded shadow-lg"
                >
                  Confirm Table
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reservation;