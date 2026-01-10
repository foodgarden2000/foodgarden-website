
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Menu from './components/Menu';
import FestiveSpecials from './components/FestiveSpecials';
import Gallery from './components/Gallery';
import Testimonials from './components/Testimonials';
import Reservation from './components/Reservation';
import ContactFooter from './components/ContactFooter';
import FloatingButtons from './components/FloatingButtons';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import BookOnlineModal from './components/BookOnlineModal';
import { RESTAURANT_INFO } from './constants';
import { ContactInfo, UserProfile } from './types'; 
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

type ViewState = 'home' | 'dashboard' | 'admin';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [capturedReferralCode, setCapturedReferralCode] = useState<string | null>(null);
  const [isBookOnlineOpen, setIsBookOnlineOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    phone: RESTAURANT_INFO.phone,
    whatsapp: RESTAURANT_INFO.whatsapp,
    address: RESTAURANT_INFO.address,
    facebook: '#',
    instagram: '#',
    email: 'contact@foodgarden.com',
    hours: RESTAURANT_INFO.hours
  });

  const ADMIN_EMAIL = 'foodg808@gmail.com';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("Captured referral code from URL:", ref);
      setCapturedReferralCode(ref);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser?.email === ADMIN_EMAIL) {
        setCurrentView('admin');
      } else {
        // Ensure regular users or freshly logged in users land on the home page first
        setCurrentView('home');
      }
    });

    // Connect to Firebase for Contact Info
    const unsubscribeContact = onSnapshot(doc(db, "settings", "contact"), (snap) => {
      if (snap.exists()) {
        setContactInfo(snap.data() as ContactInfo);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeContact();
    };
  }, []);

  useEffect(() => {
    if (!user || user.email === ADMIN_EMAIL) return;

    const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (!snap.exists()) return;
      
      const profile = snap.data() as UserProfile;
      setPoints(profile.points || 0);
    });

    return () => unsubscribeProfile();
  }, [user]);

  const handleAdminLogout = () => {
    signOut(auth).then(() => {
      setCurrentView('home');
    }).catch(err => {
      console.error("Logout failed", err);
      setUser(null);
      setCurrentView('home');
    });
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-brand-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user?.email === ADMIN_EMAIL) {
    return <AdminDashboard onClose={handleAdminLogout} />;
  }

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="font-sans text-gray-900 bg-brand-cream min-h-screen flex flex-col">
      <Navbar 
        contactInfo={contactInfo} 
        points={points} 
        user={user} 
        onNavigate={navigateTo}
        currentView={currentView}
      />
      
      <main className="flex-grow">
        {currentView === 'home' && (
          <>
            <Hero contactInfo={contactInfo} onBookOnline={() => setIsBookOnlineOpen(true)} />
            <About />
            <FestiveSpecials whatsappNumber={contactInfo.whatsapp} />
            <Menu 
              whatsappNumber={contactInfo.whatsapp} 
              user={user} 
              currentPoints={points} 
              onNavigate={() => navigateTo('dashboard')} 
            />
            <Gallery />
            <Reservation 
              whatsappNumber={contactInfo.whatsapp} 
              user={user}
              onNavigate={() => navigateTo('dashboard')}
            />
            <Testimonials />
          </>
        )}

        {(currentView === 'dashboard' || currentView === 'admin') && (
          <Dashboard 
            user={user} 
            points={points} 
            onBack={() => navigateTo('home')} 
            adminMode={user?.email === ADMIN_EMAIL}
            adminOnlyRequest={currentView === 'admin'}
            referralCodeFromUrl={capturedReferralCode}
          />
        )}
      </main>

      <ContactFooter contactInfo={contactInfo} onAdminLogin={() => navigateTo('admin')} />
      <FloatingButtons phone={contactInfo.phone} whatsappNumber={contactInfo.whatsapp} />
      
      <BookOnlineModal 
        isOpen={isBookOnlineOpen} 
        onClose={() => setIsBookOnlineOpen(false)} 
        user={user} 
        onNavigate={navigateTo}
        whatsappNumber={contactInfo.whatsapp}
      />
    </div>
  );
};

export default App;
