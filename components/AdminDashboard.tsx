
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  addDoc,
  orderBy,
  writeBatch,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Trash2, Utensils, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, Zap, User, Star, X, Search as SearchIcon, Edit3, Eye, EyeOff, Package, MapPin, Volume2, VolumeX, Smartphone, Tag, Phone, CreditCard, Calendar, ShieldCheck, AlertCircle, PartyPopper, Cake, Users
} from 'lucide-react';
import { MenuItem, MenuCategory, Order, OrderStatus, UserProfile } from '../types';
import { getOptimizedImageURL } from '../constants';
import AdminMenu from './AdminMenu'; // Import the new Menu Manager

interface AdminDashboardProps {
  onClose: () => void;
}

type OrderTab = 'new' | 'active' | 'completed' | 'cancelled';
type UserTypeFilter = 'all' | 'guest' | 'registered' | 'subscriber';
type OrderTypeFilter = 'all' | 'food' | 'table' | 'cabin' | 'event';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'subscriptions'>('orders');
  
  // Order System States
  const [orderTab, setOrderTab] = useState<OrderTab>('new');
  const [orderSearch, setOrderSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserTypeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  
  // Subscription States
  const [pendingSubs, setPendingSubs] = useState<any[]>([]);
  const [activeSubs, setActiveSubs] = useState<any[]>([]);
  const [rejectedSubs, setRejectedSubs] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'requests' | 'active' | 'rejected'>('requests');
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);

  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const isInitialLoad = useRef(true);
  const sounds = useRef<{ new: HTMLAudioElement; cancel: HTMLAudioElement } | null>(null);

  const sanitizeData = (data: any) => {
    if (!data) return data;
    const sanitized: any = { ...data };
    for (const key in sanitized) {
      if (sanitized[key] && typeof sanitized[key].toDate === 'function') {
        sanitized[key] = sanitized[key].toDate().toISOString();
      }
    }
    return sanitized;
  };

  useEffect(() => {
    if (!sounds.current) {
      sounds.current = {
        new: new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'),
        cancel: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3')
      };
    }

    // Unified Orders Listener - Simplified for maximum stability
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const loadedOrders = snapshot.docs.map(doc => ({ 
        ...sanitizeData(doc.data()), 
        id: doc.id 
      } as Order & { id: string }));
      
      // Sort client-side to ensure it always works without composite index requirements
      loadedOrders.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      if (!isInitialLoad.current && isSoundEnabled) {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (change.type === "added" && data.status === 'pending') {
            sounds.current?.new.play().catch(() => {});
          }
          if (change.type === "modified" && data.status === 'cancelled_by_user') {
            sounds.current?.cancel.play().catch(() => {});
          }
        });
      }
      setOrders(loadedOrders);
      isInitialLoad.current = false;
    }, (error) => {
      console.error("Firestore Orders Listener Error:", error);
    });

    // Subscriptions Listeners
    const unsubPending = onSnapshot(query(collection(db, "subscription"), where("status", "==", "pending")), (snap) => setPendingSubs(snap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}))));
    const unsubActive = onSnapshot(query(collection(db, "subscription"), where("isActive", "==", true)), (snap) => setActiveSubs(snap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}))));
    const unsubRejected = onSnapshot(query(collection(db, "subscription"), where("status", "==", "rejected")), (snap) => setRejectedSubs(snap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}))));

    return () => { 
      unsubOrders(); unsubPending(); unsubActive(); unsubRejected();
    };
  }, [isSoundEnabled]);

  // Order Fulfillment Actions
  const handleUpdateOrderStatus = async (order: Order & { id: string }, newStatus: OrderStatus) => {
    let reason = '';
    if (newStatus === 'rejected' || newStatus === 'cancelled_by_admin') {
      const res = window.prompt("Reason for cancellation/rejection:");
      if (res === null) return;
      reason = res;
    }

    try {
      const batch = writeBatch(db);
      const updateData: any = { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      };
      
      if (newStatus === 'accepted') updateData.acceptedAt = new Date().toISOString();
      if (newStatus === 'delivered') updateData.deliveredAt = new Date().toISOString();
      if (reason) {
        updateData.rejectReason = reason;
        updateData.cancelledBy = 'admin';
      }

      const orderRef = doc(db, "orders", order.id);
      batch.update(orderRef, updateData);

      // Points deduction logic on completion
      if (newStatus === 'delivered' && order.paymentMode === 'points' && order.pointsUsed > 0 && order.userId) {
        const userRef = doc(db, "users", order.userId);
        batch.update(userRef, { points: increment(-order.pointsUsed) });
        batch.update(orderRef, { pointsDeducted: true });
      }

      await batch.commit();
      alert(`Order status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const deleteItem = async (col: string, id: string) => {
    if (!window.confirm("Delete permanently?")) return;
    try { await deleteDoc(doc(db, col, id)); } catch (err) { alert("Failed."); }
  };

  const handleApproveSubscription = async (sub: any) => {
    if (!window.confirm(`Approve subscription for ${sub.userName}?`)) return;
    setProcessingSubId(sub.id);
    try {
      const batch = writeBatch(db);
      const expiryDate = new Date();
      if (sub.planType === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setFullYear(expiryDate.getFullYear() + 100);

      batch.update(doc(db, "subscription", sub.id), {
        status: 'approved',
        isActive: true,
        expiryDate: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      });

      batch.update(doc(db, "users", sub.userId), {
        role: 'subscriber',
        subscription: {
          status: 'active',
          plan: sub.planType,
          startDate: new Date().toISOString(),
          expiryDate: expiryDate.toISOString(),
          transactionId: sub.transactionId
        }
      });

      await batch.commit();
      alert("Subscription approved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to approve subscription.");
    } finally {
      setProcessingSubId(null);
    }
  };

  // Order Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o.status) return false;
      
      const s = o.status;
      const isNew = s === 'pending';
      const isActive = ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(s);
      const isCompleted = s === 'delivered';
      const isCancelled = ['rejected', 'cancelled_by_user', 'cancelled_by_admin'].includes(s);

      // Tab Filtering
      if (orderTab === 'new' && !isNew) return false;
      if (orderTab === 'active' && !isActive) return false;
      if (orderTab === 'completed' && !isCompleted) return false;
      if (orderTab === 'cancelled' && !isCancelled) return false;

      // Type Filtering
      const t = (o.orderType || '').toLowerCase();
      const mappedType = t.includes('delivery') || t.includes('order') ? 'food' :
                         t.includes('table') ? 'table' :
                         t.includes('cabin') ? 'cabin' : 'event';
      if (typeFilter !== 'all' && mappedType !== typeFilter) return false;

      // User Filter
      if (userFilter !== 'all' && (o.userType || 'guest') !== userFilter) return false;

      // Search
      const search = orderSearch.toLowerCase();
      if (search) {
        const nameMatch = (o.userName || '').toLowerCase().includes(search);
        const phoneMatch = (o.userPhone || '').includes(search);
        const idMatch = o.id.toLowerCase().includes(search);
        const itemMatch = (o.itemName || '').toLowerCase().includes(search);
        if (!nameMatch && !phoneMatch && !idMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, orderTab, typeFilter, userFilter, orderSearch]);

  const getTimeElapsed = (createdAt: string) => {
    if (!createdAt) return 'Unknown';
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getOrderTypeBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('delivery') || t.includes('order')) return { label: 'FOOD ORDER', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Package };
    if (t.includes('table')) return { label: 'TABLE BOOKING', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Coffee };
    if (t.includes('cabin')) return { label: 'CABIN BOOKING', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Sofa };
    return { label: 'EVENT BOOKING', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: PartyPopper };
  };

  const getUserBadge = (type: string) => {
    switch(type) {
      case 'subscriber': return 'bg-brand-red text-white';
      case 'registered': return 'bg-brand-gold text-brand-black';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    if (!status) return 'UNKNOWN';
    switch(status) {
      case 'pending': return 'PENDING';
      case 'accepted': return 'ACCEPTED';
      case 'preparing': return 'PREPARING';
      case 'ready': return 'READY';
      case 'out_for_delivery': return 'ON-THE-WAY';
      case 'delivered': return 'COMPLETED';
      case 'cancelled_by_user': return 'USER CANCELLED';
      case 'cancelled_by_admin': return 'ADMIN CANCELLED';
      case 'rejected': return 'REJECTED';
      default: return (status as string).toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex flex-col overflow-hidden font-sans text-white">
      {/* Admin Navbar */}
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 bg-brand-black">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-lg"><ShoppingBag size={24} /></div>
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-gold tracking-widest uppercase">Admin Hub</h2>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Chef's Jalsa Control Panel</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center bg-brand-dark p-1 rounded-lg border border-brand-gold/10">
          {['orders', 'menu', 'subscriptions'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400'}`}>
              {tab === 'orders' ? <ShoppingBag size={12} /> : tab === 'menu' ? <Utensils size={12} /> : <Zap size={12} />} {tab}
            </button>
          ))}
          <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase ml-2 border ${isSoundEnabled ? 'border-brand-gold text-brand-gold' : 'border-gray-800 text-gray-500'}`}>
            {isSoundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />} {isSoundEnabled ? 'SOUND ON' : 'SOUND OFF'}
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase text-brand-red ml-2 border-l border-brand-gold/10"><LogOut size={12} /> Exit</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {activeTab === 'orders' && (
            <div className="animate-fade-in space-y-8">
              {/* Filter Header */}
              <div className="bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-2xl space-y-6">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                  <div>
                    <h3 className="text-xl font-display text-white uppercase tracking-widest">Order Management</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Real-time control over all operations</p>
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {[
                      {id:'new', l:'New Orders', i:Zap},
                      {id:'active', l:'Active', i:Clock},
                      {id:'completed', l:'Completed', i:CheckCircle2},
                      {id:'cancelled', l:'Cancelled', i:XCircle}
                    ].map(t => (
                      <button key={t.id} onClick={() => setOrderTab(t.id as OrderTab)} className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${orderTab === t.id ? 'bg-brand-gold text-brand-black' : 'text-gray-500 hover:text-white'}`}>
                        <t.i size={12} /> {t.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center border-t border-white/5 pt-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search ID, Name or Phone..." 
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-brand-gold">
                      <option value="all">ALL TYPES</option>
                      <option value="food">FOOD ONLY</option>
                      <option value="table">TABLES</option>
                      <option value="cabin">CABINS</option>
                      <option value="event">EVENTS</option>
                    </select>
                    <select value={userFilter} onChange={e => setUserFilter(e.target.value as any)} className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-brand-gold">
                      <option value="all">ALL USERS</option>
                      <option value="guest">GUESTS</option>
                      <option value="registered">REGISTERED</option>
                      <option value="subscriber">PREMIUM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="grid grid-cols-1 gap-6">
                {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                  const typeBadge = getOrderTypeBadge(order.orderType || '');
                  const isFood = (order.orderType || '').toLowerCase().includes('delivery') || (order.orderType || '').toLowerCase().includes('order');

                  return (
                    <div key={order.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row justify-between lg:items-center gap-8 group hover:border-brand-gold/30 transition-all shadow-xl">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${getUserBadge(order.userType)}`}>
                            {order.userType || 'GUEST'}
                          </span>
                          <span className={`px-3 py-1 rounded border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${typeBadge.color}`}>
                            <typeBadge.icon size={12} /> {typeBadge.label}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">#{order.id.slice(-6).toUpperCase()}</span>
                          <span className="ml-auto lg:ml-0 text-[10px] text-brand-gold/60 font-bold bg-brand-gold/5 px-2 py-0.5 rounded border border-brand-gold/10">
                            {getTimeElapsed(order.createdAt)}
                          </span>
                        </div>

                        <div className="flex gap-6 items-start">
                          <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0">
                            {isFood ? <Package className="text-brand-gold" size={24} /> : <Calendar className="text-brand-gold" size={24} />}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-xl mb-1">{order.itemName || 'Untitled Item'}</h4>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
                              <span className="flex items-center gap-1.5 font-medium"><User size={14} className="text-brand-gold" /> {order.userName || 'Guest'}</span>
                              <span className="flex items-center gap-1.5 font-medium"><Smartphone size={14} className="text-brand-gold" /> {order.userPhone || 'N/A'}</span>
                            </div>
                            
                            <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                              {isFood ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Delivery Address</p>
                                  <p className="text-xs text-gray-300 italic">{order.address || 'No address provided'}</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Booking Context</p>
                                  <p className="text-xs text-gray-300 italic">{order.address || 'No details'}</p>
                                </div>
                              )}
                              {order.notes && (
                                <div className="mt-2 border-t border-white/5 pt-2">
                                  <p className="text-[10px] text-brand-gold/60 uppercase font-bold tracking-widest">Customer Note</p>
                                  <p className="text-xs text-gray-400">"{order.notes}"</p>
                                </div>
                              )}
                            </div>

                            {(order.rejectReason || order.cancelReason) && (
                              <div className="mt-3 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Reason</p>
                                <p className="text-xs text-rose-400 italic">"{order.rejectReason || order.cancelReason}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row lg:flex-col items-center lg:items-end gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-white/5">
                        <div className="text-center lg:text-right">
                          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">
                            {order.paymentMode === 'points' ? 'POINTS TO REDEEM' : 'TOTAL PAYABLE'}
                          </p>
                          <p className="text-3xl font-display font-bold text-brand-gold">
                            {order.paymentMode === 'points' ? `${order.pointsUsed || 0} Pts` : `₹${order.orderAmount || 0}`}
                          </p>
                          <div className="flex items-center justify-center lg:justify-end gap-2 mt-1">
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">QTY: {order.quantity || 1} • {(order.paymentMode || 'cash').toUpperCase()}</span>
                            {order.pointsUsed > 0 && order.pointsDeducted && <ShieldCheck size={10} className="text-emerald-500" />}
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-center lg:justify-end gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateOrderStatus(order, 'accepted')} className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 shadow-lg">Accept</button>
                              <button onClick={() => handleUpdateOrderStatus(order, 'rejected')} className="px-6 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white">Reject</button>
                            </>
                          )}
                          
                          {['accepted', 'preparing', 'ready'].includes(order.status) && (
                            <div className="flex gap-2">
                              {isFood ? (
                                <>
                                  {order.status === 'accepted' && <button onClick={() => handleUpdateOrderStatus(order, 'preparing')} className="px-5 py-3 bg-purple-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Prepare</button>}
                                  {order.status === 'preparing' && <button onClick={() => handleUpdateOrderStatus(order, 'ready')} className="px-5 py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Ready</button>}
                                  {order.status === 'ready' && <button onClick={() => handleUpdateOrderStatus(order, 'out_for_delivery')} className="px-5 py-3 bg-orange-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">On-The-Way</button>}
                                </>
                              ) : (
                                <button onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="px-5 py-3 bg-brand-gold text-brand-black rounded-xl text-[10px] font-bold uppercase tracking-widest">Mark Completed</button>
                              )}
                              <button onClick={() => handleUpdateOrderStatus(order, 'cancelled_by_admin')} className="px-5 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                            </div>
                          )}

                          {order.status === 'out_for_delivery' && (
                            <button onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="px-6 py-3 bg-brand-gold text-brand-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white shadow-xl">Complete Order</button>
                          )}

                          {['delivered', 'cancelled_by_admin', 'cancelled_by_user', 'rejected'].includes(order.status) && (
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{getStatusLabel(order.status)}</span>
                              <button onClick={() => deleteItem('orders', order.id)} className="p-3 text-gray-700 hover:text-rose-500 bg-black/20 rounded-xl transition-all"><Trash2 size={20}/></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-24 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                     <Package className="mx-auto text-gray-700 mb-4" size={48} />
                     <p className="text-gray-500 italic font-serif uppercase tracking-widest text-xs">No {orderTab} orders matching your current filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="animate-fade-in">
              <AdminMenu />
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="animate-fade-in space-y-8">
              <div className="flex justify-between items-center bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl">
                <h3 className="text-xl font-display text-white uppercase tracking-widest">Premium Subscriptions</h3>
                <div className="flex bg-black/40 p-1 rounded-xl">
                  {['requests', 'active', 'rejected'].map(t => (
                    <button key={t} onClick={() => setSubTab(t as any)} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${subTab === t ? 'bg-brand-gold text-brand-black' : 'text-gray-500 hover:text-white'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {(subTab === 'requests' ? pendingSubs : subTab === 'active' ? activeSubs : rejectedSubs).map(sub => (
                  <div key={sub.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-8 flex justify-between items-center">
                    <div className="flex gap-6 items-center">
                      <div className="p-4 rounded-2xl bg-brand-gold/10 text-brand-gold border border-brand-gold/20"><ShieldCheck size={30} /></div>
                      <div>
                        <h4 className="text-white font-bold text-2xl tracking-tight">{sub.userName}</h4>
                        <p className="text-gray-500 text-sm">{sub.phone} • {sub.planType.toUpperCase()}</p>
                      </div>
                    </div>
                    {subTab === 'requests' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveSubscription(sub)} className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase">Approve</button>
                        <button onClick={() => deleteItem('subscription', sub.id)} className="px-6 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
