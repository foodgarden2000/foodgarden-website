
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  getDocs,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Edit3, Trash2, Image as ImageIcon, Check, X, Search, Filter, 
  ChevronDown, Star, Eye, EyeOff, Loader2, UtensilsCrossed 
} from 'lucide-react';
import { MenuItem, MenuCategory } from '../types';
import { getOptimizedImageURL } from '../constants';

const AdminMenu: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Form States
  const [categoryForm, setCategoryForm] = useState({
    categoryName: '',
    description: '',
    backgroundImageURL: ''
  });

  const [itemForm, setItemForm] = useState({
    itemName: '',
    categoryId: '',
    itemType: 'veg' as MenuItem['itemType'],
    price: '',
    description: '',
    itemImageURL: '',
    recommended: false,
    available: true
  });

  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, "menuCategories"), orderBy("categoryName")), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuCategory)));
    });

    const unsubItems = onSnapshot(query(collection(db, "menuItems"), orderBy("itemName")), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
      setLoading(false);
    });

    return () => { unsubCats(); unsubItems(); };
  }, []);

  // --- Category Actions ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateDoc(doc(db, "menuCategories", editingCategory.id!), {
          ...categoryForm,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "menuCategories"), {
          ...categoryForm,
          createdAt: serverTimestamp()
        });
      }
      closeCategoryModal();
    } catch (err) { alert("Error saving category"); }
  };

  const handleDeleteCategory = async (cat: MenuCategory) => {
    if (!window.confirm(`Delete "${cat.categoryName}"? All items in this category will move to "Uncategorized".`)) return;
    
    try {
      const batch = writeBatch(db);
      
      // Find "Uncategorized" category or create it
      let uncategorizedId = categories.find(c => c.categoryName === 'Uncategorized')?.id;
      if (!uncategorizedId) {
        const newCatRef = await addDoc(collection(db, "menuCategories"), {
          categoryName: 'Uncategorized',
          description: 'Items without a category',
          backgroundImageURL: '',
          createdAt: serverTimestamp()
        });
        uncategorizedId = newCatRef.id;
      }

      // Move items
      const itemsToMove = items.filter(i => i.categoryId === cat.id);
      itemsToMove.forEach(item => {
        batch.update(doc(db, "menuItems", item.id!), { categoryId: uncategorizedId });
      });

      // Delete category
      batch.delete(doc(db, "menuCategories", cat.id!));
      await batch.commit();
    } catch (err) { alert("Error deleting category"); }
  };

  // --- Item Actions ---
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.categoryId) return alert("Please select a category");
    
    try {
      const data = { ...itemForm, updatedAt: serverTimestamp() };
      if (editingItem) {
        await updateDoc(doc(db, "menuItems", editingItem.id!), data);
      } else {
        await addDoc(collection(db, "menuItems"), { ...data, createdAt: serverTimestamp() });
      }
      closeItemModal();
    } catch (err) { alert("Error saving item"); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm("Delete this item permanently?")) {
      await deleteDoc(doc(db, "menuItems", itemId));
    }
  };

  // --- Modal Helpers ---
  const openCategoryModal = (cat?: MenuCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ 
        categoryName: cat.categoryName, 
        description: cat.description, 
        backgroundImageURL: cat.backgroundImageURL 
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ categoryName: '', description: '', backgroundImageURL: '' });
    }
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        itemName: item.itemName,
        categoryId: item.categoryId,
        itemType: item.itemType,
        price: item.price.toString(),
        description: item.description,
        itemImageURL: item.itemImageURL,
        recommended: item.recommended,
        available: item.available
      });
    } else {
      setEditingItem(null);
      setItemForm({
        itemName: '',
        categoryId: categoryFilter !== 'all' ? categoryFilter : (categories[0]?.id || ''),
        itemType: 'veg',
        price: '',
        description: '',
        itemImageURL: '',
        recommended: false,
        available: true
      });
    }
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  // --- Filtering ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'all' || item.categoryId === categoryFilter;
      const matchesType = typeFilter === 'all' || item.itemType === typeFilter;
      const matchesAvail = availabilityFilter === 'all' || 
                          (availabilityFilter === 'available' && item.available) || 
                          (availabilityFilter === 'unavailable' && !item.available);
      return matchesSearch && matchesCat && matchesType && matchesAvail;
    });
  }, [items, searchTerm, categoryFilter, typeFilter, availabilityFilter]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand-gold" size={48} />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing Menu Data...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* SECTION: CATEGORY MANAGEMENT */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest">Global Categories</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manage grouping for your culinary offerings</p>
          </div>
          <button 
            onClick={() => openCategoryModal()}
            className="flex items-center gap-2 px-6 py-2 bg-brand-gold text-brand-black rounded font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
          >
            <Plus size={14} /> New Category
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="group relative bg-brand-dark/40 border border-white/5 rounded-2xl overflow-hidden hover:border-brand-gold/50 transition-all">
              <div className="h-24 relative">
                <img 
                  src={getOptimizedImageURL(cat.backgroundImageURL)} 
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" 
                  alt=""
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300x100?text=No+Header')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent"></div>
              </div>
              <div className="p-4 -mt-8 relative z-10">
                <h4 className="text-white font-bold text-lg">{cat.categoryName}</h4>
                <p className="text-[10px] text-gray-500 line-clamp-1 mt-1">{cat.description || 'No description provided'}</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openCategoryModal(cat)} className="p-2 bg-black/40 text-gray-400 hover:text-brand-gold rounded-lg transition-colors"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteCategory(cat)} className="p-2 bg-black/40 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: ITEM MANAGEMENT */}
      <section>
        <div className="bg-brand-dark/40 border border-brand-gold/10 p-6 rounded-3xl shadow-xl mb-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest">Menu Item Catalog</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Fine-tune individual dishes and pricing</p>
            </div>
            <button 
              onClick={() => openItemModal()}
              className="flex items-center gap-2 px-8 py-3 bg-brand-gold text-brand-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-xl"
            >
              <Plus size={16} /> Add New Dish
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search itemName..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:border-brand-gold outline-none"
              />
            </div>
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-brand-gold"
            >
              <option value="all">ALL CATEGORIES</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName.toUpperCase()}</option>)}
            </select>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-brand-gold"
            >
              <option value="all">ALL TYPES</option>
              <option value="veg">VEG</option>
              <option value="non-veg">NON-VEG</option>
              <option value="snacks">SNACKS</option>
              <option value="drinks">DRINKS</option>
            </select>
            <select 
              value={availabilityFilter} 
              onChange={e => setAvailabilityFilter(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-brand-gold"
            >
              <option value="all">AVAILABILITY</option>
              <option value="available">IN STOCK</option>
              <option value="unavailable">OUT OF STOCK</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className={`bg-brand-dark/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col group transition-all ${!item.available ? 'grayscale opacity-60' : 'hover:border-brand-gold/30'}`}>
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={getOptimizedImageURL(item.itemImageURL)} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={item.itemName} 
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Dish+Image')}
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg ${item.itemType === 'veg' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {item.itemType}
                  </span>
                  {item.recommended && (
                    <span className="bg-brand-gold text-brand-black px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg">
                      <Star size={10} fill="currentColor" /> Chef Pick
                    </span>
                  )}
                </div>
                {!item.available && (
                  <div className="absolute inset-0 bg-brand-black/60 flex items-center justify-center">
                    <span className="bg-white/10 backdrop-blur-md text-white px-4 py-1 rounded border border-white/20 font-bold uppercase text-[10px] tracking-[0.2em]">Unavailable</span>
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-bold text-lg leading-tight">{item.itemName}</h4>
                  <span className="text-brand-gold font-bold text-lg">₹{item.price}</span>
                </div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-3">
                  {categories.find(c => c.id === item.categoryId)?.categoryName || 'Uncategorized'}
                </p>
                <p className="text-gray-400 text-xs line-clamp-2 flex-1 mb-6 leading-relaxed italic">"{item.description}"</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                   <div className="flex gap-2">
                      <button onClick={() => openItemModal(item)} className="p-2 text-gray-500 hover:text-brand-gold transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => handleDeleteItem(item.id!)} className="p-2 text-gray-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                   </div>
                   <button 
                    onClick={() => updateDoc(doc(db, "menuItems", item.id!), { available: !item.available })}
                    className={`p-2 rounded-lg transition-all ${item.available ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 bg-white/5'}`}
                   >
                     {item.available ? <Eye size={18} /> : <EyeOff size={18} />}
                   </button>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center gap-4">
              <UtensilsCrossed size={48} className="text-gray-800" />
              <p className="text-gray-600 font-bold uppercase tracking-widest text-xs italic">No dishes found in this selection.</p>
            </div>
          )}
        </div>
      </section>

      {/* MODAL: CATEGORY FORM */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
               <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">
                 {editingCategory ? 'Update Category' : 'Create Category'}
               </h3>
               <button onClick={closeCategoryModal} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Category Name</label>
                <input 
                  required 
                  value={categoryForm.categoryName} 
                  onChange={e => setCategoryForm({...categoryForm, categoryName: e.target.value})} 
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" 
                  placeholder="e.g., North Indian Main Course" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Banner Image (Drive URL)</label>
                <input 
                  value={categoryForm.backgroundImageURL} 
                  onChange={e => setCategoryForm({...categoryForm, backgroundImageURL: e.target.value})} 
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" 
                  placeholder="Direct image link" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Short Description</label>
                <textarea 
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none h-24 resize-none" 
                  placeholder="Describe this category..." 
                />
              </div>
              <button type="submit" className="w-full py-4 bg-brand-gold text-brand-black rounded-xl font-bold uppercase tracking-widest hover:bg-white shadow-xl transform active:scale-95 transition-all">
                {editingCategory ? 'Confirm Update' : 'Initialize Category'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ITEM FORM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in-up overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
               <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">
                 {editingItem ? 'Refine Dish' : 'New Culinary Addition'}
               </h3>
               <button onClick={closeItemModal} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Dish Name</label>
                  <input 
                    required 
                    value={itemForm.itemName} 
                    onChange={e => setItemForm({...itemForm, itemName: e.target.value})} 
                    className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" 
                    placeholder="Paneer Lababdar" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Price (₹)</label>
                  <input 
                    required 
                    type="number"
                    value={itemForm.price} 
                    onChange={e => setItemForm({...itemForm, price: e.target.value})} 
                    className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" 
                    placeholder="240" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Primary Category</label>
                  <select 
                    required 
                    value={itemForm.categoryId} 
                    onChange={e => setItemForm({...itemForm, categoryId: e.target.value})} 
                    className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none"
                  >
                     <option value="">Select Category</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Dish Type</label>
                  <select 
                    required 
                    value={itemForm.itemType} 
                    onChange={e => setItemForm({...itemForm, itemType: e.target.value as any})} 
                    className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none"
                  >
                     <option value="veg">VEGETARIAN</option>
                     <option value="non-veg">NON-VEGETARIAN</option>
                     <option value="snacks">SNACKS</option>
                     <option value="drinks">DRINKS</option>
                     <option value="dessert">DESSERT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Dish Description</label>
                <textarea 
                  required 
                  value={itemForm.description} 
                  onChange={e => setItemForm({...itemForm, description: e.target.value})} 
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none h-24 resize-none" 
                  placeholder="Tender paneer cubes in rich tomato gravy..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Dish Image (Drive URL)</label>
                <input 
                  value={itemForm.itemImageURL} 
                  onChange={e => setItemForm({...itemForm, itemImageURL: e.target.value})} 
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" 
                  placeholder="Paste drive link here" 
                />
              </div>

              <div className="flex flex-wrap gap-6 items-center p-4 bg-black/20 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={itemForm.recommended} 
                    onChange={e => setItemForm({...itemForm, recommended: e.target.checked})} 
                    className="w-4 h-4 accent-brand-gold" 
                  />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 group-hover:text-brand-gold transition-colors">Chef Recommended</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={itemForm.available} 
                    onChange={e => setItemForm({...itemForm, available: e.target.checked})} 
                    className="w-4 h-4 accent-brand-gold" 
                  />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 group-hover:text-emerald-500 transition-colors">In Stock / Available</span>
                </label>
              </div>

              <button type="submit" className="w-full py-5 bg-brand-gold text-brand-black rounded-xl font-bold uppercase tracking-widest hover:bg-white shadow-xl transform active:scale-95 transition-all">
                {editingItem ? 'Commit Changes' : 'Publish Dish to Menu'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
