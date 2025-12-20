
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase';
import Auth from './Auth';
import { 
  ArrowLeft, Award, LogOut, User, ShoppingBag, Clock, ShieldAlert, Share2, Copy, Check, Gift, Star 
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { UserProfile } from '../types';

interface DashboardProps {
  user: FirebaseUser | null;
  points: number;
  onBack: () => void;
  adminMode?: boolean;
  referralCodeFromUrl?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user, points, onBack, adminMode, referralCodeFromUrl }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    if (!user) return;

    setLoadingProfile(true);
    setProfile(null);

    const unsub = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        
        if (!data.referralCode || data.referralCode.trim() === "") {
          const newCode = generateReferralCode();
          try {
            await updateDoc(doc(db, "users", user.uid), {
              referralCode: newCode
            });
          } catch (err) {
            console.error("Failed to generate missing referral code:", err);
          }
          return;
        }

        setProfile(data);
        
        if (data.role === 'subscriber' && data.referredBy) {
          checkAndApplySubscriptionBonus(user.uid, data.referredBy);
        }
      }
      setLoadingProfile(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setLoadingProfile(false);
    });

    return () => unsub();
  }, [user]);

  const checkAndApplySubscriptionBonus = async (myUid: string, referrerUid: string) => {
    try {
      const q = query(
        collection(db, "referrals"), 
        where("newUserId", "==", myUid), 
        where("referralType", "==", "subscribe")
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await updateDoc(doc(db, "users", referrerUid), {
          points: increment(10)
        });
        await updateDoc(doc(db, "users", myUid), {
          points: increment(10)
        });
        await addDoc(collection(db, "referrals"), {
          referrerId: referrerUid,
          newUserId: myUid,
          referralType: "subscribe",
          pointsGiven: 10,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error applying subscription bonus:", err);
    }
  };

  const getSafeReferralLink = () => {
    if (!profile || !profile.referralCode) return '';
    try {
      // Use the URL API to safely construct the referral link
      // This handles origin, pathname, and params correctly in all environments
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('ref', profile.referralCode);
      return url.toString();
    } catch (e) {
      // Fallback in case of unexpected URL errors
      return `${window.location.origin}/?ref=${profile.referralCode}`;
    }
  };

  const copyReferralLink = () => {
    const link = getSafeReferralLink();
    if (!link) return;
    
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className={`pt-24 min-h-screen bg-brand-black flex flex-col items-center`}>
        <div className="w-full max-w-4xl px-4">
          <button onClick={onBack} className="text-brand-gold flex items-center gap-2 mb-8 hover:underline uppercase text-xs font-bold tracking-widest">
            <ArrowLeft size={16} /> Back to Home
          </button>
          <Auth adminOnly={adminMode} externalReferralCode={referralCodeFromUrl} />
        </div>
      </div>
    );
  }

  const isActuallyAdmin = user.email === 'admin@chefsjalsa.com';
  if (adminMode && !isActuallyAdmin) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-brand-black flex flex-col items-center justify-center text-center px-4">
         <div className="bg-brand-red/10 border border-brand-red/30 p-12 rounded-2xl max-w-md shadow-2xl">
            <ShieldAlert size={64} className="text-brand-red mx-auto mb-6" />
            <h2 className="text-3xl font-display font-bold text-white mb-4">Access Restricted</h2>
            <p className="text-gray-400 mb-8 font-sans">
              You are currently logged in as a <strong>Member</strong>. Staff privileges are required to access the central hub.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => signOut(auth)}
                className="w-full py-4 bg-brand-red text-white font-bold uppercase tracking-widest rounded-lg"
              >
                Sign Out to Switch Account
              </button>
              <button 
                onClick={onBack}
                className="w-full py-4 border border-gray-700 text-gray-400 font-bold uppercase tracking-widest rounded-lg hover:text-white transition-colors"
              >
                Return to Website
              </button>
            </div>
         </div>
      </div>
    );
  }

  const handleLogout = () => {
    signOut(auth);
    onBack();
  };

  if (loadingProfile) {
    return (
      <div className="h-screen bg-brand-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-cream relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-dark rounded-full flex items-center justify-center text-brand-gold border-2 border-brand-gold shadow-xl">
              <User size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-display font-bold text-brand-black">{profile?.name || 'Member'}</h2>
                {profile?.role === 'subscriber' && (
                  <span className="bg-brand-gold text-brand-black px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Subscriber
                  </span>
                )}
              </div>
              <p className="text-gray-500 font-sans">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-brand-dark p-8 rounded-2xl border border-brand-gold/30 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold mb-6">
              <Award size={32} />
            </div>
            <h3 className="text-brand-gold font-display text-xl mb-2">Loyalty Points</h3>
            <div className="text-6xl font-bold text-white mb-4">{profile?.points || 0}</div>
            <p className="text-gray-400 text-sm italic">You earn points on orders and referrals. Redeem them for exclusive discounts!</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-brand-gold/20 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold mb-6">
              <Share2 size={32} />
            </div>
            <h3 className="text-brand-dark font-display text-xl mb-2">Refer & Earn</h3>
            <p className="text-gray-500 text-sm mb-6">Invite friends to join Chef's Jalsa. <br/> Get 20 points for every registration and 30 if they subscribe!</p>
            
            <div className="w-full bg-brand-cream border border-gray-200 p-4 rounded-xl flex items-center justify-between gap-4 mb-4">
              <div className="truncate text-gray-600 font-sans text-xs">
                {profile && profile.referralCode ? getSafeReferralLink() : 'Generating link...'}
              </div>
              <button 
                onClick={copyReferralLink}
                disabled={!profile || !profile.referralCode}
                className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-brand-gold text-brand-black hover:bg-white border border-transparent hover:border-brand-gold disabled:opacity-50'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            {profile?.referralCode && (
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Your Referral Code: <span className="text-brand-gold">{profile.referralCode}</span>
              </span>
            )}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 h-full">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
              <ShoppingBag size={24} className="text-brand-gold" />
              <h3 className="text-xl font-serif font-bold text-brand-black">Your Jalsa Stats</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-gold/10 rounded-lg flex items-center justify-center text-brand-gold shrink-0">
                  <Gift size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-dark mb-1">Referral Rewards</h4>
                  <p className="text-xs text-gray-500">20 points for every friend who joins using your link.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-gold/10 rounded-lg flex items-center justify-center text-brand-gold shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-dark mb-1">Subscription Bonus</h4>
                  <p className="text-xs text-gray-500">Upgrade to Subscriber to get a 30-point total referral bonus for you and your friends.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-gold/10 rounded-lg flex items-center justify-center text-brand-gold shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-dark mb-1">Point History</h4>
                  <p className="text-xs text-gray-500">Points from delivered orders and referrals are updated in real-time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
