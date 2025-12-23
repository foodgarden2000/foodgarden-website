
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase';
import Auth from './Auth';
import { 
  ArrowLeft, Award, LogOut, User, ShoppingBag, Clock, Share2, Copy, Check, Gift, Truck, Coffee, Sofa, AlertCircle, Loader2, Smartphone, ShieldCheck, Zap, CreditCard, ExternalLink, ArrowRight, Ban, XCircle, Search, Tag, Coins, CalendarCheck, MapPin
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc,
  updateDoc,
  limit,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { UserProfile, Order, OrderStatus, SubscriptionRequest, EventBooking } from '../types';

interface DashboardProps {
  user: FirebaseUser | null;
  points: number;
  onBack: () => void;
  adminMode?: boolean;
  adminOnlyRequest?: boolean;
  referralCodeFromUrl?: string | null;
}

type SubStep = 'IDLE' | 'PAYING' | 'CONFIRMING' | 'VERIFYING';
type DashboardTab = 'profile' | 'orders' | 'bookings' | 'subscription';

const Dashboard: React.FC<DashboardProps> = ({ user, points, onBack, adminMode, adminOnlyRequest, referralCodeFromUrl }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myBookings, setMyBookings] = useState<EventBooking[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [copied, setCopied] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Subscription Flow States
  const [subStep, setSubStep] = useState<SubStep>('IDLE');
  const [selectedPlan, setSelectedPlan] = useState<{name: 'yearly' | 'lifetime', price: number} | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [activeSubRequest, setActiveSubRequest] = useState<SubscriptionRequest | null>(null);

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
    });

    const qOrders = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyOrders(orders);
    });

    const qBookings = query(collection(db, "eventBookings"), where("userId", "==", user.uid));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventBooking));
      bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyBookings(bookings);
    });

    const qSub = query(
      collection(db, "subscription"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsubSub = onSnapshot(qSub, (snapshot) => {
      if (!snapshot.empty) {
        const subData = snapshot.docs[0].data() as SubscriptionRequest;
        setActiveSubRequest(subData);
        if (subData.status === 'pending') {
          setSubStep('VERIFYING');
          setTransactionId(subData.transactionId);
        } else {
          setSubStep('IDLE');
        }
      }
    });

    return () => { unsubProfile(); unsubOrders(); unsubBookings(); unsubSub(); };
  }, [user]);

  const handleSubscribe = (plan: {name: 'yearly' | 'lifetime', price: number}) => {
    setSelectedPlan(plan);
    setSubStep('PAYING');
    const upiUrl = `upi://pay?pa=8809477481@okaxis&pn=ChefsJalsa&am=${plan.price}&cu=INR`;
    window.open(upiUrl, '_blank');
  };

  const handleConfirmPayment = async () => {
    if (transactionId.length < 5) {
      alert("Please enter a valid Transaction ID");
      return;
    }
    if (!user || !profile || !selectedPlan) return;
    try {
      const subRequest: SubscriptionRequest = {
        userId: user.uid,
        userName: profile.name || 'Unknown',
        userEmail: user.email || '',
        phone: profile.phone || '',
        transactionId: transactionId,
        planType: selectedPlan.name,
        amountPaid: selectedPlan.price,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, "subscription"), subRequest);
      console.log("Subscription request created");
      alert("Your subscription is under verification. Approval may take up to 24 hours.");
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
    return <Auth adminOnly={adminOnlyRequest} externalReferralCode={referralCodeFromUrl} />;
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-cream relative overflow-hidden font-sans">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brand-dark rounded-full flex items-center justify-center text-brand-gold border-2 border-brand-gold shadow-xl">
              <User size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-brand-black">
                  {profile?.name || 'Member'}
                </h2>
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
            <button onClick={() => setActiveTab('bookings')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap ${activeTab === 'bookings' ? 'bg-brand-dark text-white' : 'text-gray-400'}`}>Bookings</button>
            <button onClick={() => setActiveTab('subscription')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap ${activeTab === 'subscription' ? 'bg-brand-red text-white' : 'text-brand-red'}`}>
              <Zap size={12} /> {profile?.role === 'subscriber' ? 'My Status' : 'Subscribe'}
            </button>
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
               <div className="bg-brand-dark p-12 rounded-3xl border border-brand-gold/30 text-center animate-fade-in">
                  <ShieldCheck size={48} className="text-brand-gold mx-auto mb-6" />
                  <h2 className="text-3xl font-display font-bold text-white mb-4 uppercase tracking-widest">Premium Membership Active</h2>
                  <p className="text-gray-400 mb-8 font-light italic">Enjoy 15% loyalty points and priority service!</p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left bg-black/40 p-6 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Plan:</span>
                    <span className="text-brand-gold text-xs font-bold uppercase">{profile.subscription?.plan}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Since:</span>
                    <span className="text-gray-300 text-xs">{new Date(profile.subscription?.startDate || '').toLocaleDateString()}</span>
                  </div>
               </div>
            ) : subStep === 'IDLE' && (
              <div className="text-center animate-fade-in">
                <h2 className="text-4xl font-display font-bold text-brand-black mb-4 uppercase tracking-widest">Become a Subscriber</h2>
                <p className="text-gray-500 mb-12 font-light">Join our elite circle for exclusive rewards and faster service.</p>
                
                {activeSubRequest && activeSubRequest.status === 'rejected' && (
                  <div className="mb-12 p-6 bg-red-50 border border-red-200 rounded-3xl text-left flex items-start gap-4">
                    <AlertCircle className="text-red-500 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-red-800 font-bold text-sm uppercase tracking-widest mb-1">Previous Request Rejected</h4>
                      <p className="text-red-600 text-xs italic">Reason: "{activeSubRequest.adminReason}"</p>
                      <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-widest">You can submit a new request below.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-white p-10 rounded-3xl border-2 border-brand-gold shadow-xl hover:scale-105 transition-transform">
                      <Zap size={32} className="text-brand-gold mb-4 mx-auto" />
                      <h3 className="text-2xl font-display font-bold mb-8 uppercase tracking-widest">Yearly Plan</h3>
                      <p className="text-4xl font-bold mb-8 text-brand-dark">₹499</p>
                      <button onClick={() => handleSubscribe({name: 'yearly', price: 499})} className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-gold transition-colors shadow-lg">Select Plan</button>
                   </div>
                   <div className="bg-white p-10 rounded-3xl border-2 border-brand-red shadow-xl hover:scale-105 transition-transform">
                      <Award size={32} className="text-brand-red mb-4 mx-auto" />
                      <h3 className="text-2xl font-display font-bold mb-8 uppercase tracking-widest">Lifetime Plan</h3>
                      <p className="text-4xl font-bold mb-8 text-brand-red">₹1499</p>
                      <button onClick={() => handleSubscribe({name: 'lifetime', price: 1499})} className="w-full py-4 bg-brand-red text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-black transition-colors shadow-lg">Select Plan</button>
                   </div>
                </div>
              </div>
            )}

            {subStep === 'PAYING' && (
              <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl text-center animate-fade-in">
                 <Smartphone size={40} className="text-brand-gold mx-auto mb-6" />
                 <h2 className="text-3xl font-display font-bold mb-4 uppercase tracking-widest">Complete Payment</h2>
                 <p className="text-gray-500 mb-8 font-light italic">Pay ₹{selectedPlan?.price} to activate your premium status.</p>
                 <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    <a href={`upi://pay?pa=8809477481@okaxis&pn=ChefsJalsa&am=${selectedPlan?.price}&cu=INR`} target="_blank" className="py-5 bg-brand-dark text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-black transition-all">
                      <CreditCard size={18} /> Open Payment App
                    </a>
                    <button onClick={() => setSubStep('CONFIRMING')} className="py-5 bg-brand-gold text-brand-black rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-white transition-all">I have paid. Confirm now.</button>
                    <button onClick={() => setSubStep('IDLE')} className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-brand-red transition-colors">Go Back</button>
                 </div>
              </div>
            )}

            {subStep === 'CONFIRMING' && (
              <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md mx-auto animate-fade-in border border-brand-gold/10">
                 <h2 className="text-2xl font-display font-bold text-center mb-2 uppercase tracking-widest">Verify Payment</h2>
                 <p className="text-center text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-8">Enter your UPI Transaction ID</p>
                 <input 
                   type="text" 
                   placeholder="12-digit Ref No." 
                   className="w-full p-5 bg-brand-cream border border-gray-200 rounded-xl mb-6 font-mono font-bold text-center focus:border-brand-gold outline-none text-xl" 
                   value={transactionId} 
                   onChange={(e) => setTransactionId(e.target.value)} 
                 />
                 <button onClick={handleConfirmPayment} className="w-full py-5 bg-brand-dark text-white rounded-xl font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-brand-black transition-all shadow-xl active:scale-95">Submit for Verification</button>
                 <button onClick={() => setSubStep('PAYING')} className="w-full mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-brand-red">Back to Payment</button>
              </div>
            )}

            {subStep === 'VERIFYING' && (
              <div className="bg-brand-dark p-12 rounded-3xl border border-brand-gold/20 shadow-2xl text-center animate-fade-in">
                 <Clock size={48} className="text-brand-gold mx-auto mb-8 animate-pulse" />
                 <h2 className="text-3xl font-display font-bold text-white mb-4 uppercase tracking-widest">Verification Pending</h2>
                 <p className="text-gray-300 font-light italic mb-8">Our staff is verifying your Transaction ID: <span className="text-brand-gold font-mono font-bold">{transactionId}</span></p>
                 <div className="bg-black/50 p-6 rounded-2xl border border-white/5 inline-block">
                   <p className="text-[10px] text-brand-gold uppercase font-bold tracking-[0.2em]">Current Status: Under Review</p>
                 </div>
                 <p className="text-gray-500 text-[9px] mt-8 uppercase font-bold tracking-widest">Updates are reflected automatically. No refresh required.</p>
              </div>
            )}
          </div>
        )}

        {/* Orders and Bookings tabs remain untouched as requested */}
        {activeTab === 'orders' && (
          <div className="space-y-8 animate-fade-in">
            {myOrders.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                <ShoppingBag size={48} className="text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-gray-500">No active orders found</h3>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className={`bg-white rounded-2xl p-6 border flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:shadow-lg animate-fade-in-up border-gray-100`}>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className="font-bold text-xl text-brand-black">{order.itemName}</h4>
                      <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-500 text-white shadow-md' : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                       <span className="flex items-center gap-1.5"><Clock size={12} className="text-brand-gold" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                       <span className="flex items-center gap-1.5"><Tag size={12} className="text-brand-gold" /> {order.orderType.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-display font-bold text-brand-black">₹{order.orderAmount}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-8 animate-fade-in">
            {myBookings.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                <CalendarCheck size={48} className="text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-gray-500">No event bookings found</h3>
              </div>
            ) : (
              myBookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all animate-fade-in-up">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                       <span className="p-2 bg-brand-gold/10 text-brand-gold rounded-lg"><CalendarCheck size={20} /></span>
                       <h4 className="font-bold text-xl text-brand-black uppercase tracking-widest">{booking.bookingType} Party</h4>
                       <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${booking.status === 'accepted' ? 'bg-green-500 text-white' : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'}`}>
                         {booking.status.replace(/_/g, ' ')}
                       </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                       <div className="flex items-center gap-1.5"><Clock size={12} className="text-brand-gold" /> {booking.date} at {booking.time}</div>
                       <div className="flex items-center gap-1.5"><User size={12} className="text-brand-gold" /> {booking.peopleCount} People</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
