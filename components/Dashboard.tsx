
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase';
import Auth from './Auth';
import { 
  User, ShoppingBag, Clock, ShieldCheck, Zap, Ban, Package, Tag, Coins, Loader2, Gift, Share2, Copy, CheckCircle2, Users
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  updateDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { UserProfile, Order, OrderStatus } from '../types';

interface DashboardProps {
  user: FirebaseUser | null;
  points: number;
  onBack: () => void;
  adminMode?: boolean;
  adminOnlyRequest?: boolean;
  referralCodeFromUrl?: string | null;
}

type DashboardTab = 'profile' | 'orders' | 'wallet';

const Dashboard: React.FC<DashboardProps> = ({ user, points, adminOnlyRequest, referralCodeFromUrl }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

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
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setProfile(sanitizeData(docSnap.data()) as UserProfile);
      setLoadingProfile(false);
    });

    const qOrders = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as Order));
      fetchedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setMyOrders(fetchedOrders);
    });

    return () => { unsubProfile(); unsubOrders(); };
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: 'cancelled_by_user',
        rejectReason: 'Cancelled by customer',
        cancelledBy: 'user',
        updatedAt: new Date().toISOString()
      });
      alert("Order cancelled.");
    } catch (err) {
      alert("Failed to cancel.");
    }
  };

  const getReferralLink = () => {
    if (!profile?.referralCode) return '';
    // Ensure trailing slash before query param to prevent 404s on SPA hosts
    const origin = window.location.origin.endsWith('/') ? window.location.origin : `${window.location.origin}/`;
    return `${origin}?ref=${profile.referralCode}`;
  };

  const copyReferral = () => {
    const link = getReferralLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = () => {
    const link = getReferralLink();
    if (!link) return;
    const text = `Join me at Chef's Jalsa! Register using my code and we both get special rewards: ${link}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Chef's Jalsa Referral",
        text: text,
        url: link
      }).catch(() => copyReferral());
    } else {
      copyReferral();
    }
  };

  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { label: 'Pending Approval', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'accepted': return { label: 'Order Confirmed', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      case 'preparing': return { label: 'Preparing...', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
      case 'ready': return { label: 'Ready for Delivery', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
      case 'out_for_delivery': return { label: 'Out for Delivery', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
      case 'delivered': return { label: 'Delivered', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      default: return { label: (status || '').replace(/_/g, ' ').toUpperCase(), color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    }
  };

  if (!user) {
    return <Auth adminOnly={adminOnlyRequest} externalReferralCode={referralCodeFromUrl} />;
  }

  if (loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-gold" size={48} /></div>;
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-cream relative overflow-hidden font-sans text-brand-black">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brand-dark rounded-full flex items-center justify-center text-brand-gold border-2 border-brand-gold shadow-xl">
              <User size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-brand-black">{profile?.name || 'Member'}</h2>
                {profile?.role === 'subscriber' && (
                  <span className="bg-brand-red text-white px-3 py-1 rounded text-[8px] font-bold uppercase flex items-center gap-1">
                    <ShieldCheck size={10} fill="currentColor" /> Premium Subscriber
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs font-sans">{user.email}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('profile')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'profile' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}>Profile</button>
            <button onClick={() => setActiveTab('wallet')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'wallet' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}>My Wallet</button>
            <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'orders' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}>My Orders</button>
            <button onClick={() => signOut(auth)} className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-brand-red">Logout</button>
          </div>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            {myOrders.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                <ShoppingBag size={48} className="text-gray-100 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-gray-500 italic">No orders yet.</h3>
              </div>
            ) : (
              myOrders.map(order => {
                const statusInfo = getStatusDisplay(order.status);
                const canCancel = ['pending', 'accepted'].includes(order.status);

                return (
                  <div key={order.id} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex gap-6 items-start">
                        <div className={`p-4 rounded-2xl border ${statusInfo.color}`}>
                          <Package size={28} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h4 className="font-bold text-2xl text-brand-black">{order.itemName}</h4>
                            <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                             <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider"><Clock size={14} className="text-brand-gold" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                             <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider"><Tag size={14} className="text-brand-gold" /> {(order.orderType || '').replace(/_/g, ' ')}</span>
                          </div>
                          {order.rejectReason && (
                            <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                              <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Update from Kitchen</p>
                              <p className="text-sm text-rose-800 italic">"{order.rejectReason}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Order Total</p>
                          <p className="text-3xl font-display font-bold text-brand-black">₹{order.orderAmount || 0}</p>
                        </div>
                        {canCancel && (
                          <button 
                            onClick={() => handleCancelOrder(order.id!)}
                            className="flex items-center gap-2 px-6 py-3 border border-rose-200 text-rose-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                            <Ban size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-12 animate-fade-in max-w-4xl mx-auto">
             <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-gray-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                   <div className="text-center md:text-left">
                      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Current Balance</h3>
                      <div className="flex items-center justify-center md:justify-start gap-4">
                        <Coins className="text-brand-gold" size={48} />
                        <span className="text-6xl font-display font-bold text-brand-black">{profile?.points || 0}</span>
                        <span className="text-brand-gold font-bold uppercase text-xs tracking-widest self-end pb-2">Points</span>
                      </div>
                   </div>
                   <div className="bg-brand-dark p-6 rounded-2xl border-2 border-brand-gold/30 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-brand-gold mb-1">
                        <Users size={20} />
                        <span className="text-2xl font-bold">{profile?.totalReferrals || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Successful Referrals</p>
                   </div>
                </div>

                <div className="bg-brand-cream/50 p-8 rounded-3xl border border-brand-gold/10">
                   <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold mb-4">
                        <Gift size={24} />
                      </div>
                      <h4 className="text-brand-black font-bold uppercase tracking-widest text-sm mb-2">My Exclusive Referral Code</h4>
                      <p className="text-gray-500 text-xs mb-8">Invite your friends and earn points on their signup and 1st order!</p>
                      
                      <div className="flex items-center gap-4 w-full max-w-sm">
                         <div className="flex-1 bg-white border-2 border-dashed border-brand-gold/30 p-4 rounded-xl text-center font-display font-bold text-2xl tracking-widest text-brand-black">
                            {profile?.referralCode || '----'}
                         </div>
                         <button 
                          onClick={copyReferral}
                          className="p-4 bg-brand-dark text-white rounded-xl hover:bg-brand-gold hover:text-brand-black transition-all shadow-lg active:scale-95"
                          title="Copy Link"
                         >
                            {copySuccess ? <CheckCircle2 className="text-emerald-400" /> : <Copy />}
                         </button>
                      </div>

                      <button 
                        onClick={handleShare}
                        className="mt-8 flex items-center gap-3 px-10 py-4 bg-brand-gold text-brand-black font-bold uppercase tracking-widest text-xs rounded-xl shadow-xl hover:bg-brand-black hover:text-white transition-all transform hover:-translate-y-1"
                      >
                         <Share2 size={16} /> Share My Link
                      </button>
                   </div>
                </div>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="p-6 bg-white border border-gray-100 rounded-2xl flex items-start gap-4 shadow-sm">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 font-bold">50</div>
                      <p className="text-xs text-gray-600 leading-relaxed"><span className="font-bold text-brand-black block uppercase tracking-tighter">Signup Bonus</span> Inviter gets 50 points when a friend joins using their code.</p>
                   </div>
                   <div className="p-6 bg-white border border-gray-100 rounded-2xl flex items-start gap-4 shadow-sm">
                      <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0 font-bold">30</div>
                      <p className="text-xs text-gray-600 leading-relaxed"><span className="font-bold text-brand-black block uppercase tracking-tighter">Loyalty Reward</span> Both get 30 points when the referred friend completes their 1st order.</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                 <h3 className="text-xl font-serif font-bold text-brand-black mb-6">Loyalty Status</h3>
                 <div className="bg-brand-dark p-8 rounded-2xl flex items-center justify-between border-2 border-brand-gold shadow-lg">
                    <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold"><Zap size={32} /></div>
                    <div className="text-right">
                       <p className="text-4xl font-display font-bold text-brand-gold capitalize">{profile?.role || 'Guest'}</p>
                       <p className="text-gray-400 text-[10px] uppercase tracking-widest">Membership Tier</p>
                    </div>
                 </div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                 <h3 className="text-xl font-serif font-bold text-brand-black mb-6">Account Details</h3>
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Name</p>
                       <p className="font-bold text-brand-black">{profile?.name}</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Referral Code</p>
                       <p className="font-bold text-brand-gold font-display tracking-widest">{profile?.referralCode}</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Member Since</p>
                       <p className="font-bold text-brand-black">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '2024'}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
