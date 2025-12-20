
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
  Info, Tag, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut, List
} from 'lucide-react';
import { MenuItem, FestivalSpecial, CategoryConfig, Order } from '../types';
import { getOptimizedImageURL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'festivals' | 'orders'>('menu');
  const [menuItems, setMenuItems] = useState<(MenuItem & { id: string })[]>([]);
  const [festivals, setFestivals] = useState<(FestivalSpecial & { id: string })[]>([]);
  const [categories, setCategories] = useState<(CategoryConfig & { id: string })[]>([]);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAddingNewCategoryInline, setIsAddingNewCategoryInline] = useState(false);
  
  // Form States
  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({
    name: '', category: '', price: '', description: '', image: ''
  });
  const [festivalForm, setFestivalForm] = useState<Partial<FestivalSpecial>>({
    title: '', subtitle: '', description: '', image: '', price: '', items: []
  });
  const [festivalItemsText, setFestivalItemsText] = useState(''); // Temp state for textarea
  const [categoryForm, setCategoryForm] = useState<Partial<CategoryConfig>>({
    name: '', image: ''
  });

  useEffect(() => {
    const unsubMenu = onSnapshot(query(collection(db, "menu"), orderBy("category")), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const unsubFest = onSnapshot(query(collection(db, "festivals"), orderBy("title")), (snapshot) => {
      setFestivals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const unsubCats = onSnapshot(query(collection(db, "categories"), orderBy("name")), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    return () => { unsubMenu(); unsubFest(); unsubCats(); unsubOrders(); };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'delivered' | 'cancelled') => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const order = orderSnap.data() as Order;

      // Update Order Status
      await updateDoc(orderRef, {
        status: newStatus,
        deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null
      });

      // Credit Points if Status is Delivered and not already credited
      if (newStatus === 'delivered' && order.userId && !order.pointsCredited) {
        const userRef = doc(db, "users", order.userId);
        await updateDoc(userRef, {
          points: increment(order.pointsEarned)
        });
        await updateDoc(orderRef, {
          pointsCredited: true
        });
      }

      alert(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert("Error updating order status.");
    }
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateDoc(doc(db, "menu", isEditing), menuForm);
      } else {
        await addDoc(collection(db, "menu"), menuForm);
      }
      resetForms();
    } catch (err) { alert("Error saving menu item"); }
  };

  const handleSaveFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItems = festivalItemsText.split('\n').map(i => i.trim()).filter(i => i !== '');
    const payload = { ...festivalForm, items: finalItems };
    
    try {
      if (isEditing) {
        await updateDoc(doc(db, "festivals", isEditing), payload);
      } else {
        await addDoc(collection(db, "festivals"), payload);
      }
      resetForms();
    } catch (err) { alert("Error saving festival"); }
  };

  const handleSaveCategoryInline = async () => {
    if (!categoryForm.name || !categoryForm.image) {
      alert("Please provide both Category Name and Background Image URL");
      return;
    }
    try {
      await addDoc(collection(db, "categories"), categoryForm);
      setMenuForm(prev => ({ ...prev, category: categoryForm.name }));
      setIsAddingNewCategoryInline(false);
      setCategoryForm({ name: '', image: '' });
      alert("New Category created and selected!");
    } catch (err) { 
      alert("Error saving category"); 
    }
  };

  const resetForms = () => {
    setIsEditing(null);
    setMenuForm({ name: '', category: '', price: '', description: '', image: '' });
    setFestivalForm({ title: '', subtitle: '', description: '', image: '', price: '', items: [] });
    setFestivalItemsText('');
    setCategoryForm({ name: '', image: '' });
    setIsAddingNewCategoryInline(false);
  };

  const deleteItem = async (col: string, id: string) => {
    if (window.confirm("Are you sure you want to delete this?")) {
      await deleteDoc(doc(db, col, id));
    }
  };

  const startEditFestival = (fest: FestivalSpecial & { id: string }) => {
    setIsEditing(fest.id);
    setFestivalForm(fest);
    setFestivalItemsText(fest.items?.join('\n') || '');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20">
             <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-gold tracking-widest uppercase">Admin Control</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Chef's Jalsa Central Hub</p>
          </div>
        </div>
        <div className="flex bg-brand-dark p-1 rounded-lg border border-brand-gold/10 overflow-x-auto max-w-full">
          {[
            { id: 'menu', label: 'Items', icon: Utensils },
            { id: 'festivals', label: 'Festivals', icon: Calendar },
            { id: 'orders', label: 'Orders', icon: ShoppingBag }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); resetForms(); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-gold text-brand-black' : 'text-gray-400 hover:text-white'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest text-brand-red hover:bg-brand-red hover:text-white transition-all whitespace-nowrap ml-2 border-l border-brand-gold/10"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          
          {/* Form Section - Not visible for Orders tab */}
          {activeTab !== 'orders' && (
            <div className="lg:col-span-4">
              <div className="bg-brand-dark border border-brand-gold/30 p-6 md:p-8 rounded-2xl sticky top-8 shadow-2xl">
                <h3 className="text-xl font-serif text-white mb-6 flex items-center gap-3">
                  {activeTab === 'menu' && <Utensils className="text-brand-gold" />}
                  {activeTab === 'festivals' && <Calendar className="text-brand-gold" />}
                  {isEditing ? 'Update Entry' : 'Add New Entry'}
                </h3>

                {activeTab === 'menu' && (
                  <form onSubmit={handleSaveMenu} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Item Name</label>
                      <input value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" required />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Category</label>
                            <select value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none cursor-pointer" required>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <button type="button" onClick={() => setIsAddingNewCategoryInline(!isAddingNewCategoryInline)} className={`p-3 rounded-lg border transition-colors ${isAddingNewCategoryInline ? 'bg-brand-gold text-brand-black border-brand-gold' : 'border-gray-700 text-brand-gold'}`}>
                          <Plus size={20} />
                        </button>
                    </div>
                    {isAddingNewCategoryInline && (
                      <div className="p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-xl space-y-3 animate-fade-in-up">
                          <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-1">Create New Category</p>
                          <input 
                            placeholder="Category Name (e.g. Snacks)" 
                            className="w-full bg-black/60 border border-gray-800 rounded-lg p-2 text-sm text-white" 
                            value={categoryForm.name} 
                            onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
                          />
                          <input 
                            placeholder="Background Image URL" 
                            className="w-full bg-black/60 border border-gray-800 rounded-lg p-2 text-sm text-white" 
                            value={categoryForm.image} 
                            onChange={e => setCategoryForm({...categoryForm, image: e.target.value})} 
                          />
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={handleSaveCategoryInline} 
                              className="flex-1 bg-brand-gold text-brand-black text-xs font-bold py-2 rounded hover:bg-white transition-colors"
                            >
                              Create & Select
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setIsAddingNewCategoryInline(false)} 
                              className="px-3 bg-gray-800 text-white text-xs font-bold py-2 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Price</label>
                      <input value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" placeholder="₹" required />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Description</label>
                      <textarea value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none h-24 resize-none transition-all" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Item Image URL</label>
                      <input value={menuForm.image} onChange={e => setMenuForm({...menuForm, image: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" placeholder="Paste link here" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg active:scale-95">
                      <Save size={18} /> {isEditing ? 'Update Item' : 'Add to Menu'}
                    </button>
                  </form>
                )}

                {activeTab === 'festivals' && (
                  <form onSubmit={handleSaveFestival} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Festival Title</label>
                      <input value={festivalForm.title} onChange={e => setFestivalForm({...festivalForm, title: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" required />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Subtitle</label>
                      <input value={festivalForm.subtitle} onChange={e => setFestivalForm({...festivalForm, subtitle: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" placeholder="e.g. A Harvest Feast" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Festival Price</label>
                      <input value={festivalForm.price} onChange={e => setFestivalForm({...festivalForm, price: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" placeholder="₹ (Optional)" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Description</label>
                      <textarea value={festivalForm.description} onChange={e => setFestivalForm({...festivalForm, description: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none h-20 resize-none transition-all" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Special Menu Items (One per line)</label>
                      <textarea value={festivalItemsText} onChange={e => setFestivalItemsText(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none h-24 resize-none transition-all" placeholder="Item 1&#10;Item 2..." />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Festival Banner Image URL</label>
                      <input value={festivalForm.image} onChange={e => setFestivalForm({...festivalForm, image: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-gold outline-none transition-all" placeholder="Banner link" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg active:scale-95">
                      <Save size={18} /> {isEditing ? 'Update Festival' : 'Add Festival'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* List Section */}
          <div className={`${activeTab === 'orders' ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
            <div className="space-y-4">
              {activeTab === 'orders' ? (
                orders.map((order, idx) => (
                  <div key={order.id} className="bg-brand-dark/50 backdrop-blur border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 group hover:border-brand-gold/50 transition-all">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                         <h4 className="font-bold text-white text-lg flex items-center gap-2">
                           <ShoppingBag size={18} className="text-brand-gold" />
                           {order.itemName} x {order.quantity}
                         </h4>
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                           order.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 
                           order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' : 
                           'bg-yellow-500/20 text-yellow-500'
                         }`}>
                           {order.status}
                         </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                         <div className="text-gray-400">
                           <p className="font-bold text-white">Customer Detail:</p>
                           <p>{order.userName} ({order.userPhone})</p>
                           <p className="line-clamp-1">{order.address}</p>
                         </div>
                         <div className="text-gray-400">
                           <p className="font-bold text-white">Payment & Points:</p>
                           <p>Amount: ₹{order.orderAmount}</p>
                           <p className="text-brand-gold">Points: {order.pointsEarned} {order.userId ? '(Member)' : '(Guest)'}</p>
                         </div>
                      </div>
                      <div className="text-[10px] text-gray-600 flex items-center gap-1 pt-2">
                        <Clock size={10} /> Ordered on {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id!, 'delivered')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all text-xs font-bold uppercase"
                          >
                            <CheckCircle2 size={16} /> Mark Delivered
                          </button>
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id!, 'cancelled')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase"
                          >
                            <XCircle size={16} /> Cancel Order
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteItem('orders', order.id!)} className="p-3 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              ) : activeTab === 'menu' ? (
                menuItems.map(item => (
                  <div key={item.id} className="bg-brand-dark/50 p-6 rounded-2xl flex items-center gap-6 group hover:border-brand-gold/50 border border-gray-800 transition-all">
                     <div className="w-20 h-20 bg-black rounded-xl overflow-hidden shrink-0 border border-gray-700">
                        {item.image ? <img src={getOptimizedImageURL(item.image)} className="w-full h-full object-cover" /> : <Utensils className="w-full h-full p-6 text-gray-700" />}
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                           <h4 className="font-bold text-white text-lg">{item.name}</h4>
                           <span className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[10px] font-bold uppercase rounded border border-brand-gold/20">{item.category}</span>
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-1 italic">{item.description}</p>
                        <div className="text-brand-gold font-bold mt-1 text-lg">{item.price}</div>
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setIsEditing(item.id); setMenuForm(item); }} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => deleteItem('menu', item.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                     </div>
                  </div>
                ))
              ) : (
                festivals.map(fest => (
                  <div key={fest.id} className="bg-brand-dark/50 p-6 rounded-2xl flex items-center gap-6 group hover:border-brand-gold/50 border border-gray-800 transition-all">
                     <div className="w-20 h-20 bg-black rounded-xl overflow-hidden shrink-0 border border-gray-700">
                        {fest.image ? <img src={getOptimizedImageURL(fest.image)} className="w-full h-full object-cover" /> : <Calendar className="w-full h-full p-6 text-gray-700" />}
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                           <h4 className="font-bold text-white text-lg">{fest.title}</h4>
                           <span className="text-brand-gold font-bold text-sm">{fest.price || 'Special Event'}</span>
                        </div>
                        <p className="text-gray-400 text-xs italic mb-2">{fest.subtitle}</p>
                        <div className="flex flex-wrap gap-1">
                          {fest.items?.slice(0, 3).map((it, i) => (
                            <span key={i} className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase">{it}</span>
                          ))}
                          {fest.items?.length > 3 && <span className="text-[9px] text-gray-600">+{fest.items.length - 3} more</span>}
                        </div>
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditFestival(fest)} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => deleteItem('festivals', fest.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                     </div>
                  </div>
                ))
              )}

              {((activeTab === 'menu' && menuItems.length === 0) || 
                (activeTab === 'orders' && orders.length === 0) ||
                (activeTab === 'festivals' && festivals.length === 0)) && (
                <div className="text-center py-24 bg-brand-dark/20 rounded-3xl border-2 border-dashed border-gray-800">
                  <div className="w-20 h-20 bg-brand-dark rounded-full flex items-center justify-center mx-auto mb-6 text-gray-700">
                    <Info size={40} />
                  </div>
                  <h3 className="text-2xl text-gray-400 font-serif mb-2">No data in this section</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-black border-t border-gray-900 text-center">
         <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">Authorized Staff Access Only • Chef's Jalsa v3.1</p>
      </div>
    </div>
  );
};

// Internal ShieldAlert component for header icon
const ShieldAlert = ({ size }: { size: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

export default AdminDashboard;
