import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { ContactInfo } from '../types';
import ServicesModal from './ServicesModal';

interface NavbarProps {
  contactInfo: ContactInfo;
}

const Navbar: React.FC<NavbarProps> = ({ contactInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services', isAction: true },
    { name: 'Festivals', href: '#festivals' },
    { name: 'Menu', href: '#menu' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Contact', href: '#contact' },
  ];

  // Custom Smooth Scroll Function
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isAction?: boolean) => {
    e.preventDefault();
    setIsOpen(false); // Close mobile menu if open
    
    if (isAction && href === '#services') {
      setIsServiceModalOpen(true);
      return;
    }
    
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    
    if (element) {
      const headerOffset = 90; // Height of the fixed navbar
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
      <nav className={`fixed w-full z-50 transition-all duration-500 ease-in-out ${scrolled ? 'glass py-3 shadow-2xl' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
          {/* Logo */}
          <a 
            href="#hero" 
            onClick={(e) => handleScroll(e, '#hero')}
            className="flex flex-col items-center group relative z-50"
          >
              <h1 className="text-2xl md:text-3xl font-display font-bold text-brand-gold tracking-widest group-hover:text-white transition-colors drop-shadow-md">
                CHEF’S JALSA
              </h1>
              <div className="h-0.5 w-1/2 bg-brand-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleScroll(e, link.href, link.isAction)}
                className="text-white hover:text-brand-gold text-xs font-semibold tracking-[0.15em] transition-all duration-300 uppercase relative group"
              >
                {link.name}
                <span className="absolute -bottom-2 left-0 w-0 h-px bg-brand-gold transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
            <a 
              href="#reservation"
              onClick={(e) => handleScroll(e, '#reservation')}
              className="px-6 py-2.5 bg-transparent border border-brand-gold text-brand-gold font-bold text-xs uppercase tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all duration-300 rounded-sm"
            >
              Reserve
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-brand-gold z-50 hover:text-white transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div className={`lg:hidden fixed inset-0 bg-brand-black/95 backdrop-blur-xl z-40 transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col items-center justify-center h-full space-y-8">
             {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-2xl font-serif text-white hover:text-brand-gold tracking-widest transition-colors"
                  onClick={(e) => handleScroll(e, link.href, link.isAction)}
                >
                  {link.name}
                </a>
              ))}
              <a 
                href="#reservation"
                onClick={(e) => handleScroll(e, '#reservation')}
                className="px-10 py-4 border border-brand-gold text-brand-gold font-bold text-sm uppercase tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all duration-300 mt-4"
              >
                Book A Table
              </a>
          </div>
        </div>
      </nav>

      {/* Services Modal */}
      <ServicesModal 
        isOpen={isServiceModalOpen} 
        onClose={() => setIsServiceModalOpen(false)} 
        contactInfo={contactInfo}
      />
    </>
  );
};

export default Navbar;