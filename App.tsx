
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
import { CONTACT_SHEET_URL, RESTAURANT_INFO } from './constants';
import { ContactInfo } from './types';
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
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    phone: RESTAURANT_INFO.phone,
    whatsapp: RESTAURANT_INFO.whatsapp,
    address: RESTAURANT_INFO.address,
    facebook: '#',
    instagram: '#',
    email: 'contact@chefsjalsa.com',
    hours: RESTAURANT_INFO.hours
  });

  const isAdmin = user?.email === 'admin@chefsjalsa.com';

  useEffect(() => {
    // Capture referral code from URL immediately on page load
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("Captured referral code from URL:", ref);
      setCapturedReferralCode(ref);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser?.email === 'admin@chefsjalsa.com') {
        setCurrentView('admin');
      } else if (!currentUser && currentView === 'admin') {
        // Force reset to home view only if staff was logged in
        setCurrentView('home');
      }
    });

    const fetchContactInfo = async () => {
      try {
        const response = await fetch(CONTACT_SHEET_URL);
        if (response.ok) {
          const csvText = await response.text();
          const parsedData = parseContactCSV(csvText);
          if (parsedData) setContactInfo(parsedData);
        }
      } catch (error) {
        console.error("Error fetching contact info:", error);
      }
    };

    fetchContactInfo();
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || isAdmin) {
      setPoints(0);
      return;
    }
    const unsubscribePoints = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setPoints(doc.data().points || 0);
      }
    });
    return () => unsubscribePoints();
  }, [user, isAdmin]);

  const parseContactCSV = (csvText: string): ContactInfo | null => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return null;
    const dataRow = lines[1].split(',');
    return {
      phone: dataRow[0] || RESTAURANT_INFO.phone,
      whatsapp: dataRow[1]?.replace(/\D/g, '') || RESTAURANT_INFO.whatsapp,
      address: dataRow[2] || RESTAURANT_INFO.address,
      facebook: dataRow[3] || '#',
      instagram: dataRow[4] || '#',
      email: dataRow[5] || 'contact@chefsjalsa.com',
      hours: dataRow[6] || RESTAURANT_INFO.hours
    };
  };

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

  if (isAdmin) {
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
            <Hero contactInfo={contactInfo} />
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
            adminMode={isAdmin}
            adminOnlyRequest={currentView === 'admin'}
            referralCodeFromUrl={capturedReferralCode}
          />
        )}
      </main>

      <ContactFooter contactInfo={contactInfo} onAdminLogin={() => navigateTo('admin')} />
      <FloatingButtons phone={contactInfo.phone} whatsappNumber={contactInfo.whatsapp} />
    </div>
  );
};

export default App;
