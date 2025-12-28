
import React, { useState, useEffect } from 'react';
import { Menu as MenuIcon, X, Award, LogOut, User, LayoutDashboard, LogIn, Zap } from 'lucide-react';
import { ContactInfo } from '../types';
import { auth } from '../firebase';
import { signOut, User as FirebaseUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import ServicesModal from './ServicesModal';

interface NavbarProps {
  contactInfo: ContactInfo;
  points: number;
  user: FirebaseUser | null;
  onNavigate: (view: 'home' | 'dashboard' | 'admin') => void;
  currentView: string;
}

const Navbar: React.FC<NavbarProps> = ({ contactInfo, points, user, onNavigate, currentView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    
    if (currentView !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const element = document.getElementById(href.replace('#', ''));
        if (element) {
          window.scrollTo({ top: element.offsetTop - 90, behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(href.replace('#', ''));
      if (element) {
        window.scrollTo({ top: element.offsetTop - 90, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled || currentView !== 'home' ? 'glass py-3 shadow-xl' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
          <button onClick={() => onNavigate('home')} className="flex flex-col items-center">
            <h1 className="text-2xl font-display font-bold text-brand-gold tracking-widest">FOOD GARDEN</h1>
            <div className="h-0.5 w-12 bg-brand-gold"></div>
          </button>

          {/* Desktop */}
          <div className="hidden lg:flex items-center space-x-8">
            {['About', 'Festivals', 'Menu', 'Contact'].map(link => (
              <a 
                key={link} 
                href={`#${link.toLowerCase()}`} 
                onClick={e => handleLinkClick(e, `#${link.toLowerCase()}`)}
                className="text-white hover:text-brand-gold text-xs font-semibold uppercase tracking-widest transition-colors"
              >
                {link}
              </a>
            ))}

            <button 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 px-6 py-2 border border-brand-gold text-brand-gold font-bold text-xs uppercase hover:bg-brand-gold hover:text-brand-black transition-all"
            >
              {user ? (
                <>
                  <LayoutDashboard size={14} /> Dashboard
                </>
              ) : (
                <>
                  <LogIn size={14} /> Login
                </>
              )}
            </button>
          </div>

          <button className="lg:hidden text-brand-gold" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <MenuIcon size={28} />}
          </button>
        </div>

        {/* Mobile Overlay */}
        <div className={`lg:hidden fixed inset-0 bg-brand-black/95 transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col items-center justify-center h-full space-y-8">
              {['Home', 'About', 'Menu', 'Gallery', 'Contact'].map(link => (
                <a 
                  key={link} 
                  href={`#${link.toLowerCase()}`} 
                  onClick={e => handleLinkClick(e, `#${link.toLowerCase()}`)} 
                  className="text-2xl text-white font-serif uppercase tracking-widest"
                >
                  {link}
                </a>
              ))}
              
              <div className="flex flex-col gap-4 w-full px-12">
                <button 
                  onClick={() => { onNavigate('dashboard'); setIsOpen(false); }}
                  className="w-full py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest text-sm rounded-full flex items-center justify-center gap-2"
                >
                  {user ? <LayoutDashboard size={18} /> : <LogIn size={18} />}
                  {user ? "Dashboard" : "Sign In"}
                </button>
              </div>

              {user && (
                <button 
                  onClick={() => { signOut(auth); setIsOpen(false); }} 
                  className="text-brand-red font-bold uppercase tracking-widest text-sm flex items-center gap-2 pt-8"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              )}
          </div>
        </div>
      </nav>
      <ServicesModal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} contactInfo={contactInfo} />
    </>
  );
};

export default Navbar;
