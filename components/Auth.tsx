
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  writeBatch,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Mail, Lock, UserPlus, LogIn, Loader2, AlertCircle, User, Phone, ShieldCheck, Gift, Tag, CheckCircle2 } from 'lucide-react';
import { RESTAURANT_INFO, REFERRAL_SIGNUP_REWARD, getOptimizedImageURL } from '../constants';

interface AuthProps {
  adminOnly?: boolean;
  externalReferralCode?: string | null;
}

const Auth: React.FC<AuthProps> = ({ adminOnly = false, externalReferralCode = null }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referralCodeInUrl, setReferralCodeInUrl] = useState<string | null>(externalReferralCode);

  const ADMIN_EMAIL = 'foodg808@gmail.com';
  const GOOGLE_ICON_URL = "https://drive.google.com/file/d/1jpvRusqhuBsf08gYo_fh2vYGktUbznfN/view?usp=drive_link";

  useEffect(() => {
    if (!referralCodeInUrl) {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) setReferralCodeInUrl(ref);
    }

    if (adminOnly) {
      setIsLogin(true);
    }
  }, [adminOnly, referralCodeInUrl]);

  const generateReferralCode = (userName: string) => {
    const cleanName = (userName || 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}-${randomSuffix}`;
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (adminOnly && user.email?.toLowerCase() !== ADMIN_EMAIL) {
         await signOut(auth);
         throw new Error("Access Denied: This portal is strictly for authorized staff only.");
      }

      // Sync Firestore profile for new social users
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const batch = writeBatch(db);
        let inviterUid = null;
        let inviterRefCode = referralCodeInUrl?.trim().toUpperCase();

        if (inviterRefCode) {
          const inviterQuery = query(
            collection(db, "users"),
            where("referralCode", "==", inviterRefCode),
            limit(1)
          );
          const inviterSnap = await getDocs(inviterQuery);
          
          if (!inviterSnap.empty) {
            const inviterDoc = inviterSnap.docs[0];
            inviterUid = inviterDoc.id;
            batch.update(doc(db, "users", inviterUid), {
              points: increment(REFERRAL_SIGNUP_REWARD),
              totalReferrals: increment(1)
            });
            const rewardRef = doc(collection(db, "referralRewards"));
            batch.set(rewardRef, {
              userId: inviterUid,
              referredUserId: user.uid, 
              pointsEarned: REFERRAL_SIGNUP_REWARD,
              type: 'signup',
              timestamp: new Date().toISOString()
            });
          } else {
            inviterRefCode = null;
          }
        }

        const myReferralCode = generateReferralCode(user.displayName || 'GUEST');
        const signupPoints = inviterRefCode ? REFERRAL_SIGNUP_REWARD : 0;
        const initialHistory = inviterRefCode ? [{
          type: 'earned',
          amount: REFERRAL_SIGNUP_REWARD,
          via: 'signup',
          date: new Date().toISOString()
        }] : [];

        batch.set(userRef, {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Google Guest',
          phone: user.phoneNumber || '',
          role: "registered",
          points: signupPoints,
          pointsHistory: initialHistory,
          referralCode: myReferralCode,
          referredBy: inviterRefCode || null,
          totalReferrals: 0,
          firstOrderCompleted: false,
          createdAt: new Date().toISOString()
        });
        
        await batch.commit();
      }
    } catch (err: any) {
      setError(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (adminOnly && email.toLowerCase() !== ADMIN_EMAIL) {
      setError("Access Denied: This portal is strictly for authorized staff only.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            throw new Error("password or Email Incorrect");
          }
          throw err;
        }
      } else {
        const batch = writeBatch(db);
        let inviterUid = null;
        let inviterRefCode = referralCodeInUrl?.trim().toUpperCase();

        if (inviterRefCode) {
          const inviterQuery = query(
            collection(db, "users"),
            where("referralCode", "==", inviterRefCode),
            limit(1)
          );
          const inviterSnap = await getDocs(inviterQuery);
          
          if (!inviterSnap.empty) {
            const inviterDoc = inviterSnap.docs[0];
            inviterUid = inviterDoc.id;
            batch.update(doc(db, "users", inviterUid), {
              points: increment(REFERRAL_SIGNUP_REWARD),
              totalReferrals: increment(1)
            });
            const rewardRef = doc(collection(db, "referralRewards"));
            batch.set(rewardRef, {
              userId: inviterUid,
              referredUserId: 'PENDING_REGISTRATION', 
              pointsEarned: REFERRAL_SIGNUP_REWARD,
              type: 'signup',
              timestamp: new Date().toISOString()
            });
          } else {
            inviterRefCode = null;
          }
        }

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;
          const myReferralCode = generateReferralCode(name);
          const signupPoints = inviterRefCode ? REFERRAL_SIGNUP_REWARD : 0;
          const initialHistory = inviterRefCode ? [{
            type: 'earned',
            amount: REFERRAL_SIGNUP_REWARD,
            via: 'signup',
            date: new Date().toISOString()
          }] : [];

          batch.set(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            email: newUser.email,
            name: name,
            phone: phone,
            role: "registered",
            points: signupPoints,
            pointsHistory: initialHistory,
            referralCode: myReferralCode,
            referredBy: inviterRefCode || null,
            totalReferrals: 0,
            firstOrderCompleted: false,
            createdAt: new Date().toISOString()
          });

          await batch.commit();
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            throw new Error("user already exists. sign in?");
          }
          throw err;
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center ${adminOnly ? 'bg-transparent' : 'min-h-screen bg-brand-black'} px-4 relative overflow-hidden`}>
      {!adminOnly && (
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-gold/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-red/10 rounded-full blur-[120px]"></div>
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        {!adminOnly && (
          <div className="text-center mb-10">
            <h1 className="text-4xl font-display font-bold text-brand-gold mb-2 tracking-widest">{RESTAURANT_INFO.name}</h1>
            <p className="text-gray-400 font-serif italic">Exclusive Guest Portal</p>
          </div>
        )}

        <div className={`bg-brand-dark/50 backdrop-blur-xl border ${adminOnly ? 'border-brand-red/30' : 'border-brand-gold/20'} p-8 rounded-2xl shadow-2xl`}>
          {referralCodeInUrl && !isLogin && (
             <div className="mb-6 bg-brand-gold/10 border border-brand-gold/30 p-3 rounded-lg flex items-center gap-3">
                <Gift className="text-brand-gold" size={20} />
                <p className="text-brand-gold text-xs font-bold uppercase tracking-widest">Referral applied!</p>
             </div>
          )}

          <div className="flex justify-center mb-6">
            {adminOnly ? (
              <div className="p-4 bg-brand-red/10 rounded-full text-brand-red border border-brand-red/20">
                <ShieldCheck size={32} />
              </div>
            ) : (
              <div className="p-4 bg-brand-gold/10 rounded-full text-brand-gold border border-brand-gold/20">
                <User size={32} />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-serif text-white mb-2 text-center">
            {adminOnly ? "Staff Secure Access" : (isLogin ? "Welcome Back" : "Join The Jalsa")}
          </h2>
          {adminOnly && <p className="text-brand-red text-[10px] uppercase tracking-[0.2em] font-bold text-center mb-8">Restricted Entry Portal</p>}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400 text-sm font-bold">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg flex items-start gap-3 text-emerald-400 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !adminOnly && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-gray-500" size={18} />
                  <input type="text" placeholder="Full Name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors font-sans" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 text-gray-500" size={18} />
                  <input type="tel" placeholder="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors font-sans" />
                </div>
              </>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-500" size={18} />
              <input type="email" placeholder={adminOnly ? "Staff ID" : "Email Address"} required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors font-sans" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-500" size={18} />
              <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors font-sans" />
            </div>

            {isLogin && (
              <div className="text-right">
                <button type="button" onClick={handleForgotPassword} className="text-[10px] text-gray-500 hover:text-brand-gold uppercase tracking-widest font-bold transition-colors">Forgot Password?</button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 ${adminOnly ? 'bg-brand-red hover:bg-red-700' : 'bg-brand-gold hover:bg-white text-brand-black'} font-bold uppercase tracking-widest transition-all duration-300 rounded-lg shadow-lg flex items-center justify-center gap-2`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
              {adminOnly ? "Staff Login" : (isLogin ? "Sign In" : "Register Now")}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

          {/* Google Button */}
          <button 
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-4 bg-white border border-gray-200 text-brand-black font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img 
              src={getOptimizedImageURL(GOOGLE_ICON_URL)} 
              alt="Google" 
              className="w-5 h-5 object-contain"
            />
            Continue with Google
          </button>

          {!adminOnly && (
            <div className="mt-8 text-center">
              <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} className="text-gray-400 text-sm hover:text-brand-gold transition-colors underline underline-offset-4">
                {isLogin ? "Don't have an account? Register" : "Already a member? Sign In"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
