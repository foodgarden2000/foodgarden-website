
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase';
import Auth from './Auth';
import { 
  ArrowLeft, Award, LogOut, User, ShoppingBag, Clock, Share2, Copy, Check, Gift, Truck, Coffee, Sofa, AlertCircle, Loader2, Smartphone, ShieldCheck, Zap, CreditCard, ExternalLink, ArrowRight, Ban, XCircle
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc,
  updateDoc,
  limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { UserProfile, Order, OrderStatus, SubscriptionRequest } from '../types';

interface DashboardProps {
  user: FirebaseUser | null;
  points: number;
  onBack: () => void;
  adminMode?: boolean;
  referralCodeFromUrl?: string | null;
}

type SubStep = 'IDLE' | 'PAYING' | 'CONFIRMING' | 'VERIFYING';

const Dashboard: React.FC<DashboardProps> = ({ user, points, onBack, adminMode, referralCodeFromUrl }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'subscription'>('profile');
  const [copied, setCopied] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Order Cancellation States
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');

  // Subscription Flow States
  const [subStep, setSubStep] = useState<SubStep>('IDLE');
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string} | null>(null);
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setLoadingProfile(false);
      } else {
        setLoadingProfile(false);
      }
    }, (error) => {
      console.error("Profile listen error:", error);
      setLoadingProfile(false);
    });

    const qOrders = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyOrders(orders);
    }, (error) => {
      console.error("Orders listen error:", error);
      setOrderError("Unable to sync your orders.");
    });

    const qSub = query(
      collection(db, "subscription"), 
      where("userId", "==", user.uid),
      limit(5)
    );
    const unsubSub = onSnapshot(qSub, (snapshot) => {
      const pendingSub = snapshot.docs.find(d => d.data().status === 'pending');
      if (pendingSub) {
        const subData = pendingSub.data() as SubscriptionRequest;
        setSubStep('VERIFYING');
        setTxnId(subData.txnId);
        setSelectedPlan({ name: subData.planName, price: subData.amount });
      } else if (subStep === 'VERIFYING') {
        setSubStep('IDLE');
      }
    });

    return () => { unsubProfile(); unsubOrders(); unsubSub(); };
  }, [user]);

  const handleCancelOrderByUser = async () => {
    if (!cancellingOrder) return;
    const reason = cancelReason === 'Other' ? customCancelReason : cancelReason;
    
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      console.log(`USER CANCELLING: Order ${cancellingOrder}`);
      const orderRef = doc(db, "orders", cancellingOrder);
      await updateDoc(orderRef, {
        status: 'cancelled_by_user',
        cancelReason: reason || 'User initiated cancellation',
        cancelledBy: 'user',
        updatedAt: new Date().toISOString()
      });
      alert("Order cancelled successfully.");
      setCancellingOrder(null);
      setCancelReason('');
      setCustomCancelReason('');
    } catch (err) {
      console.error("User cancellation error:", err);
      alert("Failed to cancel order. Please try again.");
    }
  };

  const handleSubscribe = (plan: {name: string, price: string}) => {
    setSelectedPlan(plan);
    setSubStep('PAYING');
    const upiUrl = `upi://pay?pa=8809477481@okaxis&pn=ChefsJalsa&am=${plan.price.replace(/\D/g,'')}&cu=INR`;
    window.open(upiUrl, '_blank');
  };

  const handleConfirmPayment = async () => {
    if (txnId.length < 5) {
      alert("Please enter a valid Transaction ID");
      return;
    }
    if (!user || !profile || !selectedPlan) return;
    try {
      const subRequest: SubscriptionRequest = {
        userId: user.uid,
        userName: profile.name || 'Unknown',
        userEmail: user.email || '',
        userPhone: profile.phone || '',
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        txnId: txnId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "subscription"), subRequest);
    } catch (err) {
      console.error("Subscription save error:", err);
      alert("Error saving request.");
    }
  };

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
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-cream relative overflow-hidden">
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
                  <span className="bg-brand-red text-white px-3 py-1 rounded text-[8px] font-bold uppercase flex items-center gap-1 shadow-lg">
                    <ShieldCheck size={10} fill="currentColor" /> Premium Subscriber
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs font-sans">{user.email}</p>
            </div>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto max-w-full">
            <button onClick={() => setActiveTab('profile')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap ${activeTab === 'profile' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}>Profile</button>
            <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap ${activeTab === 'orders' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}>Orders</button>
            {profile?.role !== 'subscriber' && (
              <button onClick={() => setActiveTab('subscription')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap ${activeTab === 'subscription' ? 'bg-brand-red text-white' : 'text-brand-red'}`}>
                <Zap size={12} /> Subscribe
              </button>
            )}
            <button onClick={() => signOut(auth)} className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-brand-red">Logout</button>
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-brand-dark p-8 rounded-2xl border border-brand-gold/30 shadow-2xl flex flex-col items-center text-center group">
              <Award size={48} className="text-brand-gold mb-4" />
              <h3 className="text-brand-gold font-display text-lg mb-2">Loyalty Wallet</h3>
              <div className="text-5xl font-bold text-white mb-2">{profile?.points || 0}</div>
              <p className="text-gray-400 text-xs italic">Points are added when your order is delivered.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl border border-brand-gold/20 flex flex-col items-center text-center">
              <Share2 size={48} className="text-brand-gold mb-4" />
              <h3 className="text-brand-dark font-display text-lg mb-2">Refer & Earn</h3>
              <div className="w-full bg-brand-cream border border-gray-200 p-3 rounded-xl flex items-center justify-between gap-4">
                <div className="truncate text-gray-600 font-sans text-[10px]">
                  {profile?.referralCode ? `${window.location.origin}/?ref=${profile.referralCode}` : 'Generating...'}
                </div>
                <button onClick={copyReferralLink} className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-brand-gold text-brand-black'}`}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="max-w-4xl mx-auto">
            {profile?.role === 'subscriber' ? (
               <div className="bg-brand-dark p-12 rounded-3xl border border-brand-gold/30 text-center">
                  <ShieldCheck size={48} className="text-brand-gold mx-auto mb-6" />
                  <h2 className="text-3xl font-display font-bold text-white mb-4">Premium Active</h2>
                  <p className="text-gray-400 mb-8">Enjoy exclusive points and priority service!</p>
               </div>
            ) : subStep === 'IDLE' && (
              <div className="text-center">
                <h2 className="text-4xl font-display font-bold text-brand-black mb-12">Upgrade to Premium</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-white p-10 rounded-3xl border-2 border-brand-gold">
                      <Zap size={32} className="text-brand-gold mb-4 mx-auto" />
                      <h3 className="text-2xl font-display font-bold mb-8">Yearly Plan</h3>
                      <p className="text-3xl font-bold mb-8">₹499</p>
                      <button onClick={() => handleSubscribe({name: 'Yearly Plan', price: '₹499'})} className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold uppercase text-xs">Choose Plan</button>
                   </div>
                   <div className="bg-white p-10 rounded-3xl border-2 border-brand-red shadow-xl">
                      <Award size={32} className="text-brand-red mb-4 mx-auto" />
                      <h3 className="text-2xl font-display font-bold mb-8">Lifetime Plan</h3>
                      <p className="text-3xl font-bold mb-8">₹1499</p>
                      <button onClick={() => handleSubscribe({name: 'Lifetime Plan', price: '₹1499'})} className="w-full py-4 bg-brand-red text-white rounded-xl font-bold uppercase text-xs">Choose Plan</button>
                   </div>
                </div>
              </div>
            )}

            {subStep === 'PAYING' && (
              <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl text-center">
                 <Smartphone size={40} className="text-brand-gold mx-auto mb-6" />
                 <h2 className="text-3xl font-display font-bold mb-4">Complete Payment</h2>
                 <p className="text-gray-500 mb-8">Opening UPI for {selectedPlan?.price}...</p>
                 <div className="flex flex-col gap-4">
                    <a href={`upi://pay?pa=8809477481@okaxis&pn=ChefsJalsa&am=${selectedPlan?.price.replace(/\D/g,'')}&cu=INR`} className="py-5 bg-brand-dark text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2">Open Payment App</a>
                    <button onClick={() => setSubStep('CONFIRMING')} className="py-5 bg-brand-gold text-brand-black rounded-xl font-bold uppercase">Confirm Payment Done</button>
                 </div>
              </div>
            )}

            {subStep === 'CONFIRMING' && (
              <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md mx-auto">
                 <h2 className="text-2xl font-display font-bold text-center mb-8">Enter TXN ID</h2>
                 <input type="text" placeholder="UPI Reference Number" className="w-full p-4 bg-brand-cream border rounded-xl mb-6 font-mono font-bold" value={txnId} onChange={(e) => setTxnId(e.target.value)} />
                 <button onClick={handleConfirmPayment} className="w-full py-5 bg-brand-dark text-white rounded-xl font-bold uppercase tracking-widest">Verify Request</button>
              </div>
            )}

            {subStep === 'VERIFYING' && (
              <div className="bg-brand-dark p-12 rounded-3xl border border-brand-gold/20 shadow-2xl text-center">
                 <Clock size={48} className="text-brand-gold mx-auto mb-8 animate-spin-slow" />
                 <h2 className="text-3xl font-display font-bold text-white mb-4">Verifying...</h2>
                 <p className="text-gray-300">Your request for {selectedPlan?.name} is being checked by our team. (TXN: {txnId})</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            {myOrders.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl">
                <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-gray-500">No orders found</h3>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className={`bg-white rounded-2xl p-6 border flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all ${order.status.includes('cancelled') || order.status === 'rejected' ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-xl">{order.itemName}</h4>
                      <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${order.status.includes('cancelled') || order.status === 'rejected' ? 'bg-red-500 text-white' : order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-brand-gold/10 text-brand-gold'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-sans">
                       <span className="flex items-center gap-1"><Clock size={12}/> {new Date(order.createdAt).toLocaleDateString()}</span>
                       <span className="flex items-center gap-1 uppercase tracking-tighter">{order.orderType.replace(/_/g, ' ')}</span>
                    </div>
                    
                    {(order.status === 'rejected' || order.status.includes('cancelled')) && (order.rejectReason || order.cancelReason) && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                         <Ban size={16} className="text-red-500 mt-0.5 shrink-0" />
                         <div>
                            <p className="text-[10px] text-red-500 uppercase font-bold tracking-widest mb-1">
                              {order.status === 'rejected' ? 'Order Rejected' : `Order Cancelled by ${order.cancelledBy === 'admin' ? 'Restaurant' : 'You'}`}
                            </p>
                            <p className="text-xs text-red-700 font-medium italic">"{order.rejectReason || order.cancelReason}"</p>
                         </div>
                      </div>
                    )}

                    {(order.status === 'pending' || order.status === 'accepted') && (
                      <button 
                        onClick={() => setCancellingOrder(order.id!)}
                        className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
                      >
                        <XCircle size={14} /> Cancel Order
                      </button>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-display font-bold">₹{order.orderAmount}</p>
                    {order.status === 'delivered' && <p className="text-xs text-brand-gold">+{order.pointsEarned} Points</p>}
                    {(order.status === 'rejected' || order.status.includes('cancelled')) && <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Cancelled</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* User Cancellation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up border border-red-100">
            <div className="flex items-center gap-4 mb-8 text-red-500">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center border border-red-100"><XCircle size={24} /></div>
              <h3 className="text-2xl font-display font-bold uppercase tracking-widest">Cancel Order</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3 block">Reason for Cancellation</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-brand-dark focus:border-red-500 outline-none transition-all" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                  <option value="">Select a reason...</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Delivery delay">Delivery delay</option>
                  <option value="Operational Issues">Operational Issues</option>
                  <option value="Other">Other reason...</option>
                </select>
              </div>
              {cancelReason === 'Other' && (
                <textarea placeholder="Tell us more..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-brand-dark focus:border-red-500 outline-none transition-all h-24 resize-none" value={customCancelReason} onChange={(e) => setCustomCancelReason(e.target.value)} />
              )}
              <div className="flex gap-3 pt-4">
                <button onClick={handleCancelOrderByUser} className="flex-1 py-4 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95">Cancel Order</button>
                <button onClick={() => { setCancellingOrder(null); setCancelReason(''); setCustomCancelReason(''); }} className="px-8 py-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">Keep Order</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
