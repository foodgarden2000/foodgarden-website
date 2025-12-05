import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

interface FloatingButtonsProps {
  phone: string;
  whatsappNumber: string;
}

const FloatingButtons: React.FC<FloatingButtonsProps> = ({ phone, whatsappNumber }) => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    
    if (element) {
      const headerOffset = 80; // Height of the fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <>
      {/* WhatsApp Button - Bottom Right */}
      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-transform hover:scale-110 flex items-center justify-center animate-bounce-slow"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={32} />
      </a>

      {/* Sticky Call Button - Mobile Only - Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-brand-dark border-t border-gray-800 flex">
        <a 
          href={`tel:${phone}`}
          className="flex-1 py-4 bg-brand-red text-white text-center font-bold uppercase tracking-wider text-sm flex items-center justify-center"
        >
          <Phone size={18} className="mr-2" /> Call Now
        </a>
        <a 
          href="#reservation"
          onClick={(e) => handleScroll(e, '#reservation')}
          className="flex-1 py-4 bg-brand-gold text-brand-dark text-center font-bold uppercase tracking-wider text-sm"
        >
          Book Table
        </a>
      </div>
    </>
  );
};

export default FloatingButtons;