
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  increment,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Edit2, Trash2, Save, Utensils, Calendar, 
  Info, Tag, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, Truck, Sofa, Coffee, ArrowRight, Play, Check, Image as ImageIcon, AlertTriangle
} from 'lucide-react';
import { MenuItem, FestivalSpecial, CategoryConfig, Order, OrderStatus } from '../types';
import { getOptimizedImageURL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'festivals' | 'orders'>('orders');
  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [festivals, setFestivals] = useState<(FestivalSpecial & { id: string })[]>([]);
  const [categories, setCategories] = useState<(CategoryConfig & { id: string })[]>([]);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({ name: '', category: '', price: '', description: '', image: '' });

  useEffect(() => {
    const unsubMenu = onSnapshot(query(collection(db, "menu"), orderBy("category")), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, err => console.error("Menu fetch error:", err));

    const unsubFest = onSnapshot(query(collection(db, "festivals"), orderBy("title")), (snapshot) => {
      setFestivals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, err => console.error("Festivals fetch error:", err));

    const unsubCats = onSnapshot(query(collection(db, "categories"), orderBy("name")), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, err => console.error("Categories fetch error:", err));

    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setError(null);
    }, err => {
      console.error("Orders fetch error:", err);
      setError("Failed to sync orders. Check internet or permissions.");
    });

    return () => { unsubMenu(); unsubFest(); unsubCats(); unsubOrders(); };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const order = orderSnap.data() as Order;

      await updateDoc(orderRef, {
        status: newStatus,
        deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null
      });

      if (newStatus === 'delivered' && order.userId && !order.pointsCredited) {
        await updateDoc(doc(db, "users", order.userId), { points: increment(order.pointsEarned || 0) });
        await updateDoc(orderRef, { pointsCredited: true });
      }
    } catch (err) { 
      console.error("Status update error:", err);
      alert("Error updating status. Please try again."); 
    }
  };

  const deleteItem = async (col: string, id: string) => {
    if (window.confirm("Delete this permanent record?")) {
      await deleteDoc(doc(db, col, id));
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "menu"), menuForm);
      setMenuForm({ name: '', category: '', price: '', description: '', image: '' });
      alert("Item added successfully!");
    } catch (err) { alert("Failed to add item"); }
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

  return (
    <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex flex-col overflow-hidden">
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20"><ShoppingBag size={24} /></div>
          <div>
            <h2 className="text-2xl font-display font-bold text-brand-gold tracking-widest uppercase">Admin Hub</h2>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Real-Time Control Panel</p>
          </div>
        </div>
        <div className="flex bg-brand-dark p-1 rounded-lg border border-brand-gold/10 overflow-x-auto">
          {[
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'menu', label: 'Menu', icon: Utensils },
            { id: 'festivals', label: 'Festivals', icon: Calendar }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-gold text-brand-black' : 'text-gray-400'}`}><tab.icon size={12} /> {tab.label}</button>
          ))}
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest text-brand-red ml-2 border-l border-brand-gold/10"><LogOut size={12} /> Exit</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500">
              <AlertTriangle size={20} />
              <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 gap-6">
              {orders.map(order => {
                const action = getStatusAction(order.status);
                const oType = order.orderType || 'delivery';
                const statusLabel = (order.status || 'pending').replace('_', ' ');
                
                return (
                  <div key={order.id} className={`bg-brand-dark/50 backdrop-blur border rounded-2xl p-6 transition-all ${order.status === 'pending' ? 'border-brand-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-gray-800'}`}>
                    <div className="flex flex-col md:flex-row gap-6 justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-brand-dark rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20 shrink-0">
                          {oType === 'delivery' ? <Truck size={20} /> : oType === 'table_booking' ? <Coffee size={20} /> : <Sofa size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-white font-bold text-lg">{order.itemName || 'Untitled Item'} x {order.quantity || 1}</h4>
                            <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded uppercase font-bold tracking-widest">{oType.replace('_', ' ')}</span>
                          </div>
                          <p className="text-xs text-gray-500">ID: {order.id?.substring(0, 8)}... • Customer: <span className="text-white">{order.userName || 'Guest'}</span> ({order.userPhone || 'No Phone'})</p>
                          <p className="text-xs text-gray-400 mt-2"><Tag size={10} className="inline mr-1" /> {order.address || 'No address provided'}</p>
                          {order.notes && <p className="text-xs text-brand-gold mt-2 font-italic">" {order.notes} "</p>}
                          <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-gray-800 text-gray-400 px-3 py-1 rounded">
                            <Clock size={10} /> Status: <span className="text-white">{statusLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end justify-between gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-display font-bold text-white">₹{order.orderAmount || 0}</p>
                          <p className="text-[10px] text-brand-gold uppercase tracking-widest font-bold">Points: {order.pointsEarned || 0}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {action && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id!, action.next as OrderStatus)}
                              className={`flex items-center gap-2 px-4 py-2 ${action.color} text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-lg`}
                            >
                              <action.icon size={14} /> {action.label}
                            </button>
                          )}
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id!, 'cancelled')}
                              className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white"
                            >
                              <XCircle size={14} className="inline mr-1" /> Cancel
                            </button>
                          )}
                          <button onClick={() => deleteItem('orders', order.id!)} className="p-2 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 && (
                <div className="text-center py-24 text-gray-600 font-serif border-2 border-dashed border-gray-800 rounded-3xl">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Awaiting incoming orders...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-12">
              <div className="bg-brand-dark/40 border border-brand-gold/20 p-8 rounded-2xl shadow-xl">
                <h3 className="text-xl font-display text-brand-gold mb-6 uppercase tracking-widest">Add New Dish</h3>
                <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <input type="text" placeholder="Dish Name" className="bg-black/30 border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-brand-gold" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} required />
                  <input type="text" placeholder="Price (e.g. ₹150)" className="bg-black/30 border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-brand-gold" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} required />
                  <select className="bg-black/30 border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-brand-gold" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} required>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <textarea placeholder="Description" className="md:col-span-2 bg-black/30 border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-brand-gold h-20" value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} />
                  <input type="text" placeholder="Image URL (Drive link)" className="bg-black/30 border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-brand-gold" value={menuForm.image} onChange={e => setMenuForm({...menuForm, image: e.target.value})} />
                  <button type="submit" className="md:col-span-3 py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2"><Plus size={18} /> Add Item to Menu</button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => (
                  <div key={item.id} className="bg-brand-dark/30 border border-gray-800 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      {item.image ? <img src={getOptimizedImageURL(item.image)} className="w-12 h-12 rounded object-cover" /> : <Utensils className="text-gray-700" />}
                      <div>
                        <h4 className="text-white font-bold">{item.name}</h4>
                        <p className="text-[10px] text-brand-gold uppercase">{item.category} • {item.price}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteItem('menu', item.id)} className="p-2 text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'festivals' && (
            <div className="space-y-12">
               <div className="bg-brand-dark/40 border border-brand-gold/20 p-8 rounded-2xl shadow-xl text-center py-20">
                 <Calendar className="mx-auto text-brand-gold mb-6" size={48} />
                 <h3 className="text-2xl font-display text-white mb-2">Festivals Management</h3>
                 <p className="text-gray-500 max-w-md mx-auto mb-8">This module allows you to highlight limited-time seasonal offerings.</p>
                 <button className="px-10 py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-all">Create New Festival Event</button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {festivals.map(fest => (
                    <div key={fest.id} className="bg-brand-dark/30 border border-gray-800 p-6 rounded-2xl flex flex-col items-center text-center">
                       <h4 className="text-xl font-bold text-white mb-2">{fest.title}</h4>
                       <p className="text-xs text-gray-500 mb-6">{fest.description}</p>
                       <button onClick={() => deleteItem('festivals', fest.id)} className="p-2 text-red-500/50 hover:text-red-500 transition-colors uppercase text-[10px] font-bold tracking-widest flex items-center gap-2"><Trash2 size={12}/> Remove Festival</button>
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
