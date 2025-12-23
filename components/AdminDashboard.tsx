
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  increment, 
  getDoc,
  query,
  where,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Trash2, Utensils, Calendar, 
  Tag, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, AlertTriangle, Zap, User, ShieldCheck, Mail, Smartphone, Loader2,
  Play, Volume2, VolumeX, Ban, Filter, BarChart3, CalendarDays, ChevronRight, Star, X, Coins, Wallet, CalendarCheck, Users, Phone, Search, CreditCard, Edit3, Image as ImageIcon, Eye, EyeOff
} from 'lucide-react';
import { MenuItem, FestivalSpecial, CategoryConfig, Order, OrderStatus, SubscriptionRequest, OrderType, UserCategory, EventBooking, UserProfile } from '../types';
import { getOptimizedImageURL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';
type OrderCategory = 'delivery' | 'table_booking' | 'cabin_booking' | 'event_booking';
type UserTypeFilter = 'all' | 'registered' | 'subscriber';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'festivals' | 'orders' | 'subscriptions'>('orders');
  const [activeOrderCategory, setActiveOrderCategory] = useState<OrderCategory>('delivery');
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('all');
  
  // Menu Management States
  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<(MenuItem & { id: string }) | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({
    itemName: '',
    priceNum: 0,
    category: '',
    categoryType: 'Veg',
    description: '',
    backgroundImageUrl: '',
    isAvailable: true,
    isRecommended: false,
    isNewItem: false
  });

  const [subscriptions, setSubscriptions] = useState<(SubscriptionRequest & { id: string })[]>([]);
  const [subView, setSubView] = useState<'requests' | 'active'>('requests');
  const [isProcessingSub, setIsProcessingSub] = useState<string | null>(null);
  const [rejectingSub, setRejectingSub] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [festivals, setFestivals] = useState<(FestivalSpecial & { id: string })[]>([]);
  const [categories, setCategories] = useState<(CategoryConfig & { id: string })[]>([]);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [eventBookings, setEventBookings] = useState<(EventBooking & { id: string })[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, UserProfile>>({});
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [actioningOrder, setActioningOrder] = useState<{id: string, action: 'reject' | 'cancel'} | null>(null);
  const [actioningBooking, setActioningBooking] = useState<{id: string, action: 'reject'} | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [customActionReason, setCustomActionReason] = useState('');

  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventInitialLoad = useRef(true);
  const eventNewAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventCancelAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    cancelAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    eventNewAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    eventCancelAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3');

    soundEnabledRef.current = isSoundEnabled;

    const unsubMenu = onSnapshot(collection(db, "menu"), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      items.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
      setMenuItems(items);
    });

    const unsubFest = onSnapshot(collection(db, "festivals"), (snapshot) => {
      setFestivals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
    });

    const unsubCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const userMap: Record<string, UserProfile> = {};
      snapshot.docs.forEach(doc => { userMap[doc.id] = doc.data() as UserProfile; });
      setAllUsers(userMap);
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      if (!isInitialLoad.current && soundEnabledRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && change.doc.data().status === 'pending') {
            audioRef.current?.play().catch(() => {});
          }
        });
      }
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
      isInitialLoad.current = false;
    });

    const unsubBookings = onSnapshot(collection(db, "eventBookings"), (snapshot) => {
      if (!eventInitialLoad.current && soundEnabledRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && change.doc.data().status === 'pending') {
            eventNewAudioRef.current?.play().catch(() => {});
          }
        });
      }
      setEventBookings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
      eventInitialLoad.current = false;
    });

    const unsubSubs = onSnapshot(collection(db, "subscription"), (snapshot) => {
      const fetchedSubs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      fetchedSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubscriptions(fetchedSubs);
    });

    return () => { 
      unsubMenu(); unsubFest(); unsubCats(); unsubOrders(); unsubBookings(); unsubSubs(); unsubUsers();
    };
  }, [isSoundEnabled]);

  // Menu Helper Functions
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.itemName || !menuForm.priceNum || !menuForm.category || !menuForm.backgroundImageUrl) {
      alert("Please fill all required fields correctly.");
      return;
    }

    try {
      const data = {
        ...menuForm,
        name: menuForm.itemName, // Backward compatibility
        price: `₹${menuForm.priceNum}`, // Backward compatibility
        updatedAt: new Date().toISOString()
      };

      if (editingMenuItem) {
        await updateDoc(doc(db, "menu", editingMenuItem.id), data);
        console.log("Menu item updated:", menuForm.itemName);
      } else {
        await addDoc(collection(db, "menu"), {
          ...data,
          createdAt: new Date().toISOString()
        });
        console.log("Menu item added:", menuForm.itemName);
      }

      setIsMenuFormOpen(false);
      setEditingMenuItem(null);
      setMenuForm({
        itemName: '',
        priceNum: 0,
        category: '',
        categoryType: 'Veg',
        description: '',
        backgroundImageUrl: '',
        isAvailable: true,
        isRecommended: false,
        isNewItem: false
      });
    } catch (err) {
      console.error(err);
      alert("Error saving menu item.");
    }
  };

  const handleToggleMenuField = async (itemId: string, field: keyof MenuItem, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, "menu", itemId), { [field]: !currentVal });
      console.log(`Menu ${field} changed:`, itemId);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditMenu = (item: MenuItem & { id: string }) => {
    setEditingMenuItem(item);
    setMenuForm({
      itemName: item.itemName || item.name,
      priceNum: item.priceNum || parseInt(item.price?.replace(/\D/g, '') || '0'),
      category: item.category,
      categoryType: item.categoryType || (item.isVegetarian ? 'Veg' : 'Special'),
      description: item.description,
      backgroundImageUrl: item.backgroundImageUrl || item.image,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
      isRecommended: item.isRecommended || false,
      isNewItem: item.isNewItem || false
    });
    setIsMenuFormOpen(true);
  };

  const handleApproveSub = async (sub: SubscriptionRequest & { id: string }) => {
    if (!window.confirm(`APPROVE Premium Status for ${sub.userName}?`)) return;
    setIsProcessingSub(sub.id);
    try {
      const now = new Date();
      const nowISO = now.toISOString();
      let expiryDate: string | null = null;
      if (sub.planType === 'yearly') {
        const expiry = new Date(now);
        expiry.setDate(expiry.getDate() + 365);
        expiryDate = expiry.toISOString();
      }
      await updateDoc(doc(db, "subscription", sub.id), { status: 'approved', updatedAt: nowISO, expiryDate: expiryDate, isExpired: false });
      await updateDoc(doc(db, "users", sub.userId), { role: 'subscriber', 'subscription.status': 'active', 'subscription.plan': sub.planType, 'subscription.startDate': nowISO, 'subscription.expiryDate': expiryDate, 'subscription.isExpired': false, 'subscription.transactionId': sub.transactionId });
      alert("Subscription approved.");
    } catch (err) { alert("Approval failed."); } finally { setIsProcessingSub(null); }
  };

  const analyticsData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    switch (timeFilter) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      case 'custom': startDate = customStartDate ? new Date(customStartDate) : new Date(0); break;
      default: startDate = new Date(0);
    }
    const endDate = (timeFilter === 'custom' && customEndDate) ? new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) : new Date();

    const filtered = orders.filter(order => {
      const d = new Date(order.createdAt);
      return d >= startDate && d <= endDate;
    });

    const calculateStats = (type: OrderType) => {
      const typeFiltered = filtered.filter(o => o.orderType === type);
      return { total: typeFiltered.length, accepted: typeFiltered.filter(o => o.status === 'accepted').length, rejected: typeFiltered.filter(o => o.status === 'rejected').length, revenue: typeFiltered.reduce((acc, o) => acc + (o.status === 'delivered' ? (o.orderAmount || 0) : 0), 0) };
    };

    return { delivery: calculateStats('delivery'), table: calculateStats('table_booking'), cabin: calculateStats('cabin_booking') };
  }, [orders, timeFilter, customStartDate, customEndDate]);

  const toggleSound = () => setIsSoundEnabled(!isSoundEnabled);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const order = orderSnap.data() as Order;
      if (newStatus === 'delivered' && order.paymentMode === 'points' && !order.pointsDeducted && order.userId) {
        await updateDoc(doc(db, "users", order.userId), { points: increment(-(order.pointsUsed || 0)) });
        await updateDoc(orderRef, { pointsDeducted: true });
      }
      if (newStatus === 'delivered' && order.paymentMode !== 'points' && order.userId && !order.pointsCredited) {
        await updateDoc(doc(db, "users", order.userId), { points: increment(order.pointsEarned || 0) });
        await updateDoc(orderRef, { pointsCredited: true });
      }
      await updateDoc(orderRef, { status: newStatus, deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null, updatedAt: new Date().toISOString() });
    } catch (err) { alert("Error updating order status."); }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      alert("Deleted successfully.");
    } catch (err) { alert("Failed to delete."); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex flex-col overflow-hidden font-sans">
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-lg"><ShoppingBag size={24} /></div>
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-gold tracking-widest uppercase">Admin Hub</h2>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Chef's Jalsa Control Panel</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center bg-brand-dark p-1 rounded-lg border border-brand-gold/10 overflow-x-auto max-w-full">
          {['orders', 'subscriptions', 'menu', 'festivals'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
              {tab === 'orders' ? <ShoppingBag size={12} /> : tab === 'subscriptions' ? <Zap size={12} /> : tab === 'menu' ? <Utensils size={12} /> : <Calendar size={12} />} {tab}
            </button>
          ))}
          <button onClick={toggleSound} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest ml-2 border ${isSoundEnabled ? 'border-brand-gold text-brand-gold bg-brand-gold/10' : 'border-gray-800 text-gray-500'}`}>
            {isSoundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />} {isSoundEnabled ? 'ALERTS ON' : 'ENABLE ALERTS'}
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest text-brand-red ml-2 border-l border-brand-gold/10 hover:bg-brand-red hover:text-white transition-all"><LogOut size={12} /> Exit</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'menu' && (
            <div className="animate-fade-in space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl">
                <div className="flex items-center gap-6">
                  <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold"><Utensils size={24} /></div>
                  <div>
                    <h3 className="text-xl font-display text-white uppercase tracking-widest">Menu Management</h3>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Organize items and promotional status</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                     <input 
                       type="text" 
                       placeholder="Search items..." 
                       value={menuSearch}
                       onChange={(e) => setMenuSearch(e.target.value)}
                       className="w-full bg-black/40 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-xs text-white focus:border-brand-gold outline-none"
                     />
                   </div>
                   <button 
                     onClick={() => { setEditingMenuItem(null); setMenuForm({ itemName: '', priceNum: 0, category: '', categoryType: 'Veg', description: '', backgroundImageUrl: '', isAvailable: true, isRecommended: false, isNewItem: false }); setIsMenuFormOpen(true); }}
                     className="px-6 py-2.5 bg-brand-gold text-brand-black rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all whitespace-nowrap"
                   >
                     <Plus size={14} /> Add Item
                   </button>
                </div>
              </div>

              <div className="bg-brand-dark/40 border border-brand-gold/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/50 text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em] border-b border-white/5">
                        <th className="px-8 py-5">Item Details</th>
                        <th className="px-8 py-5">Category & Type</th>
                        <th className="px-8 py-5 text-center">Status Toggles</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {menuItems.filter(item => (item.itemName || item.name).toLowerCase().includes(menuSearch.toLowerCase())).map(item => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/5 bg-gray-900 flex items-center justify-center text-gray-700">
                                {item.backgroundImageUrl || item.image ? (
                                  <img src={getOptimizedImageURL(item.backgroundImageUrl || item.image || '')} className="w-full h-full object-cover" alt="" />
                                ) : <ImageIcon size={20} />}
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm">{item.itemName || item.name}</h4>
                                <p className="text-brand-gold font-bold text-xs">{item.priceNum ? `₹${item.priceNum}` : item.price}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">{item.category}</span>
                              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block w-fit ${item.categoryType === 'Veg' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                {item.categoryType || (item.isVegetarian ? 'Veg' : 'Special')}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-4">
                              <button 
                                onClick={() => handleToggleMenuField(item.id, 'isAvailable', item.isAvailable !== undefined ? item.isAvailable : true)}
                                className={`flex flex-col items-center gap-1 group/btn ${item.isAvailable === false ? 'text-gray-600' : 'text-green-500'}`}
                                title="Availability"
                              >
                                {item.isAvailable === false ? <EyeOff size={16} /> : <Eye size={16} />}
                                <span className="text-[7px] font-bold uppercase">Live</span>
                              </button>
                              <button 
                                onClick={() => handleToggleMenuField(item.id, 'isRecommended', !!item.isRecommended)}
                                className={`flex flex-col items-center gap-1 ${item.isRecommended ? 'text-brand-gold' : 'text-gray-600'}`}
                                title="Recommend"
                              >
                                <Star size={16} fill={item.isRecommended ? "currentColor" : "none"} />
                                <span className="text-[7px] font-bold uppercase">Star</span>
                              </button>
                              <button 
                                onClick={() => handleToggleMenuField(item.id, 'isNewItem', !!item.isNewItem)}
                                className={`flex flex-col items-center gap-1 ${item.isNewItem ? 'text-blue-500' : 'text-gray-600'}`}
                                title="New Item"
                              >
                                <Zap size={16} fill={item.isNewItem ? "currentColor" : "none"} />
                                <span className="text-[7px] font-bold uppercase">New</span>
                              </button>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEditMenu(item)} className="p-2 text-gray-500 hover:text-brand-gold transition-colors"><Edit3 size={16} /></button>
                              <button onClick={() => deleteItem('menu', item.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="animate-fade-in space-y-10">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl">
                <div className="flex items-center gap-6">
                  <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold"><BarChart3 size={24} /></div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-display text-white uppercase tracking-widest">Orders & Bookings</h3>
                    <span className="text-[10px] text-brand-gold uppercase font-bold tracking-widest">{timeFilter} range</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {['today', 'week', 'month', 'year', 'custom'].map(f => (
                    <button key={f} onClick={() => setTimeFilter(f as any)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${timeFilter === f ? 'bg-brand-gold text-brand-black border-brand-gold' : 'text-gray-500 border-gray-800 hover:text-white'}`}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex gap-2 p-1 bg-brand-dark/40 rounded-2xl border border-brand-gold/10">
                  {[
                    { id: 'delivery', label: 'Delivery', icon: Truck },
                    { id: 'table_booking', label: 'Tables', icon: Coffee },
                    { id: 'cabin_booking', label: 'Cabins', icon: Sofa },
                    { id: 'event_booking', label: 'Events', icon: CalendarCheck }
                  ].map(cat => (
                    <button key={cat.id} onClick={() => setActiveOrderCategory(cat.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeOrderCategory === cat.id ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                      <cat.icon size={16} /> <span className="hidden sm:inline">{cat.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 p-1 bg-brand-dark/40 rounded-2xl border border-brand-gold/10">
                  {['all', 'registered', 'subscriber'].map(f => (
                    <button key={f} onClick={() => setUserTypeFilter(f as any)} className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${userTypeFilter === f ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 pt-8 border-t border-brand-gold/10">
                {activeOrderCategory === 'event_booking' ? (
                  eventBookings.map(booking => (
                    <div key={booking.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-8 transition-all hover:border-brand-gold/30">
                       <div className="flex flex-col md:flex-row gap-8 justify-between">
                          <div className="flex gap-6">
                             <div className="w-16 h-16 rounded-2xl bg-brand-dark border border-brand-gold/20 flex items-center justify-center text-brand-gold"><CalendarCheck size={28} /></div>
                             <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                   <h4 className="text-white font-bold text-2xl uppercase tracking-widest">{booking.bookingType} Party</h4>
                                   <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${booking.status === 'pending' ? 'bg-brand-gold text-brand-black' : booking.status === 'accepted' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{booking.status}</span>
                                </div>
                                <p className="text-sm text-gray-400 font-medium flex items-center gap-2"><User size={14} className="text-brand-gold" /> {booking.userName} • {booking.phone}</p>
                             </div>
                          </div>
                          <div className="flex gap-2 items-center">
                             <a href={`tel:${booking.phone}`} className="p-3 bg-gray-900 border border-white/5 rounded-xl text-brand-gold"><Phone size={18} /></a>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  orders.filter(o => o.orderType === activeOrderCategory && (userTypeFilter === 'all' || o.userType === userTypeFilter)).map(order => (
                    <div key={order.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-8">
                      <div className="flex flex-col md:flex-row gap-8 justify-between">
                        <div className="flex gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-brand-dark border border-brand-gold/20 flex items-center justify-center text-brand-gold">
                            {order.orderType === 'delivery' ? <Truck size={28} /> : <Coffee size={28} />}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-2xl mb-2">{order.itemName}</h4>
                            <p className="text-sm text-gray-400 mb-4">{order.userName} • {order.userPhone}</p>
                            <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full uppercase font-bold tracking-widest">{order.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} className="px-6 py-3 bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Delivered</button>
                          <button onClick={() => deleteItem('orders', order.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="animate-fade-in space-y-12">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-center border-b border-brand-gold/10 pb-8">
                <div>
                   <h3 className="text-3xl font-display text-brand-gold mb-2 uppercase tracking-widest">Subscription Portal</h3>
                   <p className="text-gray-500 text-xs font-light italic">Verify payments and manage elite member access.</p>
                </div>
                <div className="flex bg-brand-dark p-1 rounded-xl border border-brand-gold/20">
                  <button onClick={() => setSubView('requests')} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subView === 'requests' ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-500'}`}>Requests</button>
                  <button onClick={() => setSubView('active')} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subView === 'active' ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-500'}`}>Active Members</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {subscriptions.filter(s => s.status === 'pending').map(sub => (
                  <div key={sub.id} className="bg-brand-dark/40 border border-brand-gold/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                     <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                        <div className="flex flex-col md:flex-row gap-8">
                           <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shrink-0"><Zap size={32} /></div>
                           <div className="space-y-4">
                              <h5 className="text-white font-bold text-2xl">{sub.userName}</h5>
                              <p className="text-gray-500 text-sm">{sub.userEmail} • {sub.phone}</p>
                              <div className="p-5 bg-black/50 rounded-2xl border border-white/5 inline-block min-w-[200px]">
                                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <span className="text-gray-400 text-xs">TXN ID:</span>
                                    <span className="text-brand-gold font-mono font-bold text-xs">{sub.transactionId}</span>
                                    <span className="text-gray-400 text-xs">Amount:</span>
                                    <span className="text-white font-bold text-xs">₹{sub.amountPaid}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-col lg:flex-col gap-3 justify-center shrink-0">
                           <button onClick={() => handleApproveSub(sub)} disabled={isProcessingSub === sub.id} className="px-10 py-4 bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg">{isProcessingSub === sub.id ? <Loader2 size={16} className="animate-spin" /> : "Approve"}</button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Edit/Add Modal */}
      {isMenuFormOpen && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">{editingMenuItem ? 'Edit Item' : 'New Menu Item'}</h3>
              <button onClick={() => setIsMenuFormOpen(false)} className="text-gray-500 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleSaveMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Item Name *</label>
                <input required type="text" value={menuForm.itemName} onChange={e => setMenuForm({...menuForm, itemName: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-gold" placeholder="e.g. Butter Chicken" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Price (₹) *</label>
                <input required type="number" value={menuForm.priceNum} onChange={e => setMenuForm({...menuForm, priceNum: parseInt(e.target.value)})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-gold" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Category *</label>
                <select required value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-gold">
                  <option value="">Select Category</option>
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Type *</label>
                <select required value={menuForm.categoryType} onChange={e => setMenuForm({...menuForm, categoryType: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-gold">
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                  <option value="Jain">Jain</option>
                  <option value="Special">Special</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Description</label>
                <textarea value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-gold h-20 resize-none" placeholder="Brief details about the dish..." />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Google Drive Image Link *</label>
                <input required type="text" value={menuForm.backgroundImageUrl} onChange={e => setMenuForm({...menuForm, backgroundImageUrl: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-brand-gold" placeholder="https://drive.google.com/..." />
              </div>
              
              <div className="md:col-span-2 flex flex-wrap gap-6 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={menuForm.isAvailable} onChange={e => setMenuForm({...menuForm, isAvailable: e.target.checked})} className="w-4 h-4 rounded border-gray-700 bg-black/40 text-brand-gold focus:ring-brand-gold" />
                  <span className="text-[10px] text-gray-300 uppercase font-bold tracking-widest">Live Availability</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={menuForm.isRecommended} onChange={e => setMenuForm({...menuForm, isRecommended: e.target.checked})} className="w-4 h-4 rounded border-gray-700 bg-black/40 text-brand-gold focus:ring-brand-gold" />
                  <span className="text-[10px] text-gray-300 uppercase font-bold tracking-widest">Recommended</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={menuForm.isNewItem} onChange={e => setMenuForm({...menuForm, isNewItem: e.target.checked})} className="w-4 h-4 rounded border-gray-700 bg-black/40 text-brand-gold focus:ring-brand-gold" />
                  <span className="text-[10px] text-gray-300 uppercase font-bold tracking-widest">New Item</span>
                </label>
              </div>

              <div className="md:col-span-2 flex gap-4 pt-6">
                 <button type="submit" className="flex-1 py-4 bg-brand-gold text-brand-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95">Save Menu Item</button>
                 <button type="button" onClick={() => setIsMenuFormOpen(false)} className="px-10 py-4 border border-gray-700 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
