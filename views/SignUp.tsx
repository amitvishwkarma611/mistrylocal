import React, { useState } from 'react';
import { AppRole } from '../types';
import { Language, translations } from '../translations';
import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';
import { ArrowRight, Mail, ShieldCheck, User, Hammer, Phone, Smartphone, AtSign, Loader2 } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface SignUpProps {
  onSignUp: (role: AppRole, identifier: string, name: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.EN) => string;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUp, language, setLanguage, t }) => {
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('email');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (role: AppRole) => {
    setSelectedRole(role);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      setError("Please fill in all fields");
      return;
    }

    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        phone: '',
        name: name,
        role: selectedRole,
        language: language,
        createdAt: serverTimestamp(),
        profileComplete: true
      });

      onSignUp(selectedRole, user.email!, name);
    } catch (err: any) {
      console.error("Email signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("An account with this email already exists. Please login instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !name) {
      setError("Please enter phone number and name");
      return;
    }

    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    setLoading(true);
    setError(null);

    // In a real implementation, this would trigger phone verification
    // For now, we'll simulate a successful signup
    try {
      // Format phone number (this is simplified)
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('+') ? phone : `+91${cleanPhone}`;

      // This is a simplified approach - in reality, phone auth requires OTP verification
      // For demonstration purposes, we'll create a user record
      // Note: This is just for the demo since Firebase phone auth requires actual SMS
      
      // In a real app, this would involve sending an OTP and verifying it
      alert(`In a real app, we would send an OTP to ${formattedPhone} for verification.`);
      
      // For this demo, we'll just create a temporary user record
      // In a real app, you'd only create the record after OTP verification
      onSignUp(selectedRole, formattedPhone, name);
    } catch (err: any) {
      setError(err.message || "Failed to initiate phone signup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-orange-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-orange-200 rotate-12">
          <Hammer size={40} className="text-white -rotate-12" />
        </div>
        
        <h1 className="text-3xl font-black text-amber-900 text-center mb-2 tracking-tighter">
          Mistry<span className="text-orange-600">Local</span>
        </h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center mb-12">
          {t('welcome_subtitle')}
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={() => handleRoleSelect(AppRole.CUSTOMER)}
            className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl flex items-center gap-5 hover:border-orange-500 transition-all group active:scale-95 shadow-sm"
          >
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <User size={28} />
            </div>
            <div className="text-left flex-1">
              <p className="text-lg font-black text-amber-900 leading-tight">{t('i_need_mistry')}</p>
              <p className="text-xs text-gray-500 mt-1">Book expert help in seconds</p>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-orange-600" />
          </button>

          <button 
            onClick={() => handleRoleSelect(AppRole.CARPENTER)}
            className="w-full p-6 bg-amber-900 border-2 border-amber-900 rounded-3xl flex items-center gap-5 hover:bg-amber-800 transition-all group active:scale-95 shadow-xl shadow-amber-100"
          >
            <div className="w-14 h-14 bg-amber-800 rounded-2xl flex items-center justify-center text-amber-100">
              <Hammer size={28} />
            </div>
            <div className="text-left flex-1">
              <p className="text-lg font-black text-white leading-tight">{t('i_am_mistry')}</p>
              <p className="text-xs text-amber-200/60 mt-1">Earn daily & grow business</p>
            </div>
            <ArrowRight size={20} className="text-amber-500" />
          </button>
        </div>

        <div className="mt-16 flex gap-3">
          {(['EN', 'HI', 'PA'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${language === lang ? 'bg-amber-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
            >
              {lang === 'EN' ? 'EN' : lang === 'HI' ? 'हिन्दी' : 'ਪੰਜਾਬੀ'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen animate-in slide-in-from-right-10 duration-500 flex flex-col">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-amber-900 mb-2">
          {selectedRole === AppRole.CUSTOMER ? `${t('signup')} ${t('customer_mode')}` : `${t('signup')} ${t('carpenter_mode')}`}
        </h2>
        <p className="text-gray-500 font-bold italic">
          {selectedRole === AppRole.CUSTOMER ? "Create an account to book services" : "Create an account to offer your services"}
        </p>
        
        {/* Authentication Method Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mt-4">
          <button
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${authMethod === 'email' ? 'bg-white shadow-sm text-amber-900' : 'text-gray-500'}`}
            onClick={() => setAuthMethod('email')}
          >
            <div className="flex items-center justify-center gap-2">
              <Mail size={16} />
              {t('email_auth')}
            </div>
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${authMethod === 'phone' ? 'bg-white shadow-sm text-amber-900' : 'text-gray-500'}`}
            onClick={() => setAuthMethod('phone')}
          >
            <div className="flex items-center justify-center gap-2">
              <Phone size={16} />
              {t('phone_auth')}
            </div>
          </button>
        </div>
      </div>

      {authMethod === 'email' ? (
        // Email signup form
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-3 px-1">{t('full_name')}</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                required
                type="text" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full py-5 pl-12 pr-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-amber-900 outline-none focus:border-orange-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>
          
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
                  {t('signup')} <ArrowRight size={22} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        // Phone signup form
        <form onSubmit={handlePhoneSignUp} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-3 px-1">{t('full_name')}</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                required
                type="text" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full py-5 pl-12 pr-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-amber-900 outline-none focus:border-orange-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>
          
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
                  Continue with Phone <ArrowRight size={22} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="mt-auto pt-10 flex flex-col items-center opacity-40 grayscale">
         <ShieldCheck className="text-green-600 mb-2" size={32} />
         <p className="text-[10px] font-black uppercase tracking-tighter">100% Secured by MistryLocal Trust</p>
      </div>
    </div>
  );
};

export default SignUp;