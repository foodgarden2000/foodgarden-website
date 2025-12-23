
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Utensils, Loader2, ArrowLeft, X, Minus, Plus, Award, ChevronRight, Truck, Coffee, Sofa, Coins, CreditCard } from 'lucide-react';
import { MenuItem, CategoryConfig, Order, OrderType, UserProfile, UserCategory, PaymentMode } from '../types';
import { getOptimizedImageURL } from '../constants';

interface MenuProps {
  whatsappNumber: string;
  user: User | null;
  currentPoints: number;
  onNavigate: () => void;
}

const Menu: React.FC<MenuProps> = ({ whatsappNumber, user, currentPoints, onNavigate }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
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
      const cats = Array.from(new Set(fetchedItems.map(i => i.category))).sort() as string[];
      setUniqueCategories(cats);
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

  const calculatePotentialPoints = (priceStr: string, quantity: number) => {
    const cleanPrice = parseInt(priceStr.replace(/\D/g, '')) || 0;
    const total = cleanPrice * quantity;
    const rate = userProfile?.role === 'subscriber' ? 0.15 : 0.10;
    return Math.floor(total * rate);
  };

  const handleOrderClick = (item: MenuItem) => {
    if (!user) {
      console.log("User not logged in → redirecting to login");
      alert("Please login or register to place an order.");
      onNavigate();
      return;
    }
    setSelectedOrderItem(item);
    setSelectedPaymentMode('upi'); // Reset to default
    setIsOrderModalOpen(true);
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderItem || !user) return;

    const cleanPrice = parseInt(selectedOrderItem.price?.replace(/\D/g, '') || "0");
    const totalAmount = cleanPrice * orderFormData.quantity;
    const potentialPoints = calculatePotentialPoints(selectedOrderItem.price || "0", orderFormData.quantity);

    // Identify User Type - Only registered/subscriber allowed
    const userType: UserCategory = userProfile?.role === 'subscriber' ? 'subscriber' : 'registered';

    // Point Redemption Logic
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
      itemName: selectedOrderItem.name,
      orderType: orderFormData.type,
      orderAmount: totalAmount,
      quantity: orderFormData.quantity,
      status: 'pending',
      paymentMode: selectedPaymentMode,
      pointsUsed: selectedPaymentMode === 'points' ? requiredPoints : 0,
      amountEquivalent: selectedPaymentMode === 'points' ? totalAmount : 0,
      pointsDeducted: false,
      pointsEarned: selectedPaymentMode === 'points' ? 0 : potentialPoints, // Don't earn points on point orders
      pointsCredited: false,
      notes: orderFormData.notes,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("Order Created:", docRef.id, "Payment Mode:", selectedPaymentMode);
      
      const message = `*NEW ${orderFormData.type.replace('_', ' ').toUpperCase()} (${userType.toUpperCase()}) - Chef's Jalsa*\n` +
                      `*Order ID:* ${docRef.id}\n` +
                      `*Item:* ${selectedOrderItem.name}\n` +
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
        ? "Order submitted via Points! Points will be deducted after successful delivery." 
        : "Order submitted successfully! You can track live status in your dashboard.");
    } catch (err) { 
      console.error(err);
      alert("Error processing order. Please try again.");
    }
  };

  const currentPrice = parseInt(selectedOrderItem?.price?.replace(/\D/g, '') || "0");
  const totalAmount = currentPrice * orderFormData.quantity;
  const requiredRedeemPoints = totalAmount * 2;
  const hasEnoughPoints = (userProfile?.points || 0) >= requiredRedeemPoints;

  return (
    <section id="menu" className="py-24 bg-white min-h-screen relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        
        {user && (
          <div className="mb-12 bg-brand-dark p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between border border-brand-gold/30 shadow-xl gap-4">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold">
                  <Award size={32} />
                </div>
                <div>
                   <h4 className="text-white font-display text-xl">Loyalty Rewards</h4>
                   <p className="text-gray-400 text-sm">Earn {userProfile?.role === 'subscriber' ? '15%' : '10%'} points on every delivered order</p>
                </div>
             </div>
             <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-brand-gold">{currentPoints}</div>
                <div className="text-gray-400 text-xs uppercase tracking-widest">Available Points (₹{currentPoints / 2} Value)</div>
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
                  <img src={getOptimizedImageURL(categoryConfigs[cat])} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" alt={cat} />
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
                    <button onClick={() => handleOrderClick(item)} className="w-full py-4 bg-brand-dark text-white rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all shadow-md active:scale-95">
                      {userProfile?.role === 'subscriber' ? 'Order (Premium Rate Enabled)' : user ? 'Order & Earn Points' : 'Order Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOrderModalOpen && selectedOrderItem && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
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

              {/* Payment Mode Selector */}
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
                {!hasEnoughPoints && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter text-center">
                    Insufficient points. You need {requiredRedeemPoints} points.
                  </p>
                )}
              </div>

              {selectedPaymentMode === 'points' ? (
                <div className="bg-brand-black p-5 rounded-xl border border-brand-gold/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-gold/60 uppercase tracking-widest block mb-1">Points to Deduct</span>
                    <span className="text-2xl font-display font-bold text-brand-gold">-{requiredRedeemPoints} Points</span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Value: ₹{totalAmount}</p>
                  </div>
                  <Coins size={32} className="text-brand-gold" />
                </div>
              ) : (
                <div className="bg-brand-gold/10 p-5 rounded-xl border border-brand-gold/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-black/60 uppercase tracking-widest block mb-1">Potential Rewards</span>
                    <span className="text-2xl font-display font-bold text-brand-red">+{calculatePotentialPoints(selectedOrderItem.price || "0", orderFormData.quantity)} Points</span>
                    {userProfile?.role === 'subscriber' && <p className="text-[10px] text-brand-gold font-bold uppercase mt-1">15% Premium Rate Active</p>}
                  </div>
                  <Award size={32} className="text-brand-gold" />
                </div>
              )}
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex-1">
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
                <input type="text" placeholder="Full Name" required className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none" onChange={e => setOrderFormData({...orderFormData, name: e.target.value})} />
                <input type="tel" placeholder="WhatsApp Number" required className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none" onChange={e => setOrderFormData({...orderFormData, phone: e.target.value})} />
                <textarea 
                  placeholder={orderFormData.type === 'delivery' ? "Delivery Address" : "Table/Cabin Pref (e.g. Near Window)"} 
                  required 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none h-24 resize-none" 
                  onChange={e => setOrderFormData({...orderFormData, address: e.target.value})} 
                />
                <input type="text" placeholder="Special Instructions (e.g. Extra spicy)" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-gold outline-none" onChange={e => setOrderFormData({...orderFormData, notes: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-5 bg-brand-gold text-brand-black font-bold uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-brand-black hover:text-white transition-all transform active:scale-95">
                {selectedPaymentMode === 'points' ? 'Order Using Points' : 'Place Real-Time Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Menu;
