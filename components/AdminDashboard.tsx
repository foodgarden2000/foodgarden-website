
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
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Trash2, Utensils, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, Check, Zap, User, Star, X, Search as SearchIcon, Edit3, Eye, EyeOff, Package, MapPin, Volume2, VolumeX, Smartphone, Tag, Phone, CreditCard, Calendar, ShieldCheck, AlertCircle, ExternalLink
} from 'lucide-react';
import { MenuItem, MenuCategory, Order, OrderStatus, SubscriptionRequest, UserProfile } from '../types';
import { getOptimizedImageURL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

type UserTypeFilter = 'all' | 'registered' | 'subscriber';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'subscriptions'>('orders');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('pending');
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('all');
  
  // Menu Management States
  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<(MenuItem & { id: string }) | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  
  // Category Management States
  const [allMenuCategories, setAllMenuCategories] = useState<MenuCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
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

  const [categoryForm, setCategoryForm] = useState<Partial<MenuCategory>>({
    categoryName: '',
    categoryImageUrl: '',
    isActive: true
  });

  // Subscription States
  const [subscriptions, setSubscriptions] = useState<(any & { id: string })[]>([]);
  const [subTab, setSubTab] = useState<'requests' | 'active' | 'rejected'>('requests');
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);
  
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to sanitize Firestore data to plain JSON-safe objects
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
    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }
    soundEnabledRef.current = isSoundEnabled;

    const unsubMenu = onSnapshot(collection(db, "menu"), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id }));
      setMenuItems(items);
    });

    const unsubMenuCats = onSnapshot(query(collection(db, "menuCategories"), orderBy("categoryName")), (snapshot) => {
      setAllMenuCategories(snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as MenuCategory)));
    });

    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const loadedOrders = snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id }));
      
      if (!isInitialLoad.current && soundEnabledRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && change.doc.data().status === 'pending') {
            audioRef.current?.play().catch(() => {});
          }
        });
      }
      setOrders(loadedOrders);
      isInitialLoad.current = false;
    });

    // Subscriptions Listener - Changed from "subscriptions" to "subscription"
    const unsubSubs = onSnapshot(collection(db, "subscription"), (snapshot) => {
      const fetchedSubs = snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id }));
      setSubscriptions(fetchedSubs);
    });

    return () => { 
      unsubMenu(); unsubMenuCats(); unsubOrders(); unsubSubs();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isSoundEnabled]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    let reason = '';
    if (newStatus === 'rejected' || newStatus === 'cancelled_by_admin') {
      const res = window.prompt("Reason for cancellation/rejection:");
      if (res === null) return;
      reason = res;
    }

    try {
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

      await updateDoc(doc(db, "orders", orderId), updateData);
      alert(`Order status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  // Subscription Actions
  const handleApproveSubscription = async (sub: any) => {
    if (!window.confirm(`Approve ${sub.userName}'s ${sub.planType} subscription?`)) return;
    setProcessingSubId(sub.id);
    
    try {
      const now = new Date();
      const approvedAt = now.toISOString();
      let expiryDate = null;
      
      if (sub.planType === 'yearly') {
        const expiry = new Date(now);
        expiry.setFullYear(expiry.getFullYear() + 1);
        expiryDate = expiry.toISOString();
      }

      const batch = writeBatch(db);

      // 1. Update Subscription Record - Changed from "subscriptions" to "subscription"
      const subRef = doc(db, "subscription", sub.id);
      batch.update(subRef, {
        status: 'active',
        isActive: true,
        approvedAt: approvedAt,
        expiryDate: expiryDate,
        updatedAt: approvedAt
      });

      // 2. Sync User Record
      const userRef = doc(db, "users", sub.userId);
      batch.update(userRef, {
        role: 'subscriber',
        subscriptionStatus: 'active',
        'subscription.status': 'active',
        'subscription.plan': sub.planType,
        'subscription.startDate': approvedAt,
        'subscription.expiryDate': expiryDate,
        'subscription.isExpired': false
      });

      await batch.commit();
      alert("Subscription approved successfully. User is now a Premium Subscriber.");
    } catch (err) {
      console.error(err);
      alert("Failed to approve subscription.");
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleRejectSubscription = async (sub: any) => {
    const reason = window.prompt("Enter reason for rejection:");
    if (reason === null) return;
    
    setProcessingSubId(sub.id);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      // 1. Update Subscription Record - Changed from "subscriptions" to "subscription"
      const subRef = doc(db, "subscription", sub.id);
      batch.update(subRef, {
        status: 'rejected',
        isActive: false,
        rejectedReason: reason,
        rejectedAt: now,
        updatedAt: now
      });

      // 2. Sync User Record
      const userRef = doc(db, "users", sub.userId);
      batch.update(userRef, {
        role: 'registered',
        subscriptionStatus: 'inactive',
        'subscription.status': 'rejected',
        'subscription.rejectedReason': reason
      });

      await batch.commit();
      alert("Subscription rejected.");
    } catch (err) {
      console.error(err);
      alert("Failed to reject.");
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.categoryName || !categoryForm.categoryImageUrl) {
      alert("Fields required.");
      return;
    }
    try {
      await addDoc(collection(db, "menuCategories"), { ...categoryForm, createdAt: new Date().toISOString() });
      setCategoryForm({ categoryName: '', categoryImageUrl: '', isActive: true });
      setIsCategoryModalOpen(false);
    } catch (err) { alert("Error."); }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.itemName || !menuForm.priceNum || !menuForm.category) {
      alert("Fields required.");
      return;
    }
    try {
      const data = { 
        ...menuForm, 
        name: menuForm.itemName, 
        price: `₹${menuForm.priceNum}`, 
        updatedAt: new Date().toISOString() 
      };
      if (editingMenuItem) {
        await updateDoc(doc(db, "menu", editingMenuItem.id), data);
        alert("Item updated.");
      } else {
        await addDoc(collection(db, "menu"), { ...data, createdAt: new Date().toISOString() });
        alert("Item added.");
      }
      setIsMenuFormOpen(false);
      setEditingMenuItem(null);
      setMenuForm({
        itemName: '', priceNum: 0, category: '', categoryType: 'Veg',
        description: '', backgroundImageUrl: '', isAvailable: true,
        isRecommended: false, isNewItem: false
      });
    } catch (err) { alert("Error."); }
  };

  const handleEditMenuItem = (item: MenuItem & { id: string }) => {
    setEditingMenuItem(item);
    setMenuForm({
      itemName: item.itemName || item.name,
      priceNum: item.priceNum || parseInt(item.price?.replace(/\D/g, '') || '0'),
      category: item.category,
      categoryType: item.categoryType || 'Veg',
      description: item.description,
      backgroundImageUrl: item.backgroundImageUrl || item.image || '',
      isAvailable: item.isAvailable ?? true,
      isRecommended: item.isRecommended ?? false,
      isNewItem: item.isNewItem ?? false
    });
    setIsMenuFormOpen(true);
  };

  const deleteItem = async (col: string, id: string) => {
    if (!window.confirm("Delete permanently?")) return;
    try { await deleteDoc(doc(db, col, id)); } catch (err) { alert("Failed."); }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      const statusMatch = orderStatusFilter === 'all' || item.status === orderStatusFilter;
      const typeMatch = userTypeFilter === 'all' || (item as any).userType === userTypeFilter;
      return statusMatch && typeMatch;
    });
  }, [orders, orderStatusFilter, userTypeFilter]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => 
      (item.itemName || item.name || '').toLowerCase().includes(menuSearch.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(menuSearch.toLowerCase())
    );
  }, [menuItems, menuSearch]);

  const filteredSubscriptions = useMemo(() => {
    if (subTab === 'requests') return subscriptions.filter(s => s.status === 'pending');
    if (subTab === 'active') return subscriptions.filter(s => s.isActive === true);
    if (subTab === 'rejected') return subscriptions.filter(s => s.status === 'rejected');
    return [];
  }, [subscriptions, subTab]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'accepted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'preparing': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ready': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'out_for_delivery': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
  };

  const getOrderTypeLabel = (type: string) => {
    switch(type) {
      case 'delivery': return 'Delivery';
      case 'table_booking': return 'Table Booking';
      case 'cabin_booking': return 'Cabin Booking';
      case 'kitty_party': return 'Kitty Party';
      case 'birthday_party': return 'Birthday Party';
      case 'club_meeting': return 'Club Meeting';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    target.onerror = null;
    target.src = 'https://via.placeholder.com/150?text=No+Image';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex flex-col overflow-hidden font-sans text-white">
      {/* Admin Navbar */}
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-lg"><ShoppingBag size={24} /></div>
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-gold tracking-widest uppercase text-shadow-gold">Admin Hub</h2>
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
            {isSoundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />} {isSoundEnabled ? 'ALERTS ON' : 'ALERTS OFF'}
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase text-brand-red ml-2 border-l border-brand-gold/10"><LogOut size={12} /> Exit</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {activeTab === 'orders' && (
            <div className="animate-fade-in space-y-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-2xl">
                <div>
                  <h3 className="text-xl font-display text-white uppercase tracking-widest">Order Fulfillment</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Live updates and status control</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {['pending', 'accepted', 'delivered', 'all'].map(s => (
                      <button key={s} onClick={() => setOrderStatusFilter(s as any)} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${orderStatusFilter === s ? 'bg-brand-gold text-brand-black' : 'text-gray-500 hover:text-white'}`}>{s}</button>
                    ))}
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {['all', 'registered', 'subscriber'].map(f => (
                      <button key={f} onClick={() => setUserTypeFilter(f as any)} className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${userTypeFilter === f ? 'bg-brand-gold text-brand-black' : 'text-gray-500'}`}>{f}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredOrders.map((order: any) => (
                  <div key={order.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-8 flex flex-col lg:flex-row justify-between lg:items-center gap-8 group hover:border-brand-gold/30 transition-all shadow-xl">
                    <div className="flex gap-6 items-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner ${getStatusColor(order.status)}`}>
                        {order.status === 'delivered' ? <CheckCircle2 size={30} /> : <Package size={30} />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h4 className="text-white font-bold text-2xl tracking-tight">{order.itemName}</h4>
                          <span className={`text-[10px] px-3 py-1 rounded-full border uppercase font-bold tracking-widest ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, ' ')}</span>
                          <span className={`text-[10px] px-3 py-1 rounded-full border border-white/5 uppercase font-bold tracking-widest ${order.userType === 'subscriber' ? 'bg-brand-red text-white' : 'bg-gray-800 text-gray-400'}`}>{order.userType || 'Guest'}</span>
                          <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full border border-brand-gold/20 uppercase font-bold tracking-widest flex items-center gap-1.5">
                            <Tag size={10} /> {getOrderTypeLabel(order.orderType)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <span className="text-white font-medium flex items-center gap-1.5"><User size={14} className="text-brand-gold" /> {order.userName}</span>
                          <span className="text-white font-medium flex items-center gap-1.5 bg-brand-gold/5 px-2 py-0.5 rounded border border-brand-gold/10">
                            <Smartphone size={14} className="text-brand-gold" /> {order.userPhone}
                          </span>
                          <span className="flex items-center gap-1.5"><Clock size={14} className="text-brand-gold" /> {new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                        {order.address && (
                          <div className="mt-3 flex items-start gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                            <MapPin size={14} className="text-brand-gold mt-0.5" />
                            <p className="text-xs text-gray-500 font-light italic">{order.address}</p>
                          </div>
                        )}
                        {order.rejectReason && (
                          <div className="mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">Status Note</p>
                            <p className="text-xs text-red-400 italic">"{order.rejectReason}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      <div className="text-center lg:text-right">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-3xl font-display font-bold text-brand-gold">₹{order.orderAmount}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Qty: {order.quantity} • {order.paymentMode}</p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {order.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'accepted')} className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg">Accept Order</button>
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'rejected')} className="px-6 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Reject</button>
                          </>
                        )}
                        {['accepted', 'preparing', 'ready'].includes(order.status) && (
                          <div className="flex gap-2">
                            {order.status === 'accepted' && <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className="px-5 py-3 bg-purple-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Utensils size={14}/> Prepare</button>}
                            {order.status === 'preparing' && <button onClick={() => handleUpdateOrderStatus(order.id, 'ready')} className="px-5 py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Check size={14}/> Ready</button>}
                            {order.status === 'ready' && <button onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')} className="px-5 py-3 bg-orange-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> Out For Delivery</button>}
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'cancelled_by_admin')} className="px-5 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                          </div>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} className="px-6 py-3 bg-brand-gold text-brand-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl">Mark As Delivered</button>
                        )}
                        {['delivered', 'cancelled_by_admin', 'cancelled_by_user', 'rejected'].includes(order.status) && (
                          <button onClick={() => deleteItem('orders', order.id)} className="p-3 text-gray-700 hover:text-rose-500 transition-colors bg-black/20 rounded-xl"><Trash2 size={20}/></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && (
                  <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 bg-brand-dark/20 rounded-3xl border border-dashed border-white/10">
                    <ShoppingBag size={48} className="text-gray-800" />
                    <p className="text-gray-500 font-serif italic text-lg">No orders matching current filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="animate-fade-in space-y-8">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl">
                <div>
                  <h3 className="text-xl font-display text-white uppercase tracking-widest">Menu Management</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manage dishes and categories</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search menu..." 
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="bg-black/40 border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:border-brand-gold outline-none w-full sm:w-64"
                    />
                    <SearchIcon className="absolute right-3 top-2.5 text-gray-600" size={14} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsCategoryModalOpen(true)} className="flex-1 sm:flex-none px-4 py-2 border border-brand-gold text-brand-gold rounded font-bold text-[10px] uppercase hover:bg-brand-gold hover:text-brand-black transition-colors">Categories</button>
                    <button onClick={() => { setEditingMenuItem(null); setIsMenuFormOpen(true); }} className="flex-1 sm:flex-none px-4 py-2 bg-brand-gold text-brand-black rounded font-bold text-[10px] uppercase hover:bg-white transition-colors">Add Item</button>
                  </div>
                </div>
              </div>
              
              <div className="bg-brand-dark/40 rounded-3xl overflow-hidden border border-brand-gold/10 shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-black/50 text-[10px] text-gray-500 uppercase font-bold tracking-widest border-b border-white/5">
                    <tr>
                      <th className="px-8 py-5">Dish Details</th>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5">Price</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMenuItems.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-dark border border-white/5 shrink-0">
                              <img src={getOptimizedImageURL(item.backgroundImageUrl || item.image || '')} className="w-full h-full object-cover" alt="" onError={handleImageError} />
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{item.itemName || item.name}</p>
                              <p className="text-[9px] text-gray-500 uppercase tracking-widest">{item.categoryType || 'Special'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">{item.category}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="font-bold text-brand-gold">{item.priceNum ? `₹${item.priceNum}` : item.price}</span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex gap-2">
                             {item.isAvailable === false && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase">Unavailable</span>}
                             {item.isRecommended && <Star size={12} className="text-brand-gold fill-brand-gold" />}
                             {item.isNewItem && <Zap size={12} className="text-blue-500 fill-blue-500" />}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditMenuItem(item)} className="p-2 text-gray-400 hover:text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-all"><Edit3 size={16} /></button>
                            <button onClick={() => deleteItem('menu', item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'subscriptions' && (
            <div className="animate-fade-in space-y-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-2xl">
                <div>
                  <h3 className="text-xl font-display text-white uppercase tracking-widest">Premium Memberships</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manage subscription requests and active subscribers</p>
                </div>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  {[
                    { id: 'requests', label: 'Requests', icon: AlertCircle },
                    { id: 'active', label: 'Active', icon: ShieldCheck },
                    { id: 'rejected', label: 'Rejected', icon: XCircle }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setSubTab(tab.id as any)} 
                      className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${subTab === tab.id ? 'bg-brand-gold text-brand-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      <tab.icon size={12} /> {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredSubscriptions.map((sub: any) => (
                  <div key={sub.id} className="bg-brand-dark/50 border border-gray-800 rounded-3xl p-8 flex flex-col lg:flex-row justify-between lg:items-center gap-8 group hover:border-brand-gold/30 transition-all shadow-xl">
                    <div className="flex gap-6 items-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : sub.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                        {sub.status === 'active' ? <ShieldCheck size={30} /> : <Zap size={30} />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h4 className="text-white font-bold text-2xl tracking-tight">{sub.userName}</h4>
                          <span className={`text-[10px] px-3 py-1 rounded-full border uppercase font-bold tracking-widest ${sub.planType === 'lifetime' ? 'bg-brand-red text-white' : 'bg-brand-gold text-brand-black'}`}>{sub.planType}</span>
                          <span className={`text-[10px] px-3 py-1 rounded-full border uppercase font-bold tracking-widest ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-gray-800 text-gray-500 border-white/5'}`}>{sub.status}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <span className="text-white font-medium flex items-center gap-1.5"><Smartphone size={14} className="text-brand-gold" /> {sub.userPhone || sub.phone}</span>
                          <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-brand-gold" /> TXN: {sub.transactionId}</span>
                          <span className="flex items-center gap-1.5"><Clock size={14} className="text-brand-gold" /> Request: {new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                        {sub.expiryDate && (
                          <div className="mt-3 flex items-center gap-2 bg-black/20 p-2 px-3 rounded-lg border border-white/5 w-fit">
                            <Calendar size={14} className="text-brand-gold" />
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Expires: {new Date(sub.expiryDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {sub.rejectedReason && (
                          <div className="mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">Rejection Reason</p>
                            <p className="text-xs text-red-400 italic">"{sub.rejectedReason}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      <div className="text-center lg:text-right">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">Payment Verified</p>
                        <p className="text-2xl font-display font-bold text-white">₹{sub.amountPaid || (sub.planType === 'lifetime' ? 4999 : 999)}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">UPI Transaction</p>
                      </div>
                      
                      {sub.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApproveSubscription(sub)} 
                            disabled={processingSubId === sub.id}
                            className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg flex items-center gap-2"
                          >
                            {processingSubId === sub.id ? <Volume2 className="animate-spin" size={14} /> : <Check size={14} />} Approve
                          </button>
                          <button 
                            onClick={() => handleRejectSubscription(sub)}
                            disabled={processingSubId === sub.id}
                            className="px-6 py-3 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {sub.status !== 'pending' && (
                        <button onClick={() => deleteItem('subscription', sub.id)} className="p-3 text-gray-700 hover:text-rose-500 transition-colors bg-black/20 rounded-xl"><Trash2 size={20}/></button>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredSubscriptions.length === 0 && (
                  <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 bg-brand-dark/20 rounded-3xl border border-dashed border-white/10">
                    <Zap size={48} className="text-gray-800" />
                    <p className="text-gray-500 font-serif italic text-lg">No {subTab} subscriptions found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forms & Modals */}
      {isMenuFormOpen && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-bold text-white uppercase tracking-widest">
                 {editingMenuItem ? 'Edit Dish' : 'Add New Dish'}
               </h3>
               <button onClick={() => { setIsMenuFormOpen(false); setEditingMenuItem(null); }} className="text-gray-500 hover:text-white"><X /></button>
            </div>
            <form onSubmit={handleSaveMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Dish Name</label>
                <input required value={menuForm.itemName} onChange={e => setMenuForm({...menuForm, itemName: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold" placeholder="e.g. Paneer Tikka" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Price (₹)</label>
                <input required type="number" value={menuForm.priceNum} onChange={e => setMenuForm({...menuForm, priceNum: parseInt(e.target.value)})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold" placeholder="Price" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Category</label>
                <select required value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold">
                   <option value="">Select Category</option>
                   {allMenuCategories.map(c => <option key={c.id} value={c.categoryName}>{c.categoryName}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Dietary Info</label>
                <select value={menuForm.categoryType} onChange={e => setMenuForm({...menuForm, categoryType: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold">
                   <option value="Veg">Pure Veg</option>
                   <option value="Non-Veg">Non-Veg</option>
                   <option value="Jain">Jain Friendly</option>
                   <option value="Special">Chef's Special</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Image URL</label>
                <input required value={menuForm.backgroundImageUrl} onChange={e => setMenuForm({...menuForm, backgroundImageUrl: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold" placeholder="Direct link to image" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Description</label>
                <textarea value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none h-20 resize-none focus:border-brand-gold" placeholder="Short description..." />
              </div>
              <div className="flex gap-4 pt-4 md:col-span-2">
                <button type="submit" className="flex-1 py-4 bg-brand-gold text-brand-black rounded-xl font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl">
                  {editingMenuItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-8 shrink-0">
               <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Category Manager</h3>
               <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-white"><X /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
               <div className="lg:col-span-1 pr-8">
                 <form onSubmit={handleSaveCategory} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Name</label>
                      <input required value={categoryForm.categoryName} onChange={e => setCategoryForm({...categoryForm, categoryName: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold" placeholder="e.g. Main Course" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Banner Image URL</label>
                      <input required value={categoryForm.categoryImageUrl} onChange={e => setCategoryForm({...categoryForm, categoryImageUrl: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brand-gold" placeholder="Image link" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-gold text-brand-black font-bold uppercase rounded-xl shadow-lg hover:bg-white transition-all">Add</button>
                 </form>
               </div>
               <div className="lg:col-span-2 overflow-y-auto pr-2">
                 <div className="grid grid-cols-1 gap-4">
                    {allMenuCategories.map(cat => (
                      <div key={cat.id} className="bg-black/40 rounded-xl border border-white/5 p-4 flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded bg-brand-dark overflow-hidden">
                               <img src={getOptimizedImageURL(cat.categoryImageUrl)} className="w-full h-full object-cover" alt="" onError={handleImageError} />
                            </div>
                            <h5 className="text-white font-bold">{cat.categoryName}</h5>
                         </div>
                         <div className="flex gap-4">
                            <button onClick={() => updateDoc(doc(db, "menuCategories", cat.id!), { isActive: !cat.isActive })} className={`${cat.isActive ? 'text-green-500 bg-green-500/10' : 'text-gray-600 bg-white/5'} p-2 rounded-lg`}>
                              {cat.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                            <button onClick={() => deleteItem('menuCategories', cat.id!)} className="text-gray-700 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg">
                              <Trash2 size={18} />
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
