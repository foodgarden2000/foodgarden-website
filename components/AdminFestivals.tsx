
import React, { useState, useEffect } from 'react';
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
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  Plus, Edit3, Trash2, X, Star, Eye, EyeOff, Loader2, PartyPopper, Calendar, Tag, Image as ImageIcon
} from 'lucide-react';
import { FestivalSpecial } from '../types';
import { getOptimizedImageURL } from '../constants';

const AdminFestivals: React.FC = () => {
  const [specials, setSpecials] = useState<FestivalSpecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<FestivalSpecial | null>(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    itemsString: '',
    image: '',
    price: '',
    available: true,
    color: 'bg-brand-dark'
  });

  useEffect(() => {
    const q = query(collection(db, "festivals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSpecials(snap.docs.map(d => ({ id: d.id, ...d.data() } as FestivalSpecial)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openModal = (special?: FestivalSpecial) => {
    if (special) {
      setEditingSpecial(special);
      setForm({
        title: special.title,
        subtitle: special.subtitle,
        description: special.description,
        itemsString: (special.items || []).join(', '),
        image: special.image,
        price: special.price || '',
        available: special.available,
        color: special.color || 'bg-brand-dark'
      });
    } else {
      setEditingSpecial(null);
      setForm({
        title: '',
        subtitle: '',
        description: '',
        itemsString: '',
        image: '',
        price: '',
        available: true,
        color: 'bg-brand-dark'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSpecial(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title,
      subtitle: form.subtitle,
      description: form.description,
      items: form.itemsString.split(',').map(s => s.trim()).filter(s => s !== ''),
      image: form.image,
      price: form.price,
      available: form.available,
      color: form.color,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingSpecial) {
        await updateDoc(doc(db, "festivals", editingSpecial.id!), data);
      } else {
        await addDoc(collection(db, "festivals"), { ...data, createdAt: serverTimestamp() });
      }
      closeModal();
    } catch (err) {
      alert("Error saving festival menu");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this festival menu permanently?")) {
      await deleteDoc(doc(db, "festivals", id));
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand-gold" size={48} />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs text-white">Syncing Festivals...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest">Seasonal Celebrations</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Curate limited-time festival special menus</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-2 bg-brand-gold text-brand-black rounded font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
        >
          <Plus size={14} /> New Festival Menu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {specials.map(special => (
          <div key={special.id} className={`bg-brand-dark/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col group transition-all ${!special.available ? 'grayscale opacity-60' : 'hover:border-brand-gold/30'}`}>
            <div className="h-48 relative overflow-hidden">
              <img 
                src={getOptimizedImageURL(special.image)} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                alt={special.title} 
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Header')}
              />
              <div className="absolute top-4 left-4 z-20 bg-brand-gold/90 backdrop-blur text-brand-black px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center shadow-lg">
                <Calendar size={10} className="mr-2" /> {special.available ? 'ACTIVE' : 'DISABLED'}
              </div>
              {!special.available && (
                <div className="absolute inset-0 bg-brand-black/60 flex items-center justify-center">
                  <span className="bg-white/10 backdrop-blur-md text-white px-4 py-1 rounded border border-white/20 font-bold uppercase text-[10px] tracking-[0.2em]">Off Air</span>
                </div>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-bold text-lg leading-tight">{special.title}</h4>
                {special.price && <span className="text-brand-gold font-bold text-lg">{special.price}</span>}
              </div>
              <p className="text-brand-gold font-sans text-[10px] uppercase tracking-wider mb-3 italic">{special.subtitle}</p>
              <p className="text-gray-400 text-xs line-clamp-3 mb-6 leading-relaxed italic">"{special.description}"</p>
              
              <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => openModal(special)} className="p-2 text-gray-500 hover:text-brand-gold transition-colors"><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(special.id!)} className="p-2 text-gray-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, "festivals", special.id!), { available: !special.available })}
                  className={`p-2 rounded-lg transition-all ${special.available ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 bg-white/5'}`}
                >
                  {special.available ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          </div>
        ))}
        {specials.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center gap-4">
            <PartyPopper size={48} className="text-gray-800" />
            <p className="text-gray-600 font-bold uppercase tracking-widest text-xs italic">No celebration menus added yet.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-dark border border-brand-gold/30 rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in-up overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
               <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest">
                 {editingSpecial ? 'Update Festival' : 'New Celebration'}
               </h3>
               <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Festival Title</label>
                  <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" placeholder="e.g., Sankranti Platter" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Subtitle</label>
                  <input required value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" placeholder="e.g., Authentic Harvest Feast" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Price / Info</label>
                  <input value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" placeholder="e.g., ₹299 or Limited Offer" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Banner (Drive URL)</label>
                  <input required value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" placeholder="Link to celebration image" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Celebration Description</label>
                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none h-24 resize-none" placeholder="Tell the story of this celebration..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Highlights (Comma Separated)</label>
                <input required value={form.itemsString} onChange={e => setForm({...form, itemsString: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-gold outline-none" placeholder="Til Kut, Dahi Chura, Khichdi..." />
              </div>
              
              <div className="flex items-center gap-6 p-4 bg-black/20 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={form.available} onChange={e => setForm({...form, available: e.target.checked})} className="w-4 h-4 accent-brand-gold" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 group-hover:text-emerald-500 transition-colors">Visible to Public</span>
                </label>
              </div>

              <button type="submit" className="w-full py-5 bg-brand-gold text-brand-black rounded-xl font-bold uppercase tracking-widest hover:bg-white shadow-xl transform active:scale-95 transition-all">
                {editingSpecial ? 'Update Celebration' : 'Publish Celebration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFestivals;
