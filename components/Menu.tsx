
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Utensils, Loader2, ArrowLeft, X, Minus, Plus, Award, ChevronRight, Truck, Coffee, Sofa, Coins, CreditCard, Search as SearchIcon, Star, Zap, Info } from 'lucide-react';
import { MenuItem, MenuCategory, Order, OrderType, UserProfile, UserCategory, PaymentMode } from '../types';
import { getOptimizedImageURL } from '../constants';

interface MenuProps {
  whatsappNumber: string;
  user: User | null;
  currentPoints: number;
  onNavigate: () => void;
}

const Menu: React.FC<MenuProps> = ({ whatsappNumber, user, currentPoints, onNavigate }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<MenuItem | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('upi');
  
  const [orderFormData, setOrderFormData] = useState({
    name: '', 
    phone: '', 
    address: '', 
    quantity: 1, 
    notes: '',
    type: 'delivery' as OrderType
  });

  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, "menuCategories"), orderBy("categoryName")), (snap) => {
      setCategories(snap.docs.map(d => ({ ...d.data(), id: d.id } as MenuCategory)));
    });

    const unsubItems = onSnapshot(query(collection(db, "menuItems"), orderBy("itemName")), (snap) => {
      setItems(snap.docs.map(d => ({ ...d.data(), id: d.id } as MenuItem)));
      setLoading(false);
    });

    let unsubProfile = () => {};
    if (user) {
      unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      });
    }

    return () => { unsubCats(); unsubItems(); unsubProfile(); };
  }, [user]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.available) return false;
      const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory ? item.categoryId === activeCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, activeCategory]);

  const handleOrderClick = (item: MenuItem) => {
    if (!user) {
      alert("Please login or register to place an order.");
      onNavigate();
      return;
    }
    setSelectedOrderItem(item);
    setSelectedPaymentMode('upi');
    setIsOrderModalOpen(true);
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderItem || !user) return;

    const totalAmount = Number(selectedOrderItem.price) * orderFormData.quantity;
    const rate = userProfile?.role === 'subscriber' ? 0.15 : 0.10;
    const potentialPoints = Math.floor(totalAmount * rate);
    const userType: UserCategory = userProfile?.role === 'subscriber' ? 'subscriber' : 'registered';
    
    // Reverted point redemption logic to standard earn-only or simple deduction
    const requiredRedeemPoints = totalAmount; // Simplified back to 1:1 or previous logic

    if (selectedPaymentMode === 'points' && (userProfile?.points || 0) < requiredRedeemPoints) {
      alert(`Insufficient points! You need ${requiredRedeemPoints} but have ${userProfile?.points || 0}.`);
      return;
    }

    const orderData: Order = {
      userId: user.uid,
      userType: userType,
      userName: orderFormData.name,
      userPhone: orderFormData.phone,
      address: orderFormData.address,
      itemName: selectedOrderItem.itemName,
      orderType: orderFormData.type,
      orderAmount: totalAmount,
      quantity: orderFormData.quantity,
      status: 'pending',
      paymentMode: selectedPaymentMode,
      pointsUsed: selectedPaymentMode === 'points' ? requiredRedeemPoints : 0,
      amountEquivalent: selectedPaymentMode === 'points' ? totalAmount : 0,
      pointsDeducted: false,
      pointsEarned: selectedPaymentMode === 'points' ? 0 : potentialPoints,
      pointsCredited: false,
      notes: orderFormData.notes,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      const message = `*NEW ORDER - ${orderFormData.type.replace('_', ' ').toUpperCase()}*\n` +
                      `*ID:* ${docRef.id}\n` +
                      `*Item:* ${selectedOrderItem.itemName}\n` +
                      `*Qty:* ${orderFormData.quantity}\n` +
                      `*Total:* ₹${totalAmount}\n` +
                      `*Mode:* ${selectedPaymentMode.toUpperCase()}\n` +
                      `*Name:* ${orderFormData.name}\n*Phone:* ${orderFormData.phone}`;

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      setIsOrderModalOpen(false);
      alert("Order submitted! Track in dashboard.");
    } catch (err) { alert("Error processing order."); }
  };

  const getCleanPrice = (item: MenuItem | null) => Number(item?.price || 0);

  if (loading) return (
    <div className="flex justify-center py-40"><Loader2 className="animate-spin text-brand-gold" size={48} /></div>
  );

  return (
    <section id="menu" className="py-24 bg-white min-h-screen relative">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Loyalty Card */}
        {user && (
          <div className="mb-12 bg-brand-dark p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between border border-brand-gold/30 shadow-2xl animate-fade-in-up">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold"><Award size={36} /></div>
                <div>
                   <h4 className="text-white font-display text-xl tracking-widest uppercase">Member Privilege</h4>
                   <p className="text-gray-400 text-sm uppercase font-bold tracking-widest mt-1">Earn {userProfile?.role === 'subscriber' ? '15%' : '10%'} Bonus Points</p>
                </div>
             </div>
             <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-brand-gold font-display">{currentPoints}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Spendable Balance</div>
             </div>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center mb-16">
          <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs mb-3">Chef's Signature Selection</h3>
          <h2 className="text-5xl font-serif font-bold text-brand-black">
            {activeCategory ? categories.find(c => c.id === activeCategory)?.categoryName : "Global Culinary Map"}
          </h2>
          <div className="w-32 h-1 bg-brand-gold mx-auto mt-6"></div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-16">
          <div className="w-full max-w-md relative group">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-gold transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by dish name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-cream border border-gray-100 rounded-full py-5 px-14 focus:outline-none focus:border-brand-gold transition-all shadow-sm font-sans"
            />
          </div>
        </div>

        {!activeCategory && !searchQuery ? (
          /* Category Browsing Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setActiveCategory(cat.id!)}
                className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-2xl bg-brand-black transform transition-all duration-700 hover:-translate-y-2"
              >
                <img 
                  src={getOptimizedImageURL(cat.backgroundImageURL)} 
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 opacity-60" 
                  alt={cat.categoryName} 
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Chef’s+Jalsa')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/20 to-transparent z-10"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-8">
                  <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 tracking-widest">{cat.categoryName}</h3>
                  <p className="text-gray-300 text-xs uppercase tracking-widest mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 line-clamp-2 italic">"{cat.description}"</p>
                  <div className="flex items-center gap-3 text-brand-gold bg-brand-gold/10 px-6 py-2 rounded-full border border-brand-gold/20 transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Explore Selection</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Items Listing Mode */
          <div className="animate-fade-in">
            <button 
              onClick={() => { setActiveCategory(null); setSearchQuery(''); }} 
              className="mb-12 flex items-center gap-3 text-brand-gold font-bold uppercase text-[10px] tracking-widest hover:translate-x-[-5px] transition-transform"
            >
              <ArrowLeft size={16} /> Back to Categories
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="h-64 relative overflow-hidden">
                    <img 
                      src={getOptimizedImageURL(item.itemImageURL)} 
                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-1000" 
                      alt={item.itemName} 
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Chef’s+Jalsa')}
                    />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-lg ${item.itemType === 'veg' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {item.itemType}
                      </span>
                      {item.recommended && (
                        <span className="bg-brand-gold text-brand-black px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                          <Star size={10} fill="currentColor" /> Chef Pick
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-serif font-bold text-2xl text-brand-black">{item.itemName}</h4>
                      <span className="text-brand-gold font-bold text-xl">₹{item.price}</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed italic">"{item.description}"</p>
                    <button 
                      onClick={() => handleOrderClick(item)} 
                      className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all shadow-xl active:scale-95"
                    >
                      {user ? 'Add to Jalsa Cart' : 'View Options'}
                    </button>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-6">
                   <Info className="text-gray-200" size={64} />
                   <p className="text-gray-400 font-serif italic text-xl">No dishes match your specific preference right now.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {isOrderModalOpen && selectedOrderItem && user && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-fade-in-up shadow-2xl flex flex-col max-h-[95vh]">
            <div className="p-8 bg-brand-dark text-white flex justify-between items-center shrink-0 border-b border-brand-gold/20">
              <div>
                <h3 className="text-3xl font-display font-bold text-brand-gold tracking-widest uppercase">Order Summary</h3>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em] mt-2">Secure Checkout Process</p>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            
            <form onSubmit={submitOrder} className="p-8 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'delivery', label: 'Delivery', icon: Truck },
                  { id: 'table_booking', label: 'Dine-In', icon: Coffee },
                  { id: 'cabin_booking', label: 'Cabin', icon: Sofa }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderFormData({...orderFormData, type: type.id as OrderType})}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all ${orderFormData.type === type.id ? 'border-brand-gold bg-brand-gold/5 text-brand-gold' : 'border-gray-50 text-gray-300 hover:border-gray-100'}`}
                  >
                    <type.icon size={24} className="mb-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-8">
                <div className="flex-1">
                  <span className="font-bold text-2xl text-brand-black block mb-1">{selectedOrderItem.itemName}</span>
                  <span className="text-brand-gold font-bold">₹{selectedOrderItem.price} / plate</span>
                </div>
                <div className="flex items-center gap-6 bg-gray-50 p-3 rounded-2xl border border-gray-100 shadow-inner">
                  <button type="button" className="p-2 hover:bg-gray-200 rounded-lg" onClick={() => setOrderFormData({...orderFormData, quantity: Math.max(1, orderFormData.quantity-1)})}><Minus size={20}/></button>
                  <span className="font-bold text-xl w-8 text-center">{orderFormData.quantity}</span>
                  <button type="button" className="p-2 hover:bg-gray-200 rounded-lg" onClick={() => setOrderFormData({...orderFormData, quantity: orderFormData.quantity+1})}><Plus size={20}/></button>
                </div>
              </div>

              <div className="space-y-5">
                <input type="text" placeholder="Full Name" required value={orderFormData.name} className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-brand-gold outline-none font-sans" onChange={e => setOrderFormData({...orderFormData, name: e.target.value})} />
                <input type="tel" placeholder="WhatsApp Contact" required value={orderFormData.phone} className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-brand-gold outline-none font-sans" onChange={e => setOrderFormData({...orderFormData, phone: e.target.value})} />
                <textarea placeholder={orderFormData.type === 'delivery' ? "Precise Delivery Address" : "Dining Preference (Near Window, AC, etc)"} required value={orderFormData.address} className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-brand-gold outline-none h-28 resize-none font-sans" onChange={e => setOrderFormData({...orderFormData, address: e.target.value})} />
              </div>

              <div className="bg-brand-black p-6 rounded-2xl border border-brand-gold/20 flex items-center justify-between shadow-lg">
                <div>
                   <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Estimated Total</span>
                   <span className="text-3xl font-display font-bold text-brand-gold">₹{getCleanPrice(selectedOrderItem) * orderFormData.quantity}</span>
                </div>
                <div className="text-right">
                   <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Rewards To Earn</span>
                   <span className="text-xl font-display font-bold text-brand-red">+{Math.floor(getCleanPrice(selectedOrderItem) * orderFormData.quantity * (userProfile?.role === 'subscriber' ? 0.15 : 0.10))} Pts</span>
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-brand-gold text-brand-black font-bold uppercase tracking-[0.3em] text-xs rounded-2xl shadow-2xl hover:bg-brand-black hover:text-white transition-all transform active:scale-95">
                Confirm & Place Order
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Menu;
