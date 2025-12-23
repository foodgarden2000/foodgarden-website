
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  increment, 
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Trash2, Utensils, Calendar, 
  Tag, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, AlertTriangle, Zap, User, ShieldCheck, Mail, Smartphone, Loader2,
  Play, Volume2, VolumeX, Ban, Filter, BarChart3, CalendarDays, ChevronRight, Star
} from 'lucide-react';
import { MenuItem, FestivalSpecial, CategoryConfig, Order, OrderStatus, SubscriptionRequest, OrderType, UserCategory } from '../types';
import { getOptimizedImageURL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';
type OrderCategory = 'delivery' | 'table_booking' | 'cabin_booking';
type UserTypeFilter = 'all' | 'registered' | 'subscriber';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'festivals' | 'orders' | 'subscriptions'>('orders');
  const [activeOrderCategory, setActiveOrderCategory] = useState<OrderCategory>('delivery');
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('all');
  
  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [festivals, setFestivals] = useState<(FestivalSpecial & { id: string })[]>([]);
  const [categories, setCategories] = useState<(CategoryConfig & { id: string })[]>([]);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [subscriptions, setSubscriptions] = useState<(SubscriptionRequest & { id: string })[]>([]);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering & Analytics State
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Rejection/Cancellation Modal State
  const [actioningOrder, setActioningOrder] = useState<{id: string, action: 'reject' | 'cancel'} | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [customActionReason, setCustomActionReason] = useState('');

  // Sound Notification States
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef<HTMLAudioElement | null>(null);

  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({ name: '', category: '', price: '', description: '', image: '' });

  useEffect(() => {
    // Initialize Notification Sounds
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.preload = 'auto';

    cancelAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    cancelAudioRef.current.preload = 'auto';

    // Sync ref with state
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

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      if (!isInitialLoad.current && soundEnabledRef.current) {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as Order;

          if (change.type === "added") {
            if (data.status === 'pending') {
              console.log("🔔 New order/booking received! Playing notification sound...");
              audioRef.current?.play().catch(err => {
                console.error("Audio playback failed:", err);
              });
            }
          }

          if (change.type === "modified") {
            if (data.status === 'cancelled_by_user' && data.cancelledBy === 'user') {
              console.log("🛑 USER CANCELLED ORDER:", change.doc.id);
              cancelAudioRef.current?.play().catch(err => {
                console.error("Cancel audio playback failed:", err);
              });
            }
          }
        });
      }

      const fetchedOrders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(fetchedOrders);
      isInitialLoad.current = false;
    }, (err) => {
      console.error("Firestore Listen Error:", err);
      setError("Failed to sync orders real-time.");
    });

    const unsubSubs = onSnapshot(collection(db, "subscription"), (snapshot) => {
      const fetchedSubs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      fetchedSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubscriptions(fetchedSubs);
    });

    return () => { 
      unsubMenu(); unsubFest(); unsubCats(); unsubOrders(); unsubSubs(); 
    };
  }, [isSoundEnabled]);

  /**
   * Analytics Calculation Logic - Segregated by Type
   */
  const analyticsData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(0);
        break;
      default:
        startDate = new Date(0);
    }

    const endDate = (timeFilter === 'custom' && customEndDate) 
      ? new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) 
      : new Date();

    const filtered = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const calculateStats = (type: OrderType) => {
      const typeFiltered = filtered.filter(o => o.orderType === type);
      return {
        total: typeFiltered.length,
        accepted: typeFiltered.filter(o => o.status === 'accepted').length,
        rejected: typeFiltered.filter(o => o.status === 'rejected').length,
        cancelled: typeFiltered.filter(o => o.status === 'cancelled_by_user' || o.status === 'cancelled_by_admin').length,
        completed: typeFiltered.filter(o => o.status === 'delivered').length,
        revenue: typeFiltered.reduce((acc, o) => acc + (o.status === 'delivered' ? (o.orderAmount || 0) : 0), 0)
      };
    };

    return {
      filtered,
      delivery: calculateStats('delivery'),
      table: calculateStats('table_booking'),
      cabin: calculateStats('cabin_booking')
    };
  }, [orders, timeFilter, customStartDate, customEndDate]);

  const activeStats = analyticsData[activeOrderCategory === 'delivery' ? 'delivery' : activeOrderCategory === 'table_booking' ? 'table' : 'cabin'];

  const toggleSound = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    if (newState) {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
      if (cancelAudioRef.current) {
        cancelAudioRef.current.play().then(() => {
          cancelAudioRef.current?.pause();
          if (cancelAudioRef.current) cancelAudioRef.current.currentTime = 0;
        }).catch(() => {});
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      });

      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const order = orderSnap.data() as Order;
        if (newStatus === 'delivered' && order.userId && !order.pointsCredited) {
          await updateDoc(doc(db, "users", order.userId), { points: increment(order.pointsEarned || 0) });
          await updateDoc(orderRef, { pointsCredited: true });
        }
      }
    } catch (err) { 
      console.error("Order update error:", err);
      alert("Error updating order status."); 
    }
  };

  const handleOrderAction = async () => {
    if (!actioningOrder) return;
    const reason = actionReason === 'Other' ? customActionReason : actionReason;
    if (!reason) {
      alert("Please provide a reason.");
      return;
    }

    try {
      console.log(`${actioningOrder.action.toUpperCase()}ING: Order ${actioningOrder.id} for reason: ${reason}`);
      const orderRef = doc(db, "orders", actioningOrder.id);
      
      const updateData: any = {
        status: actioningOrder.action === 'reject' ? 'rejected' : 'cancelled_by_admin',
        updatedAt: new Date().toISOString()
      };

      if (actioningOrder.action === 'reject') {
        updateData.rejectReason = reason;
      } else {
        updateData.cancelReason = reason;
        updateData.cancelledBy = 'admin';
      }

      await updateDoc(orderRef, updateData);
      alert(`Order ${actioningOrder.action === 'reject' ? 'rejected' : 'cancelled'} successfully.`);
      setActioningOrder(null);
      setActionReason('');
      setCustomActionReason('');
    } catch (err) {
      console.error("Action error:", err);
      alert("Failed to process action.");
    }
  };

  const handleVerifySubscription = async (sub: SubscriptionRequest & { id: string }) => {
    try {
      if (!sub.id || !sub.userId) return;
      const subRef = doc(db, "subscription", sub.id);
      const userRef = doc(db, "users", sub.userId);
      const subSnap = await getDoc(subRef);
      const userSnap = await getDoc(userRef);

      if (!subSnap.exists() || !userSnap.exists()) {
        alert("Critical document missing.");
        return;
      }

      if (!window.confirm(`ACTIVATE NOW: Confirm Premium Status for ${sub.userName}?`)) return;

      setIsVerifying(sub.id);
      const now = new Date().toISOString();

      await updateDoc(subRef, { status: "active", verifiedBy: "admin", verifiedAt: now, activatedAt: now });
      await updateDoc(userRef, {
        role: "subscriber",
        isPremium: true,
        premiumActivatedAt: now,
        "subscription.status": "active",
        "subscription.plan": sub.planName || "PREMIUM PLAN",
        "subscription.startDate": now,
        "subscription.txnId": sub.txnId
      });
      alert(`Activation Successful!`);
    } catch (err: any) {
      console.error("Verification Failed", err);
      alert(`Failure: ${err.message}`);
    } finally {
      setIsVerifying(null);
    }
  };

  const handleRejectSubscription = async (sub: SubscriptionRequest & { id: string }) => {
    if (!sub.id || !sub.userId || !window.confirm(`Reject payment?`)) return;
    try {
      await updateDoc(doc(db, "subscription", sub.id), { status: 'rejected' });
      await updateDoc(doc(db, "users", sub.userId), { "subscription.status": 'rejected' });
    } catch (err: any) { console.error(err); }
  };

  const deleteItem = async (col: string, id: string) => {
    if (window.confirm("Delete permanently?")) {
      try { await deleteDoc(doc(db, col, id)); } catch (err) { console.error(err); }
    }
  };

  const getStatusAction = (status: OrderStatus | undefined) => {
    if (!status) return { next: 'accepted', label: 'Accept', icon: Check, color: 'bg-blue-500' };
    switch(status) {
      case 'pending': return { next: 'accepted', label: 'Accept', icon: Check, color: 'bg-blue-500' };
      case 'accepted': return { next: 'preparing', label: 'Start Prep', icon: Play, color: 'bg-purple-500' };
      case 'preparing': return { next: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'bg-orange-500' };
      case 'out_for_delivery': return { next: 'delivered', label: 'Mark Done', icon: CheckCircle2, color: 'bg-green-500' };
      default: return null;
    }
  };

  const pendingSubs = subscriptions.filter(s => s.status === 'pending');

  const getUserTypeBadge = (type: UserCategory | undefined) => {
    const category = type || 'registered';
    switch (category) {
      case 'subscriber':
        return (
          <span className="flex items-center gap-1.5 bg-brand-gold text-brand-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
            VIP Subscriber <Star size={10} fill="currentColor" />
          </span>
        );
      case 'registered':
        return (
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
            Member User
          </span>
        );
      default:
        // Handle existing guest orders badge if they still exist in DB
        return (
          <span className="bg-gray-600 text-gray-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Legacy Guest
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex flex-col overflow-hidden font-sans">
      {/* Admin Navbar */}
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-lg">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-gold tracking-widest uppercase">Admin Hub</h2>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Chef's Jalsa Control Panel</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center bg-brand-dark p-1 rounded-lg border border-brand-gold/10 overflow-x-auto max-w-full">
          {[
            { id: 'orders', label: 'Orders & Bookings', icon: ShoppingBag },
            { id: 'subscriptions', label: 'Members', icon: Zap },
            { id: 'menu', label: 'Menu', icon: Utensils },
            { id: 'festivals', label: 'Festivals', icon: Calendar }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}

          <button 
            onClick={toggleSound}
            className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all ml-2 border ${isSoundEnabled ? 'border-brand-gold text-brand-gold bg-brand-gold/10' : 'border-gray-800 text-gray-500 hover:text-white animate-pulse'}`}
          >
            {isSoundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            {isSoundEnabled ? 'ALERTS ON' : 'ENABLE ALERTS'}
          </button>

          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest text-brand-red ml-2 border-l border-brand-gold/10 hover:bg-brand-red hover:text-white transition-all">
            <LogOut size={12} /> Exit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'subscriptions' && (
            <div className="space-y-12 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-end border-b border-brand-gold/10 pb-8">
                <div>
                   <h3 className="text-3xl font-display text-brand-gold mb-2 uppercase tracking-widest">Subscriber Verification</h3>
                   <p className="text-gray-500 text-xs">Activate premium accounts after payment verification.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {pendingSubs.map(sub => (
                    <div key={sub.id} className="bg-brand-dark/40 border border-brand-gold/30 rounded-3xl p-8 hover:bg-brand-dark/60 transition-all shadow-2xl relative overflow-hidden group">
                       <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                          <div className="flex gap-6">
                             <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shrink-0 shadow-lg">
                                <Zap size={32} />
                             </div>
                             <div>
                                <div className="flex items-center gap-4 mb-3">
                                   <h5 className="text-white font-bold text-2xl">{sub.userName}</h5>
                                   <span className="bg-brand-red text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">{sub.planName}</span>
                                </div>
                                <div className="space-y-2">
                                   <p className="text-sm text-gray-400 flex items-center gap-2 font-medium"><Smartphone size={14} className="text-brand-gold"/> {sub.userPhone}</p>
                                   <p className="text-sm text-gray-400 flex items-center gap-2 font-medium"><Mail size={14} className="text-brand-gold"/> {sub.userEmail}</p>
                                   <div className="mt-4 p-4 bg-black/50 rounded-2xl border border-white/5 shadow-inner">
                                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">TXN ID: <span className="text-brand-gold font-mono font-bold tracking-wider">{sub.txnId}</span></p>
                                   </div>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-col items-end justify-between gap-6">
                             <div className="text-right">
                                <p className="text-4xl font-display font-bold text-white mb-1">{sub.amount}</p>
                             </div>
                             <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={() => handleVerifySubscription(sub)} disabled={isVerifying === sub.id} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-4 bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg">
                                  {isVerifying === sub.id ? <Loader2 size={18} className="animate-spin" /> : "Activate"}
                                </button>
                                <button onClick={() => handleRejectSubscription(sub)} className="px-6 py-4 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Reject</button>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="animate-fade-in space-y-10">
              {/* ANALYTICS SECTION */}
              <div className="space-y-8">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl">
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold">
                      <BarChart3 size={24} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-display text-white uppercase tracking-widest">Analytics Dashboard</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-brand-gold uppercase font-bold tracking-widest">{timeFilter} range</span>
                        {timeFilter === 'custom' && <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">• {customStartDate} to {customEndDate}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {(['today', 'week', 'month', 'year', 'custom'] as TimeFilter[]).map(f => (
                      <button 
                        key={f}
                        onClick={() => setTimeFilter(f)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${timeFilter === f ? 'bg-brand-gold text-brand-black border-brand-gold' : 'text-gray-500 border-gray-800 hover:text-white'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {timeFilter === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in p-6 bg-brand-dark/20 rounded-2xl border border-white/5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-2">From Date</label>
                      <input type="date" max={new Date().toISOString().split('T')[0]} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="bg-black/40 border border-gray-800 rounded-xl p-4 text-white focus:border-brand-gold outline-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-2">To Date</label>
                      <input type="date" max={new Date().toISOString().split('T')[0]} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="bg-black/40 border border-gray-800 rounded-xl p-4 text-white focus:border-brand-gold outline-none" />
                    </div>
                  </div>
                )}

                {/* Filter Controls Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Category Filter */}
                  <div className="flex gap-2 p-1 bg-brand-dark/40 rounded-2xl border border-brand-gold/10">
                    {[
                      { id: 'delivery', label: 'Food Delivery', icon: Truck },
                      { id: 'table_booking', label: 'Table Bookings', icon: Coffee },
                      { id: 'cabin_booking', label: 'Cabin Bookings', icon: Sofa }
                    ].map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setActiveOrderCategory(cat.id as OrderCategory)}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeOrderCategory === cat.id ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                        <cat.icon size={16} />
                        <span className="hidden sm:inline">{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* User Type Filter */}
                  <div className="flex gap-2 p-1 bg-brand-dark/40 rounded-2xl border border-brand-gold/10">
                    {(['all', 'registered', 'subscriber'] as UserTypeFilter[]).map(f => (
                      <button 
                        key={f}
                        onClick={() => setUserTypeFilter(f)}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${userTypeFilter === f ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                        {f === 'all' ? 'All Members' : f === 'registered' ? 'Regular' : 'VIPs'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in-up">
                  <div className="bg-brand-dark/30 border border-brand-gold/20 p-8 rounded-2xl text-center shadow-xl hover:bg-brand-gold/5 transition-colors">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Total</p>
                    <p className="text-3xl font-bold text-white">{activeStats.total}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-blue-500/20 p-8 rounded-2xl text-center shadow-xl hover:bg-blue-500/5 transition-colors">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Accepted</p>
                    <p className="text-3xl font-bold text-blue-400">{activeStats.accepted}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-red-500/20 p-8 rounded-2xl text-center shadow-xl hover:bg-red-500/5 transition-colors">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Rejected</p>
                    <p className="text-3xl font-bold text-red-400">{activeStats.rejected}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-red-800/20 p-8 rounded-2xl text-center shadow-xl hover:bg-red-800/5 transition-colors">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Cancelled</p>
                    <p className="text-3xl font-bold text-red-600">{activeStats.cancelled}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-green-500/20 p-8 rounded-2xl text-center shadow-xl hover:bg-green-500/5 transition-colors">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Done</p>
                    <p className="text-3xl font-bold text-green-400">{activeStats.completed}</p>
                  </div>
                </div>

                {activeOrderCategory === 'delivery' && (
                  <div className="bg-brand-gold/10 border border-brand-gold/30 p-8 rounded-3xl text-center shadow-2xl animate-fade-in">
                    <p className="text-[12px] text-brand-gold uppercase font-bold tracking-widest mb-2">Order Revenue ({timeFilter})</p>
                    <p className="text-6xl font-display font-bold text-brand-gold">₹{activeStats.revenue.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-widest">Calculated from delivered orders only</p>
                  </div>
                )}
              </div>

              {/* LIST SECTION */}
              <div className="space-y-8 pt-8 border-t border-brand-gold/10">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <Filter size={16} className="text-brand-gold" />
                    <h4 className="text-xs text-gray-300 uppercase font-bold tracking-widest">
                      {activeOrderCategory.replace('_', ' ')} list • {analyticsData.filtered.filter(o => o.orderType === activeOrderCategory && (userTypeFilter === 'all' || o.userType === userTypeFilter)).length} Found
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {analyticsData.filtered
                    .filter(o => o.orderType === activeOrderCategory && (userTypeFilter === 'all' || o.userType === userTypeFilter))
                    .map(order => {
                      const action = getStatusAction(order.status);
                      const statusLabel = (order.status || 'pending').replace(/_/g, ' ');
                      const isUserCancelled = order.status === 'cancelled_by_user' && order.cancelledBy === 'user';
                      const isAdminCancelled = order.status === 'cancelled_by_admin';
                      const isCancelled = isUserCancelled || isAdminCancelled;
                      
                      return (
                        <div key={order.id} className={`bg-brand-dark/50 backdrop-blur-xl border rounded-3xl p-8 transition-all group ${order.status === 'pending' ? 'border-brand-gold shadow-[0_0_20px_rgba(212,175,55,0.05)]' : isUserCancelled ? 'border-red-600/50 bg-red-900/10 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : isCancelled ? 'border-red-900/50 bg-red-950/10' : 'border-gray-800'}`}>
                          <div className="flex flex-col md:flex-row gap-8 justify-between">
                            <div className="flex gap-6">
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shrink-0 shadow-lg group-hover:border-brand-gold/50 transition-colors ${isCancelled ? 'bg-red-950/20 text-red-500 border-red-900/50' : 'bg-brand-dark text-brand-gold border-brand-gold/20'}`}>
                                {order.orderType === 'delivery' ? <Truck size={28} /> : order.orderType === 'table_booking' ? <Coffee size={28} /> : <Sofa size={28} />}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                  <h4 className="text-white font-bold text-2xl">{order.itemName || 'Untitled Item'} {order.orderType === 'delivery' && <span className="text-brand-gold text-lg ml-2">x {order.quantity || 1}</span>}</h4>
                                  
                                  {/* User Type Badge */}
                                  {getUserTypeBadge(order.userType)}

                                  {order.status === 'rejected' && (
                                    <span className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded-full uppercase font-bold tracking-widest flex items-center gap-1"><Ban size={10} /> Rejected</span>
                                  )}
                                  {isUserCancelled && (
                                    <span className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full uppercase font-bold tracking-widest flex items-center gap-1 shadow-md animate-pulse"><Ban size={10} /> Cancelled by User</span>
                                  )}
                                  {isAdminCancelled && (
                                    <span className="text-[10px] bg-red-800/10 text-red-600 px-3 py-1 rounded-full uppercase font-bold tracking-widest flex items-center gap-1"><Ban size={10} /> Cancelled by Admin</span>
                                  )}
                                  {order.status === 'delivered' && (
                                    <span className="text-[10px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full uppercase font-bold tracking-widest flex items-center gap-1"><CheckCircle2 size={10} /> {order.orderType === 'delivery' ? 'Delivered' : 'Completed'}</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                  <User size={14} className="text-brand-gold" /> {order.userName || 'Member'} • {order.userPhone}
                                </p>
                                <div className="mt-5 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                                  <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                                    <Clock size={12} /> Status: <span className={`text-white uppercase ${isCancelled || order.status === 'rejected' ? 'text-red-500 font-bold' : ''}`}>{statusLabel}</span>
                                  </div>
                                  <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                                    <CalendarDays size={12} /> {new Date(order.createdAt).toLocaleString()}
                                  </div>
                                  <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                                    <Zap size={12} /> Category: <span className="text-brand-gold capitalize">{order.userType || 'registered'}</span>
                                  </div>
                                </div>
                                {(order.rejectReason || order.cancelReason) && (
                                  <p className={`mt-4 p-4 rounded-2xl border text-xs italic ${isUserCancelled ? 'bg-red-600/10 border-red-500/30 text-red-200' : isCancelled ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-500/5 border-red-500/10 text-red-400'}`}>
                                    {order.rejectReason ? `Rejection Reason: ${order.rejectReason}` : `Cancellation Reason (${order.cancelledBy}): ${order.cancelReason}`}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col md:items-end justify-between gap-6 shrink-0">
                              <div className="text-right">
                                {order.orderType === 'delivery' ? (
                                  <>
                                    <p className="text-4xl font-display font-bold text-white mb-1">₹{order.orderAmount || 0}</p>
                                    <p className="text-[10px] text-brand-gold uppercase tracking-widest font-bold">Points: {order.pointsEarned}</p>
                                  </>
                                ) : (
                                  <div className="flex flex-col gap-1 items-end">
                                    <p className="text-xl font-display text-white uppercase tracking-widest">{order.orderType === 'table_booking' ? 'Table' : 'Cabin'}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{order.quantity} People</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                {(order.status === 'pending' || order.status === 'accepted') && (
                                  <>
                                    {action && (
                                      <button onClick={() => handleUpdateOrderStatus(order.id, action.next as OrderStatus)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 ${action.color} text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg`}><action.icon size={16} /> {action.label}</button>
                                    )}
                                    {order.status === 'pending' && (
                                      <button onClick={() => setActioningOrder({id: order.id, action: 'reject'})} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg"><Ban size={16} /> Reject</button>
                                    )}
                                    <button onClick={() => setActioningOrder({id: order.id, action: 'cancel'})} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-red-800 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white active:scale-95 transition-all shadow-lg"><XCircle size={16} /> Cancel</button>
                                  </>
                                )}
                                {(order.status === 'preparing' || order.status === 'out_for_delivery') && action && (
                                   <button onClick={() => handleUpdateOrderStatus(order.id, action.next as OrderStatus)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 ${action.color} text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg`}><action.icon size={16} /> {action.label}</button>
                                )}
                                <button onClick={() => deleteItem('orders', order.id)} className="px-4 py-3 text-gray-700 hover:text-red-500 bg-gray-900 rounded-xl border border-white/5 transition-colors"><Trash2 size={16}/></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
