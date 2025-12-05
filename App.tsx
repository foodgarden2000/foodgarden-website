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
import { CONTACT_SHEET_URL, RESTAURANT_INFO } from './constants';
import { ContactInfo } from './types';

const App: React.FC = () => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    phone: RESTAURANT_INFO.phone,
    whatsapp: RESTAURANT_INFO.whatsapp,
    address: RESTAURANT_INFO.address,
    facebook: '#',
    instagram: '#',
    email: 'contact@chefsjalsa.com',
    hours: RESTAURANT_INFO.hours
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await fetch(CONTACT_SHEET_URL);
        if (!response.ok) throw new Error("Failed to fetch contact info");
        
        const csvText = await response.text();
        const parsedData = parseContactCSV(csvText);
        
        if (parsedData) {
          setContactInfo(parsedData);
        }
      } catch (error) {
        console.error("Error fetching contact info:", error);
      }
    };

    fetchContactInfo();
  }, []);

  const parseContactCSV = (csvText: string): ContactInfo | null => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return null;

    const splitLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    const dataRow = splitLine(lines[1]);

    // Helper to clean phone number for WhatsApp links (removes spaces, +, -, ())
    const cleanWhatsApp = (num: string) => {
      if (!num) return '';
      return num.replace(/\D/g, ''); // Removes everything except digits
    };
    
    return {
      phone: dataRow[0] || RESTAURANT_INFO.phone,
      whatsapp: dataRow[1] ? cleanWhatsApp(dataRow[1]) : RESTAURANT_INFO.whatsapp,
      address: dataRow[2] || RESTAURANT_INFO.address,
      facebook: dataRow[3] || '#',
      instagram: dataRow[4] || '#',
      email: dataRow[5] || 'contact@chefsjalsa.com',
      hours: dataRow[6] || RESTAURANT_INFO.hours
    };
  };

  return (
    <div className="font-sans text-gray-900 bg-brand-cream pb-16 md:pb-0">
      <Navbar contactInfo={contactInfo} />
      <main>
        <Hero />
        <About />
        <FestiveSpecials whatsappNumber={contactInfo.whatsapp} />
        <Menu whatsappNumber={contactInfo.whatsapp} />
        <Gallery />
        <Reservation whatsappNumber={contactInfo.whatsapp} />
        <Testimonials />
      </main>
      <ContactFooter contactInfo={contactInfo} />
      <FloatingButtons phone={contactInfo.phone} whatsappNumber={contactInfo.whatsapp} />
    </div>
  );
};

export default App;