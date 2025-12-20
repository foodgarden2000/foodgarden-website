
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase';
import Auth from './Auth';
// Added XCircle to the lucide-react imports
import { 
  ArrowLeft, Award, LogOut, User, ShoppingBag, Clock, ShieldAlert, Share2, Copy, Check, Gift, Star, Truck, Coffee, Sofa, ChevronRight, AlertCircle, Loader2, XCircle
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { UserProfile, Order, OrderStatus } from '../types';

interface DashboardProps {
  user: FirebaseUser | null;
  points: number;
  onBack: () => void;
  adminMode?: boolean;
  referralCodeFromUrl?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user, points, onBack, adminMode, referralCodeFromUrl }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [copied, setCopied] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    // 1. Listen to user profile
    const unsubProfile = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (!data.referralCode || data.referralCode.trim() === "") {
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(doc(db, "users", user.uid), { referralCode: newCode });
        } else {
          setProfile(data);
          setLoadingProfile(false);
        }
      } else {
        setLoadingProfile(false);
      }
    }, (error) => {
      console.error("Profile listen error:", error);
      setLoadingProfile(false);
    });

    // 2. Listen to user's orders real-time with better error handling
    // Note: This query requires a composite index in Firestore.
    const qOrders = query(
      collection(db, "orders"), 
      where("userId", "==", user.uid), 
      orderBy("createdAt", "desc")
    );

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setMyOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setOrderError(null);
    }, (error) => {
      console.error("Orders listen error:", error);
      // If index is missing, fallback to unsorted query
      if (error.code === 'failed-precondition') {
        const fallbackQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
        onSnapshot(fallbackQuery, (snapshot) => {
          const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          setMyOrders(fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
      } else {
        setOrderError("Unable to sync live orders. Please refresh.");
      }
    });

    return () => { unsubProfile(); unsubOrders(); };
  }, [user]);

  const copyReferralLink = () => {
    if (!profile?.referralCode) return;
    const url = `${window.location.origin}/?ref=${profile.referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!user) {
    return (
      <div className="pt-24 min-h-screen bg-brand-black flex flex-col items-center">
        <div className="w-full max-w-4xl px-4">
          <button onClick={onBack} className="text-brand-gold flex items-center gap-2 mb-8 hover:underline uppercase text-xs font-bold tracking-widest">
            <ArrowLeft size={16} /> Back to Home
          </button>
          <Auth adminOnly={adminMode} externalReferralCode={referralCodeFromUrl} />
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="h-screen bg-brand-cream flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={48} />
        <p className="text-brand-dark font-display text-sm tracking-widest animate-pulse">Synchronizing Data...</p>
      </div>
    );
  }

  const getStatusInfo = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return { 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
        desc: 'Waiting for restaurant confirmation',
        icon: <Clock size={14} className="animate-pulse" />
      };
      case 'accepted': return { 
        color: 'bg-blue-100 text-blue-700 border-blue-200', 
        desc: 'Chef has accepted your order!',
        icon: <Check size={14} />
      };
      case 'preparing': return { 
        color: 'bg-purple-100 text-purple-700 border-purple-200', 
        desc: 'Our Chef is crafting your meal...',
        icon: <Loader2 size={14} className="animate-spin" />
      };
      case 'out_for_delivery': return { 
        color: 'bg-orange-100 text-orange-700 border-orange-200', 
        desc: 'Order is on its way to you!',
        icon: <Truck size={14} className="animate-bounce" />
      };
      case 'delivered': return { 
        color: 'bg-green-100 text-green-700 border-green-200', 
        desc: 'Order completed. Enjoy your meal!',
        icon: <Award size={14} />
      };
      case 'cancelled': return { 
        color: 'bg-red-100 text-red-700 border-red-200', 
        desc: 'This order was cancelled.',
        icon: <XCircle size={14} />
      };
      default: return { color: 'bg-gray-100 text-gray-700', desc: '', icon: null };
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-cream relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brand-dark rounded-full flex items-center justify-center text-brand-gold border-2 border-brand-gold shadow-xl">
              <User size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-brand-black">{profile?.name || 'Member'}</h2>
                {profile?.role === 'subscriber' && (
                  <span className="bg-brand-gold text-brand-black px-2 py-0.5 rounded text-[8px] font-bold uppercase flex items-center gap-1">
                    <Star size={8} fill="currentColor" /> Subscriber
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs font-sans">{user.email}</p>
            </div>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}
            >
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('orders')} 
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}
            >
              My Orders {myOrders.length > 0 && <span className="bg-brand-gold text-brand-black w-4 h-4 rounded-full flex items-center justify-center text-[8px]">{myOrders.length}</span>}
            </button>
            <button onClick={() => signOut(auth)} className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-brand-red">Logout</button>
          </div>
        </div>

        {activeTab === 'profile' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Points Card */}
            <div className="bg-brand-dark p-8 rounded-2xl border border-brand-gold/30 shadow-2xl flex flex-col items-center text-center group">
              <Award size={48} className="text-brand-gold mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-brand-gold font-display text-lg mb-2">Loyalty Wallet</h3>
              <div className="text-5xl font-bold text-white mb-2">{profile?.points || 0}</div>
              <p className="text-brand-goldLight font-bold text-xs uppercase tracking-widest mb-4">Value: ₹{(profile?.points || 0) / 2}</p>
              <p className="text-gray-400 text-xs italic">Points are added instantly when your order is marked "Delivered".</p>
            </div>

            {/* Refer & Earn Card */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-brand-gold/20 flex flex-col items-center text-center">
              <Share2 size={48} className="text-brand-gold mb-4" />
              <h3 className="text-brand-dark font-display text-lg mb-2">Refer & Earn</h3>
              <p className="text-gray-500 text-xs mb-6">Get 20 points for registration and 30 if they subscribe!</p>
              <div className="w-full bg-brand-cream border border-gray-200 p-3 rounded-xl flex items-center justify-between gap-4 mb-4">
                <div className="truncate text-gray-600 font-sans text-[10px]">
                  {profile?.referralCode ? `${window.location.origin}/?ref=${profile.referralCode}` : 'Generating...'}
                </div>
                <button onClick={copyReferralLink} className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-brand-gold text-brand-black hover:bg-white border border-transparent hover:border-brand-gold'}`}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Benefit list */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <h3 className="text-lg font-serif font-bold text-brand-black mb-6 flex items-center gap-2"><Gift size={20} className="text-brand-gold" /> Member Benefits</h3>
              <ul className="space-y-4">
                {[
                  { title: "2 Points = ₹1", desc: "Redeem points directly for future discounts." },
                  { title: "Priority Processing", desc: "Your orders move to the front of our kitchen queue." },
                  { title: "Exclusive Offers", desc: "Subscribers get 15% points on all orders." }
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                    <div><p className="text-sm font-bold text-brand-dark">{b.title}</p><p className="text-[10px] text-gray-500">{b.desc}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {orderError && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-widest">
                <AlertCircle size={16} /> {orderError}
              </div>
            )}

            {myOrders.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-gray-500">No active orders yet</h3>
                <button onClick={onBack} className="mt-4 text-brand-gold font-bold uppercase text-xs hover:underline">Start Exploring Menu</button>
              </div>
            ) : (
              myOrders.map(order => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <div key={order.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden group hover:border-brand-gold/30 transition-all duration-500">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 bg-brand-cream rounded-2xl flex items-center justify-center text-brand-gold shrink-0 border border-brand-gold/10">
                          {order.orderType === 'delivery' ? <Truck size={32} /> : order.orderType === 'table_booking' ? <Coffee size={32} /> : <Sofa size={32} />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h4 className="font-bold text-brand-dark text-xl">{order.itemName}</h4>
                            <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 shadow-sm ${statusInfo.color}`}>
                              {statusInfo.icon}
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-sans mb-1">
                            Order ID: <span className="text-brand-dark font-mono uppercase font-bold">{order.id?.substring(0, 8)}</span>
                          </p>
                          <p className="text-xs text-brand-gold font-bold uppercase tracking-widest flex items-center gap-2">
                            {statusInfo.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-12 w-full md:w-auto border-t md:border-t-0 pt-6 md:pt-0">
                        <div className="text-right">
                          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Billing Amount</p>
                          <p className="text-2xl font-display font-bold text-brand-black">₹{order.orderAmount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Points Reward</p>
                          <p className={`text-xl font-display font-bold ${order.status === 'delivered' ? 'text-green-600' : 'text-brand-gold'}`}>
                            +{order.pointsEarned}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Live Progress Tracker */}
                    <div className="bg-brand-cream/50 px-8 py-6 border-t border-gray-100 relative">
                      <div className="flex items-center justify-between overflow-x-auto gap-8 no-scrollbar pb-2">
                        {['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'].map((step, idx) => {
                          const steps = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
                          const currentIdx = steps.indexOf(order.status);
                          const isCompleted = currentIdx >= idx;
                          const isActive = order.status === step;
                          
                          return (
                            <div key={step} className="flex flex-col items-center gap-3 min-w-[80px] shrink-0">
                               <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 ${isCompleted ? 'bg-brand-gold border-brand-gold text-brand-black' : 'bg-white border-gray-200 text-gray-300'}`}>
                                 {isCompleted ? <Check size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                 {isActive && <div className="absolute inset-0 rounded-full bg-brand-gold/40 animate-ping -z-10" />}
                               </div>
                               <span className={`text-[9px] font-bold uppercase tracking-widest text-center ${isCompleted ? 'text-brand-dark' : 'text-gray-400'}`}>
                                 {step.replace('_', ' ')}
                               </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="px-8 py-3 bg-white flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-50">
                        <span>Ordered on {new Date(order.createdAt).toLocaleDateString()}</span>
                        {order.status === 'delivered' && <span>Delivered at {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : 'N/A'}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
