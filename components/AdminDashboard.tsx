
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
  increment,
  getDocs,
  limit,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Trash2, Utensils, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, Zap, User, Star, X, Search as SearchIcon, Edit3, Eye, EyeOff, Package, MapPin, Volume2, VolumeX, Smartphone, Tag, Phone, CreditCard, Calendar, ShieldCheck, AlertCircle, PartyPopper, Cake, Users, Gift, ArrowRight, Coins, Facebook, Instagram, Mail, MessageCircle, Loader2
} from 'lucide-react';
import { MenuItem, MenuCategory, Order, OrderStatus, UserProfile, PointTransaction, ContactInfo } from '../types';
import { getOptimizedImageURL, FIRST_ORDER_REWARD_INVITER, FIRST_ORDER_REWARD_REFERRED_USER, POINTS_PER_RUPEE, POINTS_EARN_RATE, RESTAURANT_INFO } from '../constants';
import AdminMenu from './AdminMenu'; // Import the new Menu Manager

interface AdminDashboardProps {
  onClose: () => void;
}

type OrderTab = 'new' | 'active' | 'completed' | 'cancelled';
type UserTypeFilter = 'all' | 'guest' | 'registered'; 
type OrderTypeFilter = 'all' | 'food' | 'table' | 'cabin' | 'event';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'referrals' | 'contact'>('orders');
  
  // Order System States
  const [orderTab, setOrderTab] = useState<OrderTab>('new');
  const [orderSearch, setOrderSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserTypeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);

  // Referral Panel States
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedReferralUser, setSelectedReferralUser] = useState<UserProfile | null>(null);
  const [referralHistory, setReferralHistory] = useState<any[]>([]);
  
  // Contact Panel States
  const [contactData, setContactData] = useState<ContactInfo>({
    phone: RESTAURANT_INFO.phone,
    whatsapp: RESTAURANT_INFO.whatsapp,
    address: RESTAURANT_INFO.address,
    hours: RESTAURANT_INFO.hours,
    facebook: '',
    instagram: '',
    email: 'contact@foodgarden.com'
  });
  const [isSavingContact, setIsSavingContact] = useState(false);

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

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      try {
        const loadedOrders = snapshot.docs.map(doc => ({ 
          ...sanitizeData(doc.data()), 
          id: doc.id 
        } as Order & { id: string }));
        
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
      } catch (err) { console.error("Error processing orders snapshot:", err); }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setAllUsers(snap.docs.map(d => ({ ...sanitizeData(d.data()), uid: d.id } as UserProfile)));
    });

    const unsubContact = onSnapshot(doc(db, "settings", "contact"), (snap) => {
      if (snap.exists()) setContactData(snap.data() as ContactInfo);
    });

    return () => { 
      unsubOrders(); unsubUsers(); unsubContact();
    };
  }, [isSoundEnabled]);

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

      // --- POINT SYSTEM LOGIC UPON DELIVERY ---
      if (newStatus === 'delivered' && order.userId) {
        const userRef = doc(db, "users", order.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          const currentPointsHistory = userData.pointsHistory || [];

          if (order.paymentMode === 'points' && !order.pointsDeducted) {
            // Deduct Points
            const spentTx: PointTransaction = {
              type: 'spent',
              amount: order.pointsUsed,
              via: 'order',
              date: new Date().toISOString(),
              orderId: order.id
            };
            batch.update(userRef, {
              points: increment(-order.pointsUsed),
              pointsHistory: [spentTx, ...currentPointsHistory.slice(0, 99)]
            });
            batch.update(orderRef, { pointsDeducted: true });
          } else if (order.paymentMode !== 'points' && !order.pointsCredited) {
            // Earn Points (10% of Order Value)
            const earnedPoints = Math.floor(order.orderAmount * POINTS_EARN_RATE);
            const earnedTx: PointTransaction = {
              type: 'earned',
              amount: earnedPoints,
              via: 'order',
              date: new Date().toISOString(),
              orderId: order.id
            };
            batch.update(userRef, {
              points: increment(earnedPoints),
              pointsHistory: [earnedTx, ...currentPointsHistory.slice(0, 99)]
            });
            batch.update(orderRef, { pointsCredited: true });
          }

          // Referral Reward System Logic (Only if it's the 1st order)
          if (!userData.firstOrderCompleted) {
            // First Order Completion Bonus for the user
            const firstOrderTx: PointTransaction = {
              type: 'earned',
              amount: FIRST_ORDER_REWARD_REFERRED_USER,
              via: 'bonus',
              date: new Date().toISOString()
            };
            batch.update(userRef, {
              points: increment(FIRST_ORDER_REWARD_REFERRED_USER),
              firstOrderCompleted: true,
              pointsHistory: [firstOrderTx, ...currentPointsHistory.slice(0, 99)]
            });

            // Reward History Log
            const userRewardLog = doc(collection(db, "referralRewards"));
            batch.set(userRewardLog, {
              userId: order.userId,
              pointsEarned: FIRST_ORDER_REWARD_REFERRED_USER,
              type: 'first_order',
              timestamp: new Date().toISOString(),
              orderId: order.id
            });

            if (userData.referredBy) {
              const inviterQuery = query(collection(db, "users"), where("referralCode", "==", userData.referredBy), limit(1));
              const inviterSnap = await getDocs(inviterQuery);
              if (!inviterSnap.empty) {
                const inviterDoc = inviterSnap.docs[0];
                const inviterUid = inviterDoc.id;
                const inviterData = inviterDoc.data() as UserProfile;
                const inviterHistory = inviterData.pointsHistory || [];

                const inviterTx: PointTransaction = {
                  type: 'earned',
                  amount: FIRST_ORDER_REWARD_INVITER,
                  via: 'referral',
                  date: new Date().toISOString()
                };
                
                batch.update(doc(db, "users", inviterUid), { 
                  points: increment(FIRST_ORDER_REWARD_INVITER),
                  pointsHistory: [inviterTx, ...inviterHistory.slice(0, 99)]
                });

                const inviterRewardLog = doc(collection(db, "referralRewards"));
                batch.set(inviterRewardLog, {
                  userId: inviterUid,
                  referredUserId: order.userId,
                  pointsEarned: FIRST_ORDER_REWARD_INVITER,
                  type: 'first_order',
                  timestamp: new Date().toISOString(),
                  orderId: order.id
                });
              }
            }
          }
        }
      }

      await batch.commit();
      alert(`Order updated: ${newStatus.toUpperCase()}`);
    } catch (err) { alert("Failed to update status."); }
  };

  const deleteItem = async (col: string, id: string) => {
    if (!window.confirm("Delete permanently?")) return;
    try { await deleteDoc(doc(db, col, id)); } catch (err) { alert("Failed."); }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    try {
      await setDoc(doc(db, "settings", "contact"), contactData);
      alert("Contact information updated successfully!");
    } catch (err) {
      alert("Failed to update contact info.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const openReferralHistory = async (user: UserProfile) => {
    setSelectedReferralUser(user);
    setReferralHistory([]);
    try {
      const q = query(collection(db, "referralRewards"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setReferralHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const status = (o.status || 'pending').toLowerCase();
      const isNew = status === 'pending';
      const isActive = ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(status);
      const isCompleted = status === 'delivered';
      const isCancelled = ['rejected', 'cancelled_by_user', 'cancelled_by_admin'].includes(status);

      if (orderTab === 'new' && !isNew) return false;
      if (orderTab === 'active' && !isActive) return false;
      if (orderTab === 'completed' && !isCompleted) return false;
      if (orderTab === 'cancelled' && !isCancelled) return false;

      const type = (o.orderType || '').toLowerCase();
      const mappedType = type.includes('delivery') || type.includes('order') ? 'food' :
                         type.includes('table') ? 'table' :
                         type.includes('cabin') ? 'cabin' : 'event';
      if (typeFilter !== 'all' && mappedType !== typeFilter) return false;
      if (userFilter !== 'all' && (o.userType || 'guest') !== userFilter) return false;

      const search = orderSearch.toLowerCase();
      if (search) {
        const nameMatch = (o.userName || '').toLowerCase().includes(search);
        const phoneMatch = (o.userPhone || '').includes(search);
        const idMatch = (o.id || '').toLowerCase().includes(search);
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

  const getStatusLabel = (status: OrderStatus) => {
    if (!status) return 'PENDING';
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
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 bg-brand-black">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-lg"><ShoppingBag size={24} /></div>
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-gold tracking-widest uppercase">Admin Hub</h2>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Food Garden Control Panel</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center bg-brand-dark p-1 rounded-lg border border-brand-gold/10">
          {['orders', 'menu', 'referrals', 'contact'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-gray-400'}`}>
              {tab === 'orders' ? <ShoppingBag size={12} /> : tab === 'menu' ? <Utensils size={12} /> : tab === 'referrals' ? <Gift size={12} /> : <MapPin size={12} />} {tab}
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
              <div className="bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-2xl space-y-6">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                  <div>
                    <h3 className="text-xl font-display text-white uppercase tracking-widest">Order Management</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Real-time control over all operations</p>
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full">
                    {[
                      {id:'new', l:'New Orders', i:Zap},
                      {id:'active', l:'Active', i:Clock},
                      {id:'completed', l:'Completed', i:CheckCircle2},
                      {id:'cancelled', l:'Cancelled', i:XCircle}
                    ].map(t => (
                      <button key={t.id} onClick={() => setOrderTab(t.id as OrderTab)} className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${orderTab === t.id ? 'bg-brand-gold text-brand-black' : 'text-gray-500 hover:text-white'}`}>
                        <t.i size={12} /> {t.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center border-t border-white/5 pt-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" placeholder="Search ID, Name or Phone..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:border-brand-gold outline-none" />
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
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                  const typeBadge = getOrderTypeBadge(order.orderType || '');
                  const isFood = (order.orderType || '').toLowerCase().includes('delivery') || (order.orderType || '').toLowerCase().includes('order');
                  return (
                    <div key={order.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row justify-between lg:items-center gap-8 group hover:border-brand-gold/30 transition-all shadow-xl">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest bg-brand-gold text-brand-black`}>
                            {order.userType || 'GUEST'}
                          </span>
                          <span className={`px-3 py-1 rounded border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${typeBadge.color}`}>
                            <typeBadge.icon size={12} /> {typeBadge.label}
                          </span>
                          {order.paymentMode === 'points' && (
                            <span className="px-3 py-1 rounded border border-brand-red/30 bg-brand-red/10 text-brand-red text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                              <Coins size={10} /> POINT ORDER
                            </span>
                          )}
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
                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Customer Details</p>
                              <p className="text-xs text-gray-300 italic">{order.address || 'No details provided'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row lg:flex-col items-center lg:items-end gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-white/5">
                        <div className="text-center lg:text-right">
                          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">
                            {order.paymentMode === 'points' ? 'POINTS SPENT' : 'ORDER VALUE'}
                          </p>
                          <p className="text-3xl font-display font-bold text-brand-gold">
                            {order.paymentMode === 'points' ? `${Math.floor(order.pointsUsed || 0)} Pts` : `₹${order.orderAmount || 0}`}
                          </p>
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
                                  {order.status === 'ready' && <button onClick={() => handleUpdateOrderStatus(order, 'out_for_delivery')} className="px-5 py-3 bg-orange-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">On-Way</button>}
                                </>
                              ) : (
                                <button onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="px-5 py-3 bg-brand-gold text-brand-black rounded-xl text-[10px] font-bold uppercase tracking-widest">Complete</button>
                              )}
                              <button onClick={() => handleUpdateOrderStatus(order, 'cancelled_by_admin')} className="px-5 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                            </div>
                          )}
                          {order.status === 'out_for_delivery' && (
                            <button onClick={() => handleUpdateOrderStatus(order, 'delivered')} className="px-6 py-3 bg-brand-gold text-brand-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white shadow-xl">Mark Delivered</button>
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
                     <p className="text-gray-500 italic font-serif uppercase tracking-widest text-xs">No {orderTab} orders found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'menu' && <div className="animate-fade-in"><AdminMenu /></div>}
          {activeTab === 'referrals' && (
            <div className="animate-fade-in space-y-8">
              <div className="bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-xl">
                 <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest">Referral Ecosystem</h3>
              </div>
              <div className="overflow-x-auto bg-brand-dark/40 border border-white/5 rounded-3xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/40 text-gray-500 uppercase tracking-widest font-bold">
                    <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Code</th><th className="px-6 py-4">Invited By</th><th className="px-6 py-4">Referrals</th><th className="px-6 py-4">Points</th><th className="px-6 py-4">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allUsers.filter(u => u.role !== 'admin').map(user => (
                      <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4"><div className="flex flex-col"><span className="text-white font-bold">{user.name}</span><span className="text-[10px] text-gray-500">{user.phone}</span></div></td>
                        <td className="px-6 py-4 text-brand-gold font-bold">{user.referralCode}</td>
                        <td className="px-6 py-4">{user.referredBy ? <span className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded text-[10px] font-bold">{user.referredBy}</span> : <span className="text-gray-600">—</span>}</td>
                        <td className="px-6 py-4"><span className="flex items-center gap-1.5 text-white font-medium"><Users size={12} className="text-brand-gold" /> {user.totalReferrals || 0}</span></td>
                        <td className="px-6 py-4 font-bold text-emerald-500">{Math.floor(user.points || 0)} Pts</td>
                        <td className="px-6 py-4"><button onClick={() => openReferralHistory(user)} className="px-4 py-1.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded text-[10px] font-bold uppercase tracking-widest">View History</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'contact' && (
            <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
              <div className="bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-xl">
                 <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest">Restaurant Identity & Contact</h3>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Control how customers reach and find you</p>
              </div>
              
              <form onSubmit={handleSaveContact} className="bg-brand-dark/50 border border-white/5 rounded-[2rem] p-8 md:p-12 space-y-10 shadow-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><MapPin size={12} className="text-brand-gold" /> Restaurant Address</label>
                       <textarea 
                          required 
                          value={contactData.address} 
                          onChange={e => setContactData({...contactData, address: e.target.value})} 
                          className="w-full bg-black/40 border border-gray-700 rounded-2xl p-4 text-white focus:border-brand-gold outline-none h-32 resize-none font-sans text-sm"
                          placeholder="Full Street Address"
                       />
                    </div>
                    <div className="space-y-8">
                       <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><Clock size={12} className="text-brand-gold" /> Opening Hours</label>
                          <input 
                             required 
                             value={contactData.hours || ''} 
                             onChange={e => setContactData({...contactData, hours: e.target.value})} 
                             className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none font-sans text-sm"
                             placeholder="e.g. 11:00 AM – 10:00 PM"
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><Mail size={12} className="text-brand-gold" /> Business Email</label>
                          <input 
                             type="email"
                             value={contactData.email || ''} 
                             onChange={e => setContactData({...contactData, email: e.target.value})} 
                             className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none font-sans text-sm"
                             placeholder="contact@foodgarden.com"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><Smartphone size={12} className="text-brand-gold" /> Contact Number (Calling)</label>
                       <input 
                          required 
                          value={contactData.phone} 
                          onChange={e => setContactData({...contactData, phone: e.target.value})} 
                          className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none font-sans text-sm"
                          placeholder="+91 88094 77481"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><MessageCircle size={12} className="text-emerald-500" /> WhatsApp Business (Ordering)</label>
                       <input 
                          required 
                          value={contactData.whatsapp} 
                          onChange={e => setContactData({...contactData, whatsapp: e.target.value})} 
                          className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none font-sans text-sm"
                          placeholder="918809477481 (Include Country Code, no +)"
                       />
                    </div>
                 </div>

                 <div className="pt-6 border-t border-white/5 space-y-8">
                    <h4 className="text-[10px] text-gray-600 uppercase font-bold tracking-[0.3em]">Social Media Presence</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><Facebook size={12} className="text-blue-500" /> Facebook Page Link</label>
                          <input 
                             value={contactData.facebook || ''} 
                             onChange={e => setContactData({...contactData, facebook: e.target.value})} 
                             className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none font-sans text-sm"
                             placeholder="https://facebook.com/foodgarden"
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1"><Instagram size={12} className="text-pink-500" /> Instagram Profile Link</label>
                          <input 
                             value={contactData.instagram || ''} 
                             onChange={e => setContactData({...contactData, instagram: e.target.value})} 
                             className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-white focus:border-brand-gold outline-none font-sans text-sm"
                             placeholder="https://instagram.com/foodgarden"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                    <button 
                       type="submit" 
                       disabled={isSavingContact}
                       className="px-12 py-5 bg-brand-gold text-brand-black rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white transition-all shadow-xl flex items-center gap-3 disabled:opacity-50"
                    >
                       {isSavingContact ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                       Publish Updates
                    </button>
                 </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {selectedReferralUser && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
               <div><h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">User Details</h3><p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{selectedReferralUser.name}</p></div>
               <button onClick={() => setSelectedReferralUser(null)} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Points</p>
                  <p className="text-2xl font-bold text-brand-gold">{Math.floor(selectedReferralUser.points || 0)}</p>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Referrals</p>
                  <p className="text-2xl font-bold text-brand-gold">{selectedReferralUser.totalReferrals || 0}</p>
                </div>
              </div>

              <h4 className="text-white font-bold uppercase text-[10px] tracking-widest mb-4">Transaction Ledger</h4>
              {selectedReferralUser.pointsHistory && selectedReferralUser.pointsHistory.length > 0 ? (
                selectedReferralUser.pointsHistory.map((reward, idx) => (
                  <div key={idx} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${reward.type === 'earned' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {reward.type === 'earned' ? <ArrowRight size={18} /> : <Zap size={18} />}
                      </div>
                      <div>
                        <p className="text-white font-bold capitalize">{reward.via} {reward.type}</p>
                        <p className="text-[9px] text-gray-600 uppercase tracking-widest">{new Date(reward.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${reward.type === 'earned' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {reward.type === 'earned' ? '+' : '-'}{Math.floor(reward.amount)} Pts
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-600 italic">No transactions found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
