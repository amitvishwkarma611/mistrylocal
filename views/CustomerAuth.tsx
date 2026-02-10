import React, { useState, useEffect, useRef } from 'react';
import { AppRole } from '../types';
import { Language, translations } from '../translations';
import { auth, db, RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { ArrowRight, Phone, Mail, ShieldCheck, User, ChevronLeft, Smartphone, AtSign, Loader2 } from 'lucide-react';
import { SkeletonCard } from '../components/SkeletonLoader';

interface CustomerAuthProps {
  onLogin: (role: AppRole, identifier: string, name: string, uid: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.EN) => string;
}

const CustomerAuth: React.FC<CustomerAuthProps> = ({ onLogin, language, setLanguage, t }) => {
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Ref for Recaptcha instance to prevent double-rendering
  const recaptchaVerifier = useRef<any>(null);

  // Helper to cleanup recaptcha if it exists
  const resetRecaptcha = () => {
    if (recaptchaVerifier.current) {
      try {
        recaptchaVerifier.current.clear();
      } catch (e) {
        console.error("Error clearing recaptcha:", e);
      }
      recaptchaVerifier.current = null;
    }
  };

  useEffect(() => {
    setError(null);
  }, [phone, email, password, otp]);

  const initRecaptcha = () => {
    // Check if container exists and verifier isn't already initialized
    const container = document.getElementById('recaptcha-container');
    if (container && !recaptchaVerifier.current) {
      try {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.debug("Recaptcha resolved");
          },
          'expired-callback': () => {
            resetRecaptcha();
          }
        });
      } catch (err) {
        console.error("Recaptcha Initialization Error:", err);
      }
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 1. Ensure Recaptcha is ready
      initRecaptcha();
      
      // 2. Format phone number (E.164 required by Firebase)
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('+') ? phone : `+91${cleanPhone}`;
      
      // 3. Trigger SMS
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
      setConfirmationResult(result);
      setOtpStep(true);
    } catch (err: any) {
      console.error("Full Firebase Auth Error:", err);
      
      // auth/internal-error usually means domain not authorized or recaptcha failed
      if (err.code === 'auth/internal-error') {
        setError("Network error or domain not authorized. Please try again.");
      } else if (err.code === 'auth/invalid-phone-number') {
        setError("Invalid phone number format.");
      } else {
        setError(err.message || "Failed to send OTP. Please try again.");
      }
      
      resetRecaptcha(); // Always reset on error to allow retry
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Enter a valid OTP");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let name = "Customer User";

      if (!userDoc.exists()) {
        // Create new customer user document
        await setDoc(userDocRef, {
          uid: user.uid,
          phone: user.phoneNumber,
          email: user.email || '',
          role: AppRole.CUSTOMER,
          language: language,
          name: name,
          createdAt: serverTimestamp(),
          profileComplete: true
        });
      } else {
        const userData = userDoc.data();
        name = userData.name || "Customer User";
      }

      onLogin(AppRole.CUSTOMER, user.phoneNumber!, name, user.uid);
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError("Invalid OTP code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isSigningUp) {
        // Sign up with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const name = "Customer User";
        
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          role: AppRole.CUSTOMER,
          language: language,
          name: name,
          createdAt: serverTimestamp()
        });

        onLogin(AppRole.CUSTOMER, user.email!, name, user.uid);
      } else {
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Fetch user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        let name = "Customer User";
        
        if (!userDoc.exists()) {
          // If user document doesn't exist, create one
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            role: AppRole.CUSTOMER,
            language: language,
            name: name,
            createdAt: serverTimestamp()
          });
        } else {
          // Use existing user data
          const userData = userDoc.data();
          name = userData.name || "Customer User";
        }

        onLogin(AppRole.CUSTOMER, user.email!, name, user.uid);
      }
    } catch (err: any) {
      console.error(isSigningUp ? "Email signup error:" : "Email login error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("An account with this email already exists. Please login instead.");
      } else if (err.code === 'auth/user-not-found') {
        setError("No account found with this email. Please check your email or sign up.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid credentials. Email authentication may not be enabled. Please try phone authentication instead.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email authentication is not enabled for this application. Please contact support or try phone authentication.");
      } else {
        setError(err.message || (isSigningUp ? "Failed to create account. Please try phone authentication." : "Failed to login. Please try phone authentication."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen animate-in slide-in-from-right-10 duration-500 flex flex-col">
      {/* Container for invisible Recaptcha */}
      <div id="recaptcha-container"></div>
      
      <div className="mb-10">
        <h2 className="text-3xl font-black text-amber-900 mb-2">
          {t('login_title_customer')}
        </h2>
        <p className="text-gray-500 font-bold italic">
          {t('login_subtitle_customer')}
        </p>
        
        {/* Authentication Method Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mt-4">
          <button
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${authMethod === 'phone' ? 'bg-white shadow-sm text-amber-900' : 'text-gray-500'}`}
            onClick={() => setAuthMethod('phone')}
          >
            <div className="flex items-center justify-center gap-2">
              <Phone size={16} />
              {t('phone_auth')}
            </div>
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${authMethod === 'email' ? 'bg-white shadow-sm text-amber-900' : 'text-gray-500'}`}
            onClick={() => setAuthMethod('email')}
          >
            <div className="flex items-center justify-center gap-2">
              <Mail size={16} />
              {t('email_auth')}
            </div>
          </button>
        </div>
      </div>

      {authMethod === 'phone' ? (
        // Phone authentication form
        <form onSubmit={otpStep ? handleVerifyOTP : handleSendOTP} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-3 px-1">{t('enter_mobile')}</label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                required
                type="tel" 
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpStep || loading}
                className="w-full py-5 pl-12 pr-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-amber-900 outline-none focus:border-orange-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {otpStep && (
            <div className="animate-in zoom-in-95 duration-300">
              <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-3 px-1">Enter Verification Code</label>
              <div className="relative">
                <input 
                  autoFocus
                  required
                  type="text" 
                  maxLength={6} 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full py-5 px-4 bg-white border-2 border-orange-200 rounded-2xl text-center text-2xl font-black text-amber-900 shadow-sm outline-none focus:border-orange-600"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold animate-in shake duration-300">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-400"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                {otpStep ? t('verify_otp') : t('send_otp')}
                <ArrowRight size={22} />
              </>
            )}
          </button>
        </form>
      ) : (
        // Email authentication form
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-3 px-1">{t('enter_email')}</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                required
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full py-5 pl-12 pr-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-amber-900 outline-none focus:border-orange-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-3 px-1">{t('enter_password')}</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input 
                required
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full py-5 pl-12 pr-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-amber-900 outline-none focus:border-orange-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold animate-in shake duration-300">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button 
              disabled={loading}
              className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  {isSigningUp ? t('signup') : t('login')}
                  <ArrowRight size={22} />
                </>
              )}
            </button>
          </div>
          
          <div className="text-center pt-4">
            <button 
              type="button"
              onClick={() => setIsSigningUp(!isSigningUp)}
              className="text-sm font-bold text-orange-600 hover:underline"
            >
              {isSigningUp ? t('have_account') : t('need_account')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-12 text-center">
        <p className="text-sm font-bold text-gray-400 mb-2">&nbsp;</p>
      </div>

      <div className="mt-auto pt-10 flex flex-col items-center opacity-40 grayscale">
         <ShieldCheck className="text-green-600 mb-2" size={32} />
         <p className="text-[10px] font-black uppercase tracking-tighter">100% Secured by MistryLocal Trust</p>
      </div>
    </div>
  );
};

export default CustomerAuth;