
import React from 'react';
import { RESTAURANT_INFO } from '../constants';
import { ContactInfo } from '../types';
import { MapPin, Phone, Clock, Facebook, Instagram, ChevronRight, Mail, MessageCircle, Lock } from 'lucide-react';

interface ContactFooterProps {
  contactInfo: ContactInfo;
  onAdminLogin?: () => void;
}

const ContactFooter: React.FC<ContactFooterProps> = ({ contactInfo, onAdminLogin }) => {
  // Construct Dynamic Google Maps URL based on the fetched address
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(contactInfo.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // Helper to ensure phone link only contains digits and +
  const cleanPhoneLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

  return (
    <footer id="contact" className="bg-brand-black text-white pt-20 border-t border-brand-gold/20">
      <div className="container mx-auto px-4 md:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Column */}
          <div className="space-y-6">
             <div>
               <h2 className="text-3xl font-display font-bold text-brand-gold mb-2">{RESTAURANT_INFO.name}</h2>
               <p className="text-gray-500 italic text-sm">{RESTAURANT_INFO.tagline}</p>
             </div>
             <p className="text-gray-400 text-sm leading-relaxed">
               Experience the finest culinary journey in Jhumri Telaiya. We blend tradition with elegance to create unforgettable dining moments.
             </p>
             
             {/* Dynamic Social Media Links */}
             <div className="flex space-x-4 pt-2">
               {contactInfo.facebook && contactInfo.facebook !== '#' && (
                 <a 
                   href={contactInfo.facebook} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-brand-gold hover:border-brand-gold hover:text-brand-black transition-all duration-300"
                   aria-label="Facebook"
                 >
                   <Facebook size={18} />
                 </a>
               )}
               {contactInfo.instagram && contactInfo.instagram !== '#' && (
                 <a 
                   href={contactInfo.instagram} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-brand-gold hover:border-brand-gold hover:text-brand-black transition-all duration-300"
                   aria-label="Instagram"
                 >
                   <Instagram size={18} />
                 </a>
               )}
               {contactInfo.email && (
                 <a 
                   href={`mailto:${contactInfo.email}`} 
                   className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-brand-gold hover:border-brand-gold hover:text-brand-black transition-all duration-300"
                   aria-label="Email"
                 >
                   <Mail size={18} />
                 </a>
               )}
             </div>
          </div>

          {/* Contact Info - Dynamic */}
          <div>
            <h3 className="text-brand-gold font-sans font-bold uppercase tracking-widest text-xs mb-8">Contact Us</h3>
             
             <div className="space-y-6">
               <div className="flex items-start group">
                 <MapPin className="text-brand-gold mt-1 mr-4 flex-shrink-0 w-5 h-5 group-hover:text-white transition-colors" />
                 <p className="text-gray-400 text-sm leading-relaxed w-3/4 group-hover:text-white transition-colors">
                   {contactInfo.address}
                 </p>
               </div>

               <div className="flex items-center group">
                 <Phone className="text-brand-gold mr-4 flex-shrink-0 w-5 h-5 group-hover:text-white transition-colors" />
                 <a href={cleanPhoneLink(contactInfo.phone)} className="text-gray-400 text-sm hover:text-white transition-colors font-sans tracking-wide">
                   {contactInfo.phone}
                 </a>
               </div>

               <div className="flex items-center group">
                 <MessageCircle className="text-brand-gold mr-4 flex-shrink-0 w-5 h-5 group-hover:text-white transition-colors" />
                 <a 
                   href={`https://api.whatsapp.com/send?phone=${contactInfo.whatsapp}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-gray-400 text-sm hover:text-white transition-colors font-sans tracking-wide"
                 >
                   Chat on WhatsApp
                 </a>
               </div>

               <div className="flex items-center group">
                 <Clock className="text-brand-gold mr-4 flex-shrink-0 w-5 h-5 group-hover:text-white transition-colors" />
                 <p className="text-gray-400 text-sm group-hover:text-white transition-colors">
                   {contactInfo.hours}
                 </p>
               </div>
             </div>
          </div>

          {/* Newsletter (Static UI) */}
          <div>
            <h3 className="text-brand-gold font-sans font-bold uppercase tracking-widest text-xs mb-8">Newsletter</h3>
            <p className="text-gray-400 text-sm mb-6">Subscribe for exclusive offers and seasonal menu updates.</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-gray-900 border border-gray-800 rounded-sm py-3 px-4 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors"
              />
              <button className="absolute right-0 top-0 h-full px-4 text-brand-gold hover:text-white transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
            
            {/* Admin Login Link */}
            <button 
              onClick={onAdminLogin}
              className="mt-6 flex items-center gap-2 text-[10px] text-gray-700 hover:text-brand-gold uppercase tracking-[0.2em] font-bold transition-colors"
            >
              <Lock size={10} /> Staff Login
            </button>
          </div>

          {/* Dynamic Map Embed */}
          <div className="h-64 lg:h-auto min-h-[250px] w-full bg-gray-900 rounded-sm overflow-hidden shadow-2xl border border-gray-800 relative group">
            <iframe 
              key={contactInfo.address}
              src={mapUrl}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Restaurant Location"
              className="w-full h-full grayscale hover:grayscale-0 transition-all duration-700 opacity-70 hover:opacity-100"
            ></iframe>
            
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 bg-brand-gold text-brand-black text-xs font-bold uppercase tracking-wider px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
            >
              Get Directions
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-900 bg-black py-8 text-center">
        <p className="text-gray-600 text-xs tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {RESTAURANT_INFO.name}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default ContactFooter;
