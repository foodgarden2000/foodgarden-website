
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
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Trash2, Utensils, Calendar, 
  Tag, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, AlertTriangle, Zap, User, ShieldCheck, Mail, Smartphone, Loader2,
  Play, Volume2, VolumeX, Ban, Filter, BarChart3, CalendarDays, ChevronRight, Star, X, Coins, Wallet, CalendarCheck, Users, Phone, Search, CreditCard
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
  
  // Subscription management states
  const [subView, setSubView] = useState<'requests' | 'active'>('requests');
  const [subscriptions, setSubscriptions] = useState<(SubscriptionRequest & { id: string })[]>([]);
  const [isProcessingSub, setIsProcessingSub] = useState<string | null>(null);
  const [rejectingSub, setRejectingSub] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [festivals, setFestivals] = useState<(FestivalSpecial & { id: string })[]>([]);
  const [categories, setCategories] = useState<(CategoryConfig & { id: string })[]>([]);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [eventBookings, setEventBookings] = useState<(EventBooking & { id: string })[]>([]);
  // Fix: Properly type allUsers state as Record of UserProfile
  const [allUsers, setAllUsers] = useState<Record<string, UserProfile>>({});
  
  // Filtering & Analytics State
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Rejection/Cancellation Modal State
  const [actioningOrder, setActioningOrder] = useState<{id: string, action: 'reject' | 'cancel'} | null>(null);
  const [actioningBooking, setActioningBooking] = useState<{id: string, action: 'reject'} | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [customActionReason, setCustomActionReason] = useState('');

  // Sound Notification States
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
      // Fix: Properly type userMap as Record of UserProfile
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

      await updateDoc(doc(db, "subscription", sub.id), {
        status: 'approved',
        updatedAt: nowISO,
        expiryDate: expiryDate,
        isExpired: false
      });

      await updateDoc(doc(db, "users", sub.userId), {
        role: 'subscriber',
        'subscription.status': 'active',
        'subscription.plan': sub.planType,
        'subscription.startDate': nowISO,
        'subscription.expiryDate': expiryDate,
        'subscription.isExpired': false,
        'subscription.transactionId': sub.transactionId
      });

      console.log("Subscription approved:", sub.userId);
      alert("Subscription approved successfully.");
    } catch (err) {
      console.error(err);
      alert("Approval failed.");
    } finally {
      setIsProcessingSub(null);
    }
  };

  const handleRejectSub = async () => {
    if (!rejectingSub || !rejectReason) return;
    setIsProcessingSub(rejectingSub);
    try {
      const sub = subscriptions.find(s => s.id === rejectingSub);
      if (!sub) return;
      
      await updateDoc(doc(db, "subscription", rejectingSub), {
        status: 'rejected',
        adminReason: rejectReason,
        updatedAt: new Date().toISOString()
      });
      console.log("Subscription rejected:", sub.userId);
      alert("Subscription rejected.");
      setRejectingSub(null);
      setRejectReason('');
    } catch (err) {
      alert("Rejection failed.");
    } finally {
      setIsProcessingSub(null);
    }
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

    const filteredBookings = eventBookings.filter(b => {
      const d = new Date(b.createdAt);
      return d >= startDate && d <= endDate;
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
      filteredBookings,
      delivery: calculateStats('delivery'),
      table: calculateStats('table_booking'),
      cabin: calculateStats('cabin_booking'),
      events: {
        total: filteredBookings.length,
        pending: filteredBookings.filter(b => b.status === 'pending').length,
        accepted: filteredBookings.filter(b => b.status === 'accepted').length,
        rejected: filteredBookings.filter(b => b.status === 'rejected' || b.status === 'cancelled_by_user').length
      }
    };
  }, [orders, eventBookings, timeFilter, customStartDate, customEndDate]);

  const activeStats = activeOrderCategory === 'event_booking' ? analyticsData.events : analyticsData[activeOrderCategory === 'delivery' ? 'delivery' : activeOrderCategory === 'table_booking' ? 'table' : 'cabin'];

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

  const handleBookingAction = async (bookingId: string, status: 'accepted' | 'rejected') => {
    if (status === 'rejected') {
      setActioningBooking({ id: bookingId, action: 'reject' });
      return;
    }
    try {
      await updateDoc(doc(db, "eventBookings", bookingId), {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });
      alert("Booking accepted.");
    } catch (err) { alert("Failed to update booking."); }
  };

  const handleOrderAction = async () => {
    if (!actioningOrder) return;
    const reason = actionReason === 'Other' ? customActionReason : actionReason;
    if (!reason) { alert("Please provide a reason."); return; }
    try {
      const orderRef = doc(db, "orders", actioningOrder.id);
      const updateData: any = { status: actioningOrder.action === 'reject' ? 'rejected' : 'cancelled_by_admin', updatedAt: new Date().toISOString() };
      if (actioningOrder.action === 'reject') updateData.rejectReason = reason;
      else { updateData.cancelReason = reason; updateData.cancelledBy = 'admin'; }
      await updateDoc(orderRef, updateData);
      alert(`Order ${actioningOrder.action} successfully.`);
      setActioningOrder(null);
      setActionReason('');
    } catch (err) { alert("Failed to process action."); }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      alert("Deleted successfully.");
    } catch (err) {
      alert("Failed to delete.");
    }
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
                  analyticsData.filteredBookings.map(booking => (
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
                             {booking.status === 'pending' && (
                               <button onClick={() => handleBookingAction(booking.id!, 'accepted')} className="px-6 py-3 bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Accept</button>
                             )}
                             <a href={`tel:${booking.phone}`} className="p-3 bg-gray-900 border border-white/5 rounded-xl text-brand-gold"><Phone size={18} /></a>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  analyticsData.filtered.filter(o => o.orderType === activeOrderCategory && (userTypeFilter === 'all' || o.userType === userTypeFilter)).map(order => (
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

              {subView === 'requests' ? (
                <div className="grid grid-cols-1 gap-6">
                  {subscriptions.filter(s => s.status === 'pending').length === 0 ? (
                    <div className="text-center py-20 bg-brand-dark/20 rounded-3xl border border-dashed border-gray-800">
                      <CreditCard size={48} className="text-gray-800 mx-auto mb-4" />
                      <p className="text-gray-500 font-serif italic text-lg">No pending subscription requests.</p>
                    </div>
                  ) : (
                    subscriptions.filter(s => s.status === 'pending').map(sub => (
                      <div key={sub.id} className="bg-brand-dark/40 border border-brand-gold/30 rounded-3xl p-8 hover:bg-brand-dark/60 transition-all shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                         
                         <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                            <div className="flex flex-col md:flex-row gap-8">
                               <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                  <Zap size={32} />
                               </div>
                               <div className="space-y-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-1">
                                      <h5 className="text-white font-bold text-2xl">{sub.userName}</h5>
                                      <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg ${sub.planType === 'lifetime' ? 'bg-brand-red text-white' : 'bg-brand-gold text-brand-black'}`}>{sub.planType}</span>
                                    </div>
                                    <p className="text-gray-500 text-sm font-sans flex items-center gap-4">
                                      <span className="flex items-center gap-1.5"><Mail size={12} className="text-brand-gold" /> {sub.userEmail}</span>
                                      <span className="flex items-center gap-1.5"><Smartphone size={12} className="text-brand-gold" /> {sub.phone}</span>
                                    </p>
                                  </div>
                                  <div className="p-5 bg-black/50 rounded-2xl border border-white/5 shadow-inner inline-block min-w-[200px]">
                                     <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-2">Verification Data</p>
                                     <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        <span className="text-gray-400 text-xs">TXN ID:</span>
                                        <span className="text-brand-gold font-mono font-bold tracking-wider text-xs">{sub.transactionId}</span>
                                        <span className="text-gray-400 text-xs">Amount:</span>
                                        <span className="text-white font-bold text-xs">₹{sub.amountPaid}</span>
                                     </div>
                                  </div>
                               </div>
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center shrink-0">
                               <button 
                                 onClick={() => handleApproveSub(sub)} 
                                 disabled={isProcessingSub === sub.id}
                                 className="flex items-center justify-center gap-2 px-10 py-4 bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                               >
                                 {isProcessingSub === sub.id ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Approve</>}
                               </button>
                               <button 
                                 onClick={() => setRejectingSub(sub.id)}
                                 className="flex items-center justify-center gap-2 px-10 py-4 border border-brand-red text-brand-red rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all active:scale-95"
                               >
                                 <XCircle size={16} /> Reject
                               </button>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="bg-brand-dark/40 border border-brand-gold/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-black/50 text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em] border-b border-white/5">
                          <th className="px-8 py-5">Subscriber</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5">Plan</th>
                          <th className="px-8 py-5">Join Date</th>
                          <th className="px-8 py-5">Expiry Date</th>
                          <th className="px-8 py-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {Object.values(allUsers).filter((u: UserProfile) => u.role === 'subscriber' || u.subscription?.status === 'expired').length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-20 text-center text-gray-500 italic font-serif">No subscribers found.</td>
                          </tr>
                        ) : (
                          Object.values(allUsers).filter((u: UserProfile) => u.role === 'subscriber' || u.subscription?.status === 'expired').map((subscriber: any) => {
                            const isExpired = subscriber.subscription?.status === 'expired' || 
                                            (subscriber.subscription?.plan === 'yearly' && 
                                             subscriber.subscription?.expiryDate && 
                                             new Date(subscriber.subscription.expiryDate) <= new Date());
                            
                            return (
                              <tr key={subscriber.uid} className={`hover:bg-white/[0.02] transition-colors group ${isExpired ? 'opacity-60' : ''}`}>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${isExpired ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold'}`}><User size={14} /></div>
                                     <div className="flex flex-col">
                                       <span className="text-white font-bold">{subscriber.name}</span>
                                       <span className="text-gray-500 text-[10px]">{subscriber.email}</span>
                                     </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${isExpired ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
                                    {isExpired ? 'Expired' : 'Active'}
                                  </span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${subscriber.subscription?.plan === 'lifetime' ? 'bg-brand-red text-white' : 'bg-brand-gold text-brand-black'}`}>{subscriber.subscription?.plan}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-gray-400 text-xs">{new Date(subscriber.subscription?.startDate || subscriber.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={`text-xs font-bold ${subscriber.subscription?.plan === 'lifetime' ? 'text-blue-400 uppercase' : isExpired ? 'text-red-400' : 'text-gray-300'}`}>
                                    {subscriber.subscription?.plan === 'lifetime' ? 'Lifetime' : (subscriber.subscription?.expiryDate ? new Date(subscriber.subscription.expiryDate).toLocaleDateString() : 'N/A')}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <button onClick={() => deleteItem('users', subscriber.uid)} className="p-2 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subscription Rejection Modal */}
      {rejectingSub && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-brand-dark border border-brand-red/30 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
            <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-2">Reject Request</h3>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-8">This action is permanent and notifies the user.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3 block">Reason for Rejection</label>
                <select 
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none transition-all" 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="">Select a reason...</option>
                  <option value="Invalid Transaction ID">Invalid Transaction ID</option>
                  <option value="Payment Not Received">Payment Not Received</option>
                  <option value="Amount Mismatch">Amount Mismatch</option>
                  <option value="Duplicate Request">Duplicate Request</option>
                  <option value="Other">Other Reason...</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleRejectSub} 
                  disabled={!rejectReason || isProcessingSub === rejectingSub}
                  className="flex-1 py-4 bg-brand-red text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isProcessingSub === rejectingSub ? <Loader2 size={16} className="animate-spin" /> : "Confirm Rejection"}
                </button>
                <button 
                  onClick={() => { setRejectingSub(null); setRejectReason(''); }} 
                  className="px-8 py-4 border border-gray-700 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals (Reject Booking / Order) remain as they were */}
      {actioningBooking && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-6">Reject Booking</h3>
            <div className="space-y-4">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Reason</label>
              <select className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none" value={actionReason} onChange={(e) => setActionReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option value="Fully Booked">Fully Booked</option>
                <option value="Operational Issues">Operational Issues</option>
                <option value="Closed for Private Event">Closed for Private Event</option>
                <option value="Other">Other...</option>
              </select>
              <div className="flex gap-4 pt-4">
                 <button onClick={() => setActioningBooking(null)} className="flex-1 py-4 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Reject</button>
                 <button onClick={() => setActioningBooking(null)} className="px-6 py-4 border border-gray-700 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
