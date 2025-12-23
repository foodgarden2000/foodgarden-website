
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
  Play, Volume2, VolumeX, Ban, Filter, BarChart3, CalendarDays
} from 'lucide-react';
import { MenuItem, FestivalSpecial, CategoryConfig, Order, OrderStatus, SubscriptionRequest } from '../types';
import { getOptimizedImageURL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'festivals' | 'orders' | 'subscriptions'>('orders');
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

  // Rejection Modal State
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Sound Notification States
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({ name: '', category: '', price: '', description: '', image: '' });

  useEffect(() => {
    // Initialize Notification Sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.preload = 'auto';

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
          if (change.type === "added") {
            const data = change.doc.data() as Order;
            if (data.status === 'pending') {
              console.log("🔔 New order received! Playing notification sound...");
              audioRef.current?.play().catch(err => {
                console.error("Audio playback failed:", err);
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
   * Analytics Calculation Logic
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

    console.log(`ANALYTICS: Filtering from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const filtered = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const stats = {
      total: filtered.length,
      accepted: filtered.filter(o => o.status === 'accepted').length,
      rejected: filtered.filter(o => o.status === 'rejected').length,
      delivered: filtered.filter(o => o.status === 'delivered').length,
      totalRevenue: filtered.reduce((acc, o) => acc + (o.status === 'delivered' ? o.orderAmount : 0), 0)
    };

    return { filtered, stats };
  }, [orders, timeFilter, customStartDate, customEndDate]);

  const toggleSound = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    if (newState && audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      }).catch(() => {});
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null
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

  const handleRejectOrder = async () => {
    if (!rejectingOrder) return;
    const reason = rejectReason === 'Other' ? customRejectReason : rejectReason;
    if (!reason) {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      const orderRef = doc(db, "orders", rejectingOrder);
      await updateDoc(orderRef, {
        status: 'rejected',
        rejectReason: reason,
        updatedAt: new Date().toISOString()
      });
      setRejectingOrder(null);
      setRejectReason('');
      setCustomRejectReason('');
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Failed to reject order.");
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
    if (!status) return { next: 'accepted', label: 'Accept Order', icon: Check, color: 'bg-blue-500' };
    switch(status) {
      case 'pending': return { next: 'accepted', label: 'Accept Order', icon: Check, color: 'bg-blue-500' };
      case 'accepted': return { next: 'preparing', label: 'Start Prep', icon: Play, color: 'bg-purple-500' };
      case 'preparing': return { next: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'bg-orange-500' };
      case 'out_for_delivery': return { next: 'delivered', label: 'Complete Order', icon: CheckCircle2, color: 'bg-green-500' };
      default: return null;
    }
  };

  const pendingSubs = subscriptions.filter(s => s.status === 'pending');
  const activeSubs = subscriptions.filter(s => s.status === 'active');

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
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
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
            Sound: {isSoundEnabled ? 'ON' : 'OFF'}
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
                   <p className="text-gray-500 text-xs">Directly activate premium accounts after manual payment verification.</p>
                </div>
                <div className="flex gap-4">
                   <div className="bg-brand-dark/50 border border-brand-gold/20 p-5 rounded-2xl text-center min-w-[140px] shadow-xl">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-tighter">Pending Approval</p>
                      <p className="text-3xl font-bold text-white">{pendingSubs.length}</p>
                   </div>
                   <div className="bg-brand-dark/50 border border-green-500/20 p-5 rounded-2xl text-center min-w-[140px] shadow-xl">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-tighter">Active Premium</p>
                      <p className="text-3xl font-bold text-green-500">{activeSubs.length}</p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-brand-gold flex items-center gap-2">
                    <Clock size={16} className="animate-pulse" /> Awaiting Verification
                  </h4>
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
                                   <div className="mt-6 p-4 bg-black/50 rounded-2xl border border-white/5 shadow-inner">
                                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">UPI Reference ID / TXN ID</p>
                                      <p className="text-lg font-mono text-brand-gold font-bold select-all tracking-wider">{sub.txnId}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-col items-end justify-between gap-6">
                             <div className="text-right">
                                <p className="text-4xl font-display font-bold text-white mb-1">{sub.amount}</p>
                             </div>
                             <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={() => handleVerifySubscription(sub)} disabled={isVerifying === sub.id} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-4 bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                                  {isVerifying === sub.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                  {isVerifying === sub.id ? "Activating..." : "Verify & Activate"}
                                </button>
                                <button onClick={() => handleRejectSubscription(sub)} className="px-6 py-4 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">Reject</button>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="animate-fade-in space-y-10">
              {/* ANALYTICS SECTION */}
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display text-white uppercase tracking-widest">Order Analytics</h3>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Performance Tracking</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-2">From Date</label>
                      <input 
                        type="date" 
                        max={new Date().toISOString().split('T')[0]}
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-black/40 border border-gray-800 rounded-xl p-4 text-white focus:border-brand-gold outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-2">To Date</label>
                      <input 
                        type="date" 
                        max={new Date().toISOString().split('T')[0]}
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-black/40 border border-gray-800 rounded-xl p-4 text-white focus:border-brand-gold outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-brand-dark/30 border border-brand-gold/20 p-6 rounded-2xl text-center shadow-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-white">{analyticsData.stats.total}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-blue-500/20 p-6 rounded-2xl text-center shadow-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Accepted</p>
                    <p className="text-3xl font-bold text-blue-400">{analyticsData.stats.accepted}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-red-500/20 p-6 rounded-2xl text-center shadow-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Rejected</p>
                    <p className="text-3xl font-bold text-red-400">{analyticsData.stats.rejected}</p>
                  </div>
                  <div className="bg-brand-dark/30 border border-green-500/20 p-6 rounded-2xl text-center shadow-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Delivered</p>
                    <p className="text-3xl font-bold text-green-400">{analyticsData.stats.delivered}</p>
                  </div>
                </div>

                <div className="bg-brand-gold/10 border border-brand-gold/30 p-6 rounded-3xl text-center shadow-2xl flex flex-col items-center justify-center">
                    <p className="text-[10px] text-brand-gold uppercase font-bold tracking-widest mb-1">Total Revenue (Delivered)</p>
                    <p className="text-5xl font-display font-bold text-brand-gold">₹{analyticsData.stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              {/* FILTERED ORDERS LIST */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                  <Filter size={14} className="text-brand-gold" />
                  <h4 className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Showing {analyticsData.filtered.length} Orders for {timeFilter}</h4>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {analyticsData.filtered.map(order => {
                    const action = getStatusAction(order.status);
                    const oType = order.orderType || 'delivery';
                    const statusLabel = (order.status || 'pending').replace('_', ' ');
                    
                    return (
                      <div key={order.id} className={`bg-brand-dark/50 backdrop-blur-xl border rounded-3xl p-8 transition-all group ${order.status === 'pending' ? 'border-brand-gold shadow-[0_0_20px_rgba(212,175,55,0.05)]' : 'border-gray-800'}`}>
                        <div className="flex flex-col md:flex-row gap-8 justify-between">
                          <div className="flex gap-6">
                            <div className="w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shrink-0 shadow-lg">
                              {oType === 'delivery' ? <Truck size={28} /> : oType === 'table_booking' ? <Coffee size={28} /> : <Sofa size={28} />}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h4 className="text-white font-bold text-2xl">{order.itemName || 'Untitled Item'} <span className="text-brand-gold text-lg">x {order.quantity || 1}</span></h4>
                                <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full uppercase font-bold tracking-widest">{oType.replace('_', ' ')}</span>
                                {order.status === 'rejected' && (
                                  <span className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded-full uppercase font-bold tracking-widest flex items-center gap-1"><Ban size={10} /> Rejected</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 font-medium">Customer: <span className="text-white">{order.userName || 'Guest'}</span> • {order.userPhone}</p>
                              <div className="mt-5 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                                <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                                  <Clock size={12} /> Status: <span className="text-white">{statusLabel}</span>
                                </div>
                                <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                                  <CalendarDays size={12} /> {new Date(order.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end justify-between gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-4xl font-display font-bold text-white mb-1">₹{order.orderAmount || 0}</p>
                              <p className="text-[10px] text-brand-gold uppercase tracking-widest font-bold">Points: {order.pointsEarned}</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                              {order.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateOrderStatus(order.id, 'accepted')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg"><Check size={16} /> Accept</button>
                                  <button onClick={() => setRejectingOrder(order.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg"><Ban size={16} /> Reject</button>
                                </>
                              )}
                              {order.status !== 'pending' && order.status !== 'rejected' && order.status !== 'delivered' && action && (
                                 <button onClick={() => handleUpdateOrderStatus(order.id, action.next as OrderStatus)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 ${action.color} text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg`}><action.icon size={16} /> {action.label}</button>
                              )}
                              <button onClick={() => deleteItem('orders', order.id)} className="px-4 py-3 text-gray-700 hover:text-red-500 bg-gray-900 rounded-xl border border-white/5 transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {analyticsData.filtered.length === 0 && (
                    <div className="text-center py-40 border-2 border-dashed border-gray-900 rounded-3xl text-gray-700">
                      <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="uppercase tracking-[0.2em] font-bold text-xs">No orders found for this time period.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-12 animate-fade-in">
              <div className="bg-brand-dark/40 border border-brand-gold/20 p-10 rounded-3xl shadow-2xl">
                <h3 className="text-2xl font-display text-brand-gold mb-8 uppercase tracking-widest">Add New Dish</h3>
                <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <input type="text" placeholder="Dish Name" className="bg-black/40 border border-gray-800 p-5 rounded-2xl text-white outline-none focus:border-brand-gold transition-all" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} />
                  <input type="text" placeholder="Price (e.g. ₹150)" className="bg-black/40 border border-gray-800 p-5 rounded-2xl text-white outline-none focus:border-brand-gold transition-all" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} />
                  <button type="submit" className="md:col-span-3 py-5 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all hover:bg-white"><Plus size={20} /> Add Item to Menu</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-brand-dark border border-brand-red/30 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 border border-red-500/20"><Ban size={24} /></div>
              <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">Reject Order</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3 block">Select Reason</label>
                <select className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white focus:border-brand-red outline-none transition-all" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                  <option value="">Choose a reason...</option>
                  <option value="Item unavailable">Item unavailable</option>
                  <option value="Kitchen busy">Kitchen busy</option>
                  <option value="Shop closed">Shop closed</option>
                  <option value="Delivery not available">Delivery not available</option>
                  <option value="Other">Custom Reason...</option>
                </select>
              </div>
              {rejectReason === 'Other' && (
                <textarea placeholder="Enter custom reason..." className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white focus:border-brand-red outline-none transition-all h-24 resize-none" value={customRejectReason} onChange={(e) => setCustomRejectReason(e.target.value)} />
              )}
              <div className="flex gap-3 pt-4">
                <button onClick={handleRejectOrder} className="flex-1 py-4 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg">Confirm Reject</button>
                <button onClick={() => { setRejectingOrder(null); setRejectReason(''); setCustomRejectReason(''); }} className="px-8 py-4 bg-gray-800 text-gray-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-700 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
