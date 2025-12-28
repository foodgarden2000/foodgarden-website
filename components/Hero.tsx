
import React from 'react';
import { ChevronRight, ArrowDown, CalendarCheck } from 'lucide-react';
import { RESTAURANT_INFO } from '../constants';
import { ContactInfo } from '../types';

interface HeroProps {
  contactInfo: ContactInfo;
  onBookOnline: () => void;
}

const Hero: React.FC<HeroProps> = ({ contactInfo, onBookOnline }) => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    
    if (element) {
      const headerOffset = 90; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const cleanPhoneLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

  return (
    <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" 
          alt="Fine Dining Ambiance" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/70 to-brand-black/30"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
        <div className="mb-4 animate-fade-in-up">
           <span className="inline-block h-px w-12 bg-brand-gold mb-2"></span>
           <h2 className="text-brand-gold font-sans text-xs md:text-base tracking-[0.3em] uppercase font-semibold">
             Welcome to {RESTAURANT_INFO.address.split(',')[2]}
           </h2>
           <span className="inline-block h-px w-12 bg-brand-gold mt-2"></span>
        </div>
        
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-bold text-white mb-6 leading-tight md:leading-none text-shadow-gold animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          {RESTAURANT_INFO.name}
        </h1>
        
        <p className="text-gray-300 text-base md:text-2xl max-w-3xl mx-auto mb-10 font-serif italic tracking-wide animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          "{RESTAURANT_INFO.tagline}" <br/>
          <span className="text-brand-goldLight text-sm md:text-lg not-italic mt-2 block font-sans font-light opacity-90">
             Indian • Chinese • Continental • Festive Dining
          </span>
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 w-full sm:w-auto animate-fade-in-up opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
          <button 
            onClick={onBookOnline}
            className="w-full sm:w-auto group px-10 py-4 bg-brand-gold text-brand-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all duration-300 rounded-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            <CalendarCheck size={18} /> Book Online
          </button>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <a 
              href="#reservation"
              onClick={(e) => handleScroll(e, '#reservation')}
              className="flex-1 sm:flex-none px-6 py-4 border border-white/20 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all rounded-sm text-center"
            >
              Table
            </a>
            <a 
              href={cleanPhoneLink(contactInfo.phone)}
              className="flex-1 sm:flex-none px-6 py-4 border border-brand-gold/30 backdrop-blur-sm text-brand-gold font-bold text-xs uppercase tracking-widest hover:border-brand-gold hover:bg-brand-gold hover:text-brand-black transition-all duration-300 rounded-sm shadow-lg flex items-center justify-center group"
            >
              Call <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer opacity-70 hover:opacity-100 transition-opacity hidden md:block">
        <a href="#about" onClick={(e) => handleScroll(e, '#about')} className="flex flex-col items-center">
            <span className="text-[10px] text-brand-gold uppercase tracking-widest mb-2">Explore</span>
            <div className="w-6 h-10 border border-brand-gold/50 rounded-full flex justify-center pt-2">
                <div className="w-1 h-2 bg-brand-gold rounded-full animate-pulse"></div>
            </div>
        </a>
      </div>
    </section>
  );
};

export default Hero;
