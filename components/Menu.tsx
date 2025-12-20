
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Utensils, Loader2, ArrowLeft, X, Minus, Plus, Award, ChevronRight } from 'lucide-react';
import { MenuItem, CategoryConfig, Order } from '../types';
import { getOptimizedImageURL } from '../constants';

interface MenuProps {
  whatsappNumber: string;
  user: User | null;
  currentPoints: number;
}

const Menu: React.FC<MenuProps> = ({ whatsappNumber, user, currentPoints }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<MenuItem | null>(null);
  
  const [orderFormData, setOrderFormData] = useState({
    name: '', phone: '', address: '', quantity: 1, note: ''
  });

  useEffect(() => {
    const unsubCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      const configs: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as CategoryConfig;
        configs[data.name] = data.image;
      });
      setCategoryConfigs(configs);
    });

    const qMenu = query(collection(db, "menu"), orderBy("name"));
    const unsubMenu = onSnapshot(qMenu, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => doc.data() as MenuItem);
      setItems(fetchedItems);
      const cats = Array.from(new Set(fetchedItems.map(i => i.category))).sort();
      setUniqueCategories(cats);
      setLoading(false);
    });

    return () => { unsubCats(); unsubMenu(); };
  }, []);

  const calculatePotentialPoints = (priceStr: string, quantity: number) => {
    if (!user) return 0;
    const cleanPrice = parseInt(priceStr.replace(/\D/g, '')) || 0;
    return Math.floor(cleanPrice * quantity * 0.1); // 10% points
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderItem) return;

    const cleanPrice = parseInt(selectedOrderItem.price?.replace(/\D/g, '') || "0");
    const potentialPoints = calculatePotentialPoints(selectedOrderItem.price || "0", orderFormData.quantity);

    const orderData: Order = {
      userId: user?.uid || null,
      userName: orderFormData.name,
      userPhone: orderFormData.phone,
      address: orderFormData.address,
      itemName: selectedOrderItem.name,
      orderAmount: cleanPrice * orderFormData.quantity,
      quantity: orderFormData.quantity,
      status: 'pending',
      pointsEarned: potentialPoints,
      pointsCredited: false,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Create Order in Firestore
      await addDoc(collection(db, "orders"), orderData);

      // 2. Open WhatsApp for Customer
      const message = `*NEW ORDER - Chef's Jalsa* 🍽️\n*Item:* ${selectedOrderItem.name}\n*Price:* ${selectedOrderItem.price}\n*Quantity:* ${orderFormData.quantity}\n\n*Customer Details:*\n👤 Name: ${orderFormData.name}\n📞 Phone: ${orderFormData.phone}\n📍 Address: ${orderFormData.address}${user ? `\n\n_Points will be credited upon delivery!_` : ''}`;
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      
      setIsOrderModalOpen(false);
      alert("Order placed successfully! Redirecting to WhatsApp...");
    } catch (err) { 
      console.error(err);
      alert("Error processing order. Please try again.");
    }
  };

  return (
    <section id="menu" className="py-24 bg-white min-h-screen relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Points Display Bar - ONLY for logged in users */}
        {user && (
          <div className="mb-12 bg-brand-dark p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between border border-brand-gold/30 shadow-xl gap-4">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold">
                  <Award size={32} />
                </div>
                <div>
                   <h4 className="text-white font-display text-xl">Loyalty Rewards</h4>
                   <p className="text-gray-400 text-sm">Earn 10% points on every delivered order</p>
                </div>
             </div>
             <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-brand-gold">{currentPoints}</div>
                <div className="text-gray-400 text-xs uppercase tracking-widest">Available Points</div>
             </div>
          </div>
        )}

        <div className="text-center mb-16">
          <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs mb-3">Delicious Collection</h3>
          <h2 className="text-5xl font-serif font-bold text-brand-black">{activeCategory || "Explore Our Kitchen"}</h2>
          <div className="w-32 h-1 bg-brand-gold mx-auto mt-6"></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-gold" size={48} /></div>
        ) : !activeCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {uniqueCategories.map(cat => (
              <div 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className="group relative h-72 rounded-xl overflow-hidden cursor-pointer shadow-xl bg-brand-black transition-all duration-500 hover:-translate-y-2"
              >
                {categoryConfigs[cat] ? (
                  <img 
                    src={getOptimizedImageURL(categoryConfigs[cat])} 
                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" 
                    alt={cat} 
                  />
                ) : (
                  <div className="absolute inset-0 bg-brand-dark flex items-center justify-center opacity-40">
                    <Utensils className="text-brand-gold/20 w-32 h-32" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent z-10 transition-colors group-hover:bg-brand-black/20"></div>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-6">
                  <h3 className="text-4xl font-display font-bold text-white mb-4 tracking-wider group-hover:scale-105 transition-transform">{cat}</h3>
                  <div className="flex items-center gap-2 text-brand-gold opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">View Selection</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setActiveCategory(null)} className="mb-8 flex items-center text-brand-gold font-bold uppercase text-xs hover:gap-3 transition-all">
              <ArrowLeft className="mr-2" /> All Categories
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.filter(i => i.category === activeCategory).map((item, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="h-64 bg-gray-100 relative overflow-hidden">
                    {item.image ? (
                      <img src={getOptimizedImageURL(item.image)} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" alt={item.name} />
                    ) : (
                      <div className="flex items-center justify-center h-full"><Utensils className="text-gray-300" size={48} /></div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-serif font-bold text-2xl text-brand-dark">{item.name}</h4>
                      <span className="text-brand-gold font-bold text-lg">{item.price}</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed">{item.description}</p>
                    <button 
                      onClick={() => { setSelectedOrderItem(item); setIsOrderModalOpen(true); }}
                      className="w-full py-4 bg-brand-dark text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all shadow-md active:scale-95"
                    >
                      {user ? 'Order & Earn Points' : 'Order Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOrderModalOpen && selectedOrderItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fade-in-up shadow-2xl">
            <div className="p-6 bg-brand-dark text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-serif">Checkout</h3>
                <p className="text-xs text-brand-gold tracking-widest uppercase mt-1">Order Details</p>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
            </div>
            <form onSubmit={submitOrder} className="p-8 space-y-6">
              {user && (
                <div className="bg-brand-gold/10 p-5 rounded-xl border border-brand-gold/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-black/60 uppercase tracking-widest block mb-1">Expected Points</span>
                    <span className="text-2xl font-display font-bold text-brand-red">+{calculatePotentialPoints(selectedOrderItem.price || "0", orderFormData.quantity)}</span>
                  </div>
                  <Award size={32} className="text-brand-gold" />
                </div>
              )}
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div>
                  <span className="font-bold text-lg block">{selectedOrderItem.name}</span>
                  <span className="text-gray-500 text-sm">{selectedOrderItem.price} / unit</span>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <button type="button" className="p-1 hover:bg-gray-200 rounded" onClick={() => setOrderFormData({...orderFormData, quantity: Math.max(1, orderFormData.quantity-1)})}><Minus size={16}/></button>
                  <span className="font-bold w-6 text-center">{orderFormData.quantity}</span>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded" onClick={() => setOrderFormData({...orderFormData, quantity: orderFormData.quantity+1})}><Plus size={16}/></button>
                </div>
              </div>

              <div className="space-y-4">
                <input type="text" placeholder="Full Name" required className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none transition-all" onChange={e => setOrderFormData({...orderFormData, name: e.target.value})} />
                <input type="tel" placeholder="WhatsApp Phone Number" required className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none transition-all" onChange={e => setOrderFormData({...orderFormData, phone: e.target.value})} />
                <textarea placeholder="Delivery Address" required className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none transition-all h-24 resize-none" onChange={e => setOrderFormData({...orderFormData, address: e.target.value})}></textarea>
              </div>

              <button type="submit" className="w-full py-5 bg-brand-gold text-brand-black font-bold uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-brand-black hover:text-white transition-all transform active:scale-95">
                Confirm Order
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Menu;
