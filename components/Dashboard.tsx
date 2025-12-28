
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase';
import Auth from './Auth';
import { 
  User, ShoppingBag, Clock, ShieldCheck, Zap, Ban, Package, Tag, Coins, Loader2, Gift, Share2, Copy, CheckCircle2, Users, ArrowUpRight, ArrowDownLeft
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
                {/* Removed Premium Subscriber badge */}
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
                            {order.paymentMode === 'points' && (
                              <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20 flex items-center gap-1">
                                <Coins size={10} /> POINT ORDER
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                             <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider"><Clock size={14} className="text-brand-gold" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                             <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider"><Tag size={14} className="text-brand-gold" /> {(order.orderType || '').replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                            {order.paymentMode === 'points' ? 'POINTS SPENT' : 'ORDER TOTAL'}
                          </p>
                          <p className="text-3xl font-display font-bold text-brand-black">
                            {order.paymentMode === 'points' ? `${Math.floor(order.pointsUsed)} Pts` : `₹${order.orderAmount || 0}`}
                          </p>
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
                      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Available Points</h3>
                      <div className="flex items-center justify-center md:justify-start gap-4">
                        <Coins className="text-brand-gold" size={48} />
                        <span className="text-6xl font-display font-bold text-brand-black">{Math.floor(profile?.points || 0)}</span>
                      </div>
                   </div>
                   <div className="bg-brand-dark p-6 rounded-2xl border-2 border-brand-gold/30 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-brand-gold mb-1">
                        <Users size={20} />
                        <span className="text-2xl font-bold">{profile?.totalReferrals || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Referrals Joined</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h4 className="text-brand-black font-bold uppercase tracking-widest text-xs border-b border-gray-100 pb-2">Loyalty Rules</h4>
                    <div className="space-y-4">
                       <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><Zap size={16}/></div>
                          <p className="text-xs text-gray-500">Every cash/UPI order earns you <span className="text-brand-black font-bold">10% Points back</span> after delivery.</p>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0"><Coins size={16}/></div>
                          <p className="text-xs text-gray-500">Redeem points easily: <span className="text-brand-black font-bold">1 Point = ₹1 value</span> in your menu orders.</p>
                       </div>
                    </div>

                    <div className="bg-brand-cream/50 p-6 rounded-2xl border border-brand-gold/10 text-center mt-8">
                      <p className="text-[10px] font-bold uppercase text-gray-500 mb-4 tracking-widest">Share & Earn Bonus</p>
                      <div className="bg-white border-2 border-dashed border-brand-gold/30 p-3 rounded-xl font-display font-bold text-xl tracking-widest text-brand-black mb-4">
                        {profile?.referralCode || '----'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={copyReferral} className="flex-1 py-3 bg-brand-dark text-white rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                          {copySuccess ? <CheckCircle2 size={14}/> : <Copy size={14}/>} {copySuccess ? 'Copied' : 'Copy'}
                        </button>
                        <button onClick={handleShare} className="flex-1 py-3 bg-brand-gold text-brand-black rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                          <Share2 size={14}/> Share
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-brand-black font-bold uppercase tracking-widest text-xs border-b border-gray-100 pb-2">Recent Transactions</h4>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {profile?.pointsHistory && profile.pointsHistory.length > 0 ? (
                         profile.pointsHistory.map((tx, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-brand-gold/20 transition-all">
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'earned' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                  {tx.type === 'earned' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-brand-black tracking-tighter capitalize">{tx.via} {tx.type}</p>
                                  <p className="text-[8px] text-gray-400 uppercase font-medium">{new Date(tx.date).toLocaleDateString()}</p>
                                </div>
                             </div>
                             <span className={`text-sm font-bold ${tx.type === 'earned' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {tx.type === 'earned' ? '+' : '-'}{Math.floor(tx.amount)}
                             </span>
                           </div>
                         ))
                       ) : (
                         <div className="text-center py-12 text-gray-400 italic text-xs">No transactions recorded yet. Start ordering to earn points!</div>
                       )}
                    </div>
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
