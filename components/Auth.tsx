
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Mail, Lock, UserPlus, LogIn, Loader2, AlertCircle, User, Phone, ShieldCheck, Gift } from 'lucide-react';
import { RESTAURANT_INFO } from '../constants';

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
  const [referralCodeInUrl, setReferralCodeInUrl] = useState<string | null>(externalReferralCode);

  const ADMIN_EMAIL = 'admin@chefsjalsa.com';

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

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (adminOnly && email.toLowerCase() !== ADMIN_EMAIL) {
      setError("Access Denied: This portal is strictly for authorized staff only.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Reverted: Simple storage of referral information without immediate point logic
        await setDoc(doc(db, "users", newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          name: name,
          phone: phone,
          role: "registered",
          points: 0,
          referralCode: generateReferralCode(),
          referredBy: referralCodeInUrl || null,
          createdAt: new Date().toISOString()
        });
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
                <p className="text-brand-gold text-xs font-bold uppercase tracking-widest">Referral code "{referralCodeInUrl}" applied!</p>
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
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !adminOnly && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 text-gray-500" size={18} />
                  <input 
                    type="tel" 
                    placeholder="Phone Number" 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-500" size={18} />
              <input 
                type="email" 
                placeholder={adminOnly ? "Staff ID (Email)" : "Email Address"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-500" size={18} />
              <input 
                type="password" 
                placeholder="Secure Password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-gold focus:outline-none transition-colors placeholder-gray-600 font-sans"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 ${adminOnly ? 'bg-brand-red hover:bg-red-700' : 'bg-brand-gold hover:bg-white'} text-white md:${adminOnly ? 'text-white' : 'text-brand-black'} font-bold uppercase tracking-widest transition-all duration-300 rounded-lg shadow-lg flex items-center justify-center gap-2`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
              {adminOnly ? "Staff Login" : (isLogin ? "Sign In" : "Register Now")}
            </button>
          </form>

          {!adminOnly && (
            <div className="mt-8 text-center">
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-gray-400 text-sm hover:text-brand-gold transition-colors underline underline-offset-4"
              >
                {isLogin ? "Don't have an account? Register" : "Already a member? Sign In"}
              </button>
            </div>
          )}
          
          {adminOnly && (
             <p className="mt-6 text-center text-[9px] text-gray-500 uppercase tracking-widest font-bold">
               Authorized Personnel Only. Unauthorized access is recorded.
             </p>
          )}
        </div>
        
        {!adminOnly && (
          <p className="mt-8 text-center text-gray-600 text-xs uppercase tracking-widest">
            Pure Vegetarian Excellence Since 2014
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
