
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
  query
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Trash2, Utensils, Calendar, 
  Tag, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, AlertTriangle, Zap, User, ShieldCheck, Mail, Smartphone, Loader2,
  Play, Volume2, VolumeX, Ban, Filter, BarChart3, CalendarDays, ChevronRight, Star, X, Coins, Wallet, CalendarCheck, Users, Phone
} from 'lucide-react';
import { MenuItem, FestivalSpecial, CategoryConfig, Order, OrderStatus, SubscriptionRequest, OrderType, UserCategory, EventBooking } from '../types';
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
  
  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [festivals, setFestivals] = useState<(FestivalSpecial & { id: string })[]>([]);
  const [categories, setCategories] = useState<(CategoryConfig & { id: string })[]>([]);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [eventBookings, setEventBookings] = useState<(EventBooking & { id: string })[]>([]);
  const [subscriptions, setSubscriptions] = useState<(SubscriptionRequest & { id: string })[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, any>>({});
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // Order Sound Refs
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef<HTMLAudioElement | null>(null);

  // Event Sound Refs
  const eventInitialLoad = useRef(true);
  const eventNewAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventCancelAudioRef = useRef<HTMLAudioElement | null>(null);

  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({ name: '', category: '', price: '', description: '', image: '' });

  useEffect(() => {
    // Initialize Notification Sounds
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    cancelAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    
    // NEW: Initialize Event Sounds
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
      const userMap: Record<string, any> = {};
      snapshot.docs.forEach(doc => { userMap[doc.id] = doc.data(); });
      setAllUsers(userMap);
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      if (!isInitialLoad.current && soundEnabledRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && change.doc.data().status === 'pending') {
            audioRef.current?.play().catch(() => {});
          }
          if (change.type === "modified" && change.doc.data().status === 'cancelled_by_user') {
            cancelAudioRef.current?.play().catch(() => {});
          }
        });
      }
      const fetchedOrders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(fetchedOrders);
      isInitialLoad.current = false;
    });

    // Dedicated Event Booking Listener for Sound Notifications
    const unsubBookings = onSnapshot(collection(db, "eventBookings"), (snapshot) => {
      console.log("Event listener active");
      
      if (eventInitialLoad.current) {
        eventInitialLoad.current = false;
      } else if (soundEnabledRef.current) {
        console.log("Event booking change detected");
        snapshot.docChanges().forEach((change) => {
          const booking = change.doc.data() as EventBooking;

          // 🔔 NEW EVENT BOOKING
          if (change.type === "added" && booking.status === 'pending') {
            eventNewAudioRef.current?.play().catch(e => console.error("Event new sound failed", e));
            console.log("New Event Booking Sound Triggered:", change.doc.id);
          }

          // 🔕 EVENT CANCELLED BY USER
          if (change.type === "modified" && booking.status === 'cancelled_by_user') {
            eventCancelAudioRef.current?.play().catch(e => console.error("Event cancel sound failed", e));
            console.log("Event Booking Cancelled Sound Triggered:", change.doc.id);
          }
        });
      }

      const fetchedBookings = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      fetchedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEventBookings(fetchedBookings);
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

  const toggleSound = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    
    // Unlock all sounds for the browser's autoplay policy
    if (newState) {
      [audioRef, cancelAudioRef, eventNewAudioRef, eventCancelAudioRef].forEach(ref => {
        if (ref.current) {
          ref.current.play().then(() => {
            ref.current?.pause();
            if (ref.current) ref.current.currentTime = 0;
          }).catch(() => {});
        }
      });
    }
  };

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
      console.log("Booking status updated: accepted");
      alert("Booking accepted.");
    } catch (err) { alert("Failed to update booking."); }
  };

  const submitBookingRejection = async () => {
    if (!actioningBooking) return;
    const reason = actionReason === 'Other' ? customActionReason : actionReason;
    if (!reason) { alert("Provide a reason."); return; }
    try {
      await updateDoc(doc(db, "eventBookings", actioningBooking.id), {
        status: 'rejected',
        adminReason: reason,
        updatedAt: new Date().toISOString()
      });
      console.log("Admin action on booking: reject");
      alert("Booking rejected.");
      setActioningBooking(null);
      setActionReason('');
    } catch (err) { alert("Failed to reject."); }
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

  const handleVerifySubscription = async (sub: SubscriptionRequest & { id: string }) => {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "subscription", sub.id), { status: "active", verifiedBy: "admin", verifiedAt: now, activatedAt: now });
      await updateDoc(doc(db, "users", sub.userId), { role: "subscriber", isPremium: true, premiumActivatedAt: now, "subscription.status": "active", "subscription.plan": sub.planName, "subscription.startDate": now, "subscription.txnId": sub.txnId });
      alert(`Activation Successful!`);
    } catch (err: any) { alert(`Failure: ${err.message}`); } finally { setIsVerifying(null); }
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

  const getUserTypeBadge = (type: UserCategory | undefined) => {
    const category = type || 'registered';
    switch (category) {
      case 'subscriber': return <span className="flex items-center gap-1 bg-brand-gold text-brand-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">VIP <Star size={10} fill="currentColor" /></span>;
      case 'registered': return <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">Member</span>;
      default: return <span className="bg-gray-600 text-gray-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Legacy</span>;
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

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
                <div className="bg-brand-dark/30 border border-brand-gold/20 p-8 rounded-2xl text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Total</p>
                  <p className="text-3xl font-bold text-white">{activeStats.total}</p>
                </div>
                <div className="bg-brand-dark/30 border border-blue-500/20 p-8 rounded-2xl text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Accepted</p>
                  <p className="text-3xl font-bold text-blue-400">{activeStats.accepted}</p>
                </div>
                {activeOrderCategory === 'event_booking' ? (
                   <div className="bg-brand-dark/30 border border-brand-gold/20 p-8 rounded-2xl text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Pending</p>
                    <p className="text-3xl font-bold text-brand-gold">{(activeStats as any).pending}</p>
                  </div>
                ) : (
                  <div className="bg-brand-dark/30 border border-red-500/20 p-8 rounded-2xl text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Rejected</p>
                    <p className="text-3xl font-bold text-red-400">{activeStats.rejected}</p>
                  </div>
                )}
                <div className="bg-brand-dark/30 border border-green-500/20 p-8 rounded-2xl text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Success</p>
                  <p className="text-3xl font-bold text-green-400">{(activeStats as any).completed || (activeStats as any).accepted}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 pt-8 border-t border-brand-gold/10">
                {activeOrderCategory === 'event_booking' ? (
                  analyticsData.filteredBookings.map(booking => (
                    <div key={booking.id} className={`bg-brand-dark/50 border rounded-3xl p-8 transition-all group ${booking.status === 'pending' ? 'border-brand-gold shadow-lg animate-pulse' : booking.status === 'cancelled_by_user' ? 'border-red-900 bg-red-950/20' : 'border-gray-800'}`}>
                       <div className="flex flex-col md:flex-row gap-8 justify-between">
                          <div className="flex gap-6">
                             <div className={`w-16 h-16 rounded-2xl bg-brand-dark border flex items-center justify-center ${booking.status === 'cancelled_by_user' ? 'text-red-500 border-red-800' : 'text-brand-gold border-brand-gold/20'}`}><CalendarCheck size={28} /></div>
                             <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                   <h4 className="text-white font-bold text-2xl uppercase tracking-widest">{booking.bookingType} Party</h4>
                                   <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${booking.status === 'pending' ? 'bg-brand-gold text-brand-black' : booking.status === 'accepted' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                     {booking.status === 'cancelled_by_user' ? 'User Cancelled 🔕' : booking.status}
                                   </span>
                                </div>
                                <p className="text-sm text-gray-400 flex items-center gap-2 mb-4"><User size={14} className="text-brand-gold" /> {booking.userName} • {booking.phone}</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[10px] font-bold uppercase tracking-widest">
                                   <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full flex items-center gap-2"><Clock size={12} /> {booking.date} at {booking.time}</div>
                                   <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full flex items-center gap-2"><Users size={12} /> {booking.peopleCount} People</div>
                                </div>
                                {booking.specialNote && <p className="mt-4 p-4 bg-black/30 rounded-xl text-xs text-gray-300 italic border border-white/5">Note: {booking.specialNote}</p>}
                             </div>
                          </div>
                          <div className="flex gap-2">
                             {booking.status === 'pending' && (
                               <>
                                 <button onClick={() => handleBookingAction(booking.id!, 'accepted')} className="px-6 py-3 bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110">Approve</button>
                                 <button onClick={() => handleBookingAction(booking.id!, 'rejected')} className="px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110">Reject</button>
                               </>
                             )}
                             <a href={`tel:${booking.phone}`} className="p-3 bg-gray-900 border border-white/5 rounded-xl text-brand-gold"><Phone size={18} /></a>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  analyticsData.filtered.filter(o => o.orderType === activeOrderCategory && (userTypeFilter === 'all' || o.userType === userTypeFilter)).map(order => (
                    <div key={order.id} className={`bg-brand-dark/50 border rounded-3xl p-8 transition-all group ${order.status === 'pending' ? 'border-brand-gold' : 'border-gray-800'}`}>
                      <div className="flex flex-col md:flex-row gap-8 justify-between">
                        <div className="flex gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-brand-dark border border-brand-gold/20 flex items-center justify-center text-brand-gold">
                            {order.orderType === 'delivery' ? <Truck size={28} /> : order.orderType === 'table_booking' ? <Coffee size={28} /> : <Sofa size={28} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h4 className="text-white font-bold text-2xl">{order.itemName} {order.orderType === 'delivery' && <span className="text-brand-gold text-lg ml-2">x {order.quantity}</span>}</h4>
                              {getUserTypeBadge(order.userType)}
                              {order.paymentMode === 'points' && <span className="flex items-center gap-1 bg-brand-black text-brand-gold border border-brand-gold/50 px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-lg">POINT ORDER <Coins size={10} fill="currentColor" /></span>}
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                              <p className="text-sm text-gray-300 font-medium flex items-center gap-2"><User size={14} className="text-brand-gold" /> {order.userName} • {order.userPhone}</p>
                              <p className="text-sm text-gray-400 font-medium flex items-center gap-2"><Wallet size={14} className="text-brand-gold" /> User Balance: <span className="text-white font-bold">{allUsers[order.userId!]?.points || 0} pts</span></p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                               <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2"><Clock size={12} /> Status: <span className="text-white">{order.status.replace(/_/g, ' ')}</span></div>
                               <div className="bg-gray-900 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2"><CalendarDays size={12} /> {new Date(order.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col md:items-end justify-between gap-6 shrink-0">
                          <div className="text-right">
                             <p className="text-4xl font-display font-bold text-white mb-1">{order.paymentMode === 'points' ? `${order.pointsUsed} pts` : `₹${order.orderAmount}`}</p>
                             <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{order.paymentMode === 'points' ? 'Redemption' : `Earns: ${order.pointsEarned} pts`}</span>
                          </div>
                          <div className="flex gap-2">
                             {(order.status === 'pending' || order.status === 'accepted') && (
                               <>
                                 {getStatusAction(order.status) && <button onClick={() => handleUpdateOrderStatus(order.id, getStatusAction(order.status)!.next as any)} className={`px-6 py-3 ${getStatusAction(order.status)!.color} text-white rounded-xl text-[10px] font-bold uppercase tracking-widest`}><CheckCircle2 size={16} className="inline mr-2" /> {getStatusAction(order.status)!.label}</button>}
                                 <button onClick={() => setActioningOrder({id: order.id, action: 'reject'})} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"><Ban size={16} /></button>
                               </>
                             )}
                             <button onClick={() => deleteItem('orders', order.id)} className="px-4 py-3 bg-gray-900 text-gray-700 hover:text-red-500 rounded-xl border border-white/5 transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="space-y-12 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-end border-b border-brand-gold/10 pb-8">
                <div>
                   <h3 className="text-3xl font-display text-brand-gold mb-2 uppercase tracking-widest">Premium Members</h3>
                   <p className="text-gray-500 text-xs">Verify payment and activate subscriptions.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {subscriptions.filter(s => s.status === 'pending').map(sub => (
                    <div key={sub.id} className="bg-brand-dark/40 border border-brand-gold/30 rounded-3xl p-8 hover:bg-brand-dark/60 transition-all shadow-2xl group">
                       <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                          <div className="flex gap-6">
                             <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shrink-0 shadow-lg"><Zap size={32} /></div>
                             <div>
                                <div className="flex items-center gap-4 mb-3">
                                   <h5 className="text-white font-bold text-2xl">{sub.userName}</h5>
                                   <span className="bg-brand-red text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">{sub.planName}</span>
                                </div>
                                <p className="text-sm text-gray-400 flex items-center gap-2 font-medium"><Smartphone size={14} className="text-brand-gold"/> {sub.userPhone}</p>
                                <p className="text-sm text-gray-400 flex items-center gap-2 font-medium"><Mail size={14} className="text-brand-gold"/> {sub.userEmail}</p>
                                <div className="mt-4 p-4 bg-black/50 rounded-2xl border border-white/5"><p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">TXN ID: <span className="text-brand-gold font-mono font-bold tracking-wider">{sub.txnId}</span></p></div>
                             </div>
                          </div>
                          <div className="flex flex-col items-end justify-between gap-6">
                             <p className="text-4xl font-display font-bold text-white mb-1">{sub.amount}</p>
                             <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={() => handleVerifySubscription(sub)} disabled={isVerifying === sub.id} className="flex-1 md:flex-none px-10 py-4 bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 shadow-lg">{isVerifying === sub.id ? <Loader2 size={18} className="animate-spin" /> : "Activate"}</button>
                                <button onClick={() => updateDoc(doc(db, "subscription", sub.id), { status: 'rejected' })} className="px-6 py-4 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Reject</button>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {actioningBooking && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
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
              {actionReason === 'Other' && <textarea placeholder="Type reason..." value={customActionReason} onChange={(e) => setCustomActionReason(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white h-24 resize-none" />}
              <div className="flex gap-4 pt-4">
                 <button onClick={submitBookingRejection} className="flex-1 py-4 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Reject Booking</button>
                 <button onClick={() => setActioningBooking(null)} className="px-6 py-4 border border-gray-700 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actioningOrder && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-6">{actioningOrder.action === 'reject' ? 'Reject Order' : 'Cancel Order'}</h3>
            <div className="space-y-4">
              <select className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none" value={actionReason} onChange={(e) => setActionReason(e.target.value)}>
                <option value="">Select reason...</option>
                <option value="Item Out of Stock">Item Out of Stock</option>
                <option value="Kitchen Overloaded">Kitchen Overloaded</option>
                <option value="Delivery Issue">Delivery Issue</option>
                <option value="Other">Other...</option>
              </select>
              <div className="flex gap-4 pt-4">
                 <button onClick={handleOrderAction} className="flex-1 py-4 bg-brand-red text-white rounded-xl text-xs font-bold uppercase tracking-widest">Confirm</button>
                 <button onClick={() => setActioningOrder(null)} className="px-6 py-4 border border-gray-700 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-white">Back</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
