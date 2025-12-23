
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Utensils, Loader2, ArrowLeft, X, Minus, Plus, Award, ChevronRight, Truck, Coffee, Sofa, Coins, CreditCard, Search as SearchIcon, Star, Zap } from 'lucide-react';
import { MenuItem, MenuCategory, CategoryConfig, Order, OrderType, UserProfile, UserCategory, PaymentMode } from '../types';
import { getOptimizedImageURL } from '../constants';

interface MenuProps {
  whatsappNumber: string;
  user: User | null;
  currentPoints: number;
  onNavigate: () => void;
}

const Menu: React.FC<MenuProps> = ({ whatsappNumber, user, currentPoints, onNavigate }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('All');
  const [uniqueCategoriesFromItems, setUniqueCategoriesFromItems] = useState<string[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<MenuItem | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('upi');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [orderFormData, setOrderFormData] = useState({
    name: '', 
    phone: '', 
    address: '', 
    quantity: 1, 
    notes: '',
    type: 'delivery' as OrderType
  });

  useEffect(() => {
    // Fetch Visual Category Management Data
    const unsubCats = onSnapshot(query(collection(db, "menuCategories"), orderBy("categoryName")), (snapshot) => {
      setMenuCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuCategory)));
    });

    const qMenu = query(collection(db, "menu"), orderBy("name"));
    const unsubMenu = onSnapshot(qMenu, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem));
      setItems(fetchedItems);
      const cats = Array.from(new Set(fetchedItems.map(i => i.category))).sort() as string[];
      setUniqueCategoriesFromItems(cats);
      setLoading(false);
    });

    let unsubProfile = () => {};
    if (user) {
      unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      });
    }

    return () => { unsubCats(); unsubMenu(); unsubProfile(); };
  }, [user]);

  // Derived visible categories (only active ones)
  const activeMenuCategories = menuCategories.filter(c => c.isActive);

  const filteredItems = items.filter(item => {
    // Only show available items
    if (item.isAvailable === false) return false;

    // Strict Mode: Only show items belonging to ACTIVE categories
    const categoryConfig = menuCategories.find(c => c.categoryName === item.category);
    if (categoryConfig && !categoryConfig.isActive) return false;

    const matchesSearch = (item.itemName || item.name).toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory ? item.category === activeCategory : true;
    
    const type = item.categoryType || (item.isVegetarian ? 'Veg' : 'Special');
    const matchesType = activeTypeFilter === 'All' ? true : type === activeTypeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const calculatePotentialPoints = (priceStr: string | number, quantity: number) => {
    let cleanPrice = 0;
    if (typeof priceStr === 'number') {
      cleanPrice = priceStr;
    } else {
      cleanPrice = parseInt(priceStr?.replace(/\D/g, '') || '0');
    }
    const total = cleanPrice * quantity;
    const rate = userProfile?.role === 'subscriber' ? 0.15 : 0.10;
    return Math.floor(total * rate);
  };

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

    let totalAmount = 0;
    if (selectedOrderItem.priceNum) {
      totalAmount = selectedOrderItem.priceNum * orderFormData.quantity;
    } else {
      const cleanPrice = parseInt(selectedOrderItem.price?.replace(/\D/g, '') || "0");
      totalAmount = cleanPrice * orderFormData.quantity;
    }

    const potentialPoints = calculatePotentialPoints(selectedOrderItem.priceNum || selectedOrderItem.price || 0, orderFormData.quantity);
    const userType: UserCategory = userProfile?.role === 'subscriber' ? 'subscriber' : 'registered';
    const requiredPoints = totalAmount * 2;

    if (selectedPaymentMode === 'points' && (userProfile?.points || 0) < requiredPoints) {
      alert(`Insufficient points! You need ${requiredPoints} points but have ${userProfile?.points || 0}.`);
      return;
    }

    const orderData: Order = {
      userId: user.uid,
      userType: userType,
      userName: orderFormData.name,
      userPhone: orderFormData.phone,
      address: orderFormData.address,
      itemName: selectedOrderItem.itemName || selectedOrderItem.name,
      orderType: orderFormData.type,
      orderAmount: totalAmount,
      quantity: orderFormData.quantity,
      status: 'pending',
      paymentMode: selectedPaymentMode,
      pointsUsed: selectedPaymentMode === 'points' ? requiredPoints : 0,
      amountEquivalent: selectedPaymentMode === 'points' ? totalAmount : 0,
      pointsDeducted: false,
      pointsEarned: selectedPaymentMode === 'points' ? 0 : potentialPoints,
      pointsCredited: false,
      notes: orderFormData.notes,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      const message = `*NEW ${orderFormData.type.replace('_', ' ').toUpperCase()} (${userType.toUpperCase()}) - Chef's Jalsa*\n` +
                      `*Order ID:* ${docRef.id}\n` +
                      `*Item:* ${selectedOrderItem.itemName || selectedOrderItem.name}\n` +
                      `*Qty:* ${orderFormData.quantity}\n` +
                      `*Total:* ₹${orderData.orderAmount}\n` +
                      `*Payment Mode:* ${selectedPaymentMode.toUpperCase()}\n` +
                      (selectedPaymentMode === 'points' ? `*Points to Use:* ${orderData.pointsUsed}\n` : '') +
                      `\n*Customer Details:*\n👤 ${orderFormData.name}\n📞 ${orderFormData.phone}\n📍 ${orderFormData.address}\n` +
                      (orderFormData.notes ? `📝 Notes: ${orderFormData.notes}\n` : '') +
                      (selectedPaymentMode === 'points' ? `\n_Points will be deducted upon delivery!_` : `\n_Points will be credited upon completion!_`);

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      setIsOrderModalOpen(false);
      alert(selectedPaymentMode === 'points' 
        ? "Order submitted via Points!" 
        : "Order submitted successfully! Track status in your dashboard.");
    } catch (err) { 
      console.error(err);
      alert("Error processing order.");
    }
  };

  const getCleanPrice = (item: MenuItem | null) => {
    if (!item) return 0;
    if (item.priceNum) return item.priceNum;
    return parseInt(item.price?.replace(/\D/g, '') || "0");
  };

  const totalAmountRedeem = getCleanPrice(selectedOrderItem) * orderFormData.quantity;
  const requiredRedeemPoints = totalAmountRedeem * 2;
  const hasEnoughPoints = (userProfile?.points || 0) >= requiredRedeemPoints;

  return (
    <section id="menu" className="py-24 bg-white min-h-screen relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        {user && (
          <div className="mb-12 bg-brand-dark p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between border border-brand-gold/30 shadow-xl gap-4">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold"><Award size={32} /></div>
                <div>
                   <h4 className="text-white font-display text-xl">Loyalty Rewards</h4>
                   <p className="text-gray-400 text-sm">Earn {userProfile?.role === 'subscriber' ? '15%' : '10%'} points</p>
                </div>
             </div>
             <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-brand-gold">{currentPoints}</div>
                <div className="text-gray-400 text-xs uppercase tracking-widest">Available Points (₹{currentPoints / 2})</div>
             </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h3 className="text-brand-gold font-sans font-bold uppercase tracking-[0.2em] text-xs mb-3">Delicious Collection</h3>
          <h2 className="text-5xl font-serif font-bold text-brand-black">{activeCategory || "Explore Our Kitchen"}</h2>
          <div className="w-32 h-1 bg-brand-gold mx-auto mt-6"></div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
          {/* Search Bar */}
          <div className="w-full max-w-md relative group">
            <input 
              type="text" 
              placeholder="Search dishes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-cream border border-gray-200 rounded-full py-4 px-12 focus:outline-none focus:border-brand-gold transition-all shadow-sm"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-gold" size={20} />
          </div>

          {/* Type Filter */}
          <div className="flex bg-brand-cream p-1 rounded-full border border-gray-200 shadow-sm">
             {['All', 'Veg', 'Non-Veg', 'Special'].map(type => (
               <button 
                 key={type} 
                 onClick={() => setActiveTypeFilter(type)}
                 className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTypeFilter === type ? 'bg-brand-dark text-white shadow-md' : 'text-gray-500 hover:text-brand-dark'}`}
               >
                 {type}
               </button>
             ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-gold" size={48} /></div>
        ) : !activeCategory && !searchQuery ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Render categories based on Visual Category Management (menuCategories collection) */}
            {activeMenuCategories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setActiveCategory(cat.categoryName)}
                className="group relative h-72 rounded-xl overflow-hidden cursor-pointer shadow-xl bg-brand-black transition-all duration-500 hover:-translate-y-2"
              >
                <img 
                  src={getOptimizedImageURL(cat.categoryImageUrl)} 
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" 
                  alt={cat.categoryName} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent z-10"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-6">
                  <h3 className="text-4xl font-display font-bold text-white mb-4 tracking-wider">{cat.categoryName}</h3>
                  <div className="flex items-center gap-2 text-brand-gold opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">View Selection</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
            {/* Fallback for items that might be in categories not yet visuals-managed */}
            {uniqueCategoriesFromItems.filter(ci => !activeMenuCategories.some(ac => ac.categoryName === ci)).map(cat => (
              <div 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className="group relative h-72 rounded-xl overflow-hidden cursor-pointer shadow-xl bg-brand-black transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-brand-dark flex items-center justify-center opacity-40">
                  <Utensils className="text-brand-gold/20 w-32 h-32" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent z-10"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-6">
                  <h3 className="text-4xl font-display font-bold text-white mb-4 tracking-wider">{cat}</h3>
                  <div className="flex items-center gap-2 text-brand-gold opacity-100 transition-all transform translate-y-0">
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Explore</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => { setActiveCategory(null); setSearchQuery(''); }} className="mb-8 flex items-center text-brand-gold font-bold uppercase text-xs hover:gap-3 transition-all">
              <ArrowLeft className="mr-2" /> Back
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="h-64 bg-gray-100 relative overflow-hidden">
                    {item.backgroundImageUrl || item.image ? (
                      <img src={getOptimizedImageURL(item.backgroundImageUrl || item.image || '')} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" alt={item.itemName || item.name} />
                    ) : (
                      <div className="flex items-center justify-center h-full"><Utensils className="text-gray-300" size={48} /></div>
                    )}
                    
                    {/* Status Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className="bg-brand-black/60 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">{item.category}</span>
                      {item.isNewItem && (
                        <span className="bg-blue-500 text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-lg w-fit">
                          <Zap size={10} fill="currentColor" /> New Arrival
                        </span>
                      )}
                      {item.isRecommended && (
                        <span className="bg-brand-gold text-brand-black text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-lg w-fit">
                          <Star size={10} fill="currentColor" /> Chef Recommended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-serif font-bold text-2xl text-brand-dark">{item.itemName || item.name}</h4>
                      <span className="text-brand-gold font-bold text-lg">{item.priceNum ? `₹${item.priceNum}` : item.price}</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed">{item.description}</p>
                    <button onClick={() => handleOrderClick(item)} className="w-full py-4 bg-brand-dark text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all shadow-md active:scale-95">
                      {user ? 'Order & Earn Points' : 'Order Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOrderModalOpen && selectedOrderItem && user && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in-up shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-brand-dark text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-serif">Checkout</h3>
                <p className="text-xs text-brand-gold tracking-widest uppercase mt-1">Real-Time Processing</p>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
            </div>
            
            <form onSubmit={submitOrder} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'delivery', label: 'Delivery', icon: Truck },
                  { id: 'table_booking', label: 'Table', icon: Coffee },
                  { id: 'cabin_booking', label: 'Cabin', icon: Sofa }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderFormData({...orderFormData, type: type.id as OrderType})}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${orderFormData.type === type.id ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                  >
                    <type.icon size={20} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMode('upi')}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedPaymentMode !== 'points' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-gray-100 text-gray-400'}`}
                  >
                    <CreditCard size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Normal (Cash/UPI)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMode('points')}
                    disabled={!hasEnoughPoints}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${!hasEnoughPoints ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${selectedPaymentMode === 'points' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-gray-100 text-gray-400'}`}
                  >
                    <Coins size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Redeem Points</span>
                  </button>
                </div>
              </div>

              {selectedPaymentMode === 'points' ? (
                <div className="bg-brand-black p-5 rounded-xl border border-brand-gold/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-gold/60 uppercase tracking-widest block mb-1">Points to Deduct</span>
                    <span className="text-2xl font-display font-bold text-brand-gold">-{requiredRedeemPoints} Points</span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Value: ₹{totalAmountRedeem}</p>
                  </div>
                  <Coins size={32} className="text-brand-gold" />
                </div>
              ) : (
                <div className="bg-brand-gold/10 p-5 rounded-xl border border-brand-gold/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-black/60 uppercase tracking-widest block mb-1">Potential Rewards</span>
                    <span className="text-2xl font-display font-bold text-brand-red">+{calculatePotentialPoints(selectedOrderItem.priceNum || selectedOrderItem.price || 0, orderFormData.quantity)} Points</span>
                  </div>
                  <Award size={32} className="text-brand-gold" />
                </div>
              )}
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex-1">
                  <span className="font-bold text-lg block">{selectedOrderItem.itemName || selectedOrderItem.name}</span>
                  <span className="text-gray-500 text-sm">{selectedOrderItem.priceNum ? `₹${selectedOrderItem.priceNum}` : selectedOrderItem.price} / unit</span>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <button type="button" className="p-1 hover:bg-gray-200 rounded" onClick={() => setOrderFormData({...orderFormData, quantity: Math.max(1, orderFormData.quantity-1)})}><Minus size={16}/></button>
                  <span className="font-bold w-6 text-center">{orderFormData.quantity}</span>
                  <button type="button" className="p-1 hover:bg-gray-200 rounded" onClick={() => setOrderFormData({...orderFormData, quantity: orderFormData.quantity+1})}><Plus size={16}/></button>
                </div>
              </div>

              <div className="space-y-4">
                <input type="text" placeholder="Full Name" required value={orderFormData.name} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none" onChange={e => setOrderFormData({...orderFormData, name: e.target.value})} />
                <input type="tel" placeholder="WhatsApp Number" required value={orderFormData.phone} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none" onChange={e => setOrderFormData({...orderFormData, phone: e.target.value})} />
                <textarea placeholder={orderFormData.type === 'delivery' ? "Delivery Address" : "Table/Cabin Pref"} required value={orderFormData.address} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none h-24 resize-none" onChange={e => setOrderFormData({...orderFormData, address: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-5 bg-brand-gold text-brand-black font-bold uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-brand-black hover:text-white transition-all transform active:scale-95">
                Place Real-Time Order
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Menu;
