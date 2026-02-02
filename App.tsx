
import React, { useState, useEffect, useRef, Component } from 'react';
import { AppRole, Booking, JobStatus, Carpenter } from './types';
import CustomerHome from './views/CustomerHome';
import CarpenterPortal from './views/CarpenterPortal';
import MyBookings from './views/MyBookings';
import CustomerAuth from './views/CustomerAuth';
import CarpenterAuth from './views/CarpenterAuth';
import { MOCK_CARPENTERS } from './constants';
import { translations, Language } from './translations';
import { Home, User, Bell, Briefcase, RefreshCcw, Hammer, ShieldCheck, Star } from 'lucide-react';
import { subscribeToUserBookings, updateBookingStatus as updateBookingStatusFirestore, cancelBooking } from './services/bookingService';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    // Removed _bookingUpdateTimeouts - no longer needed with direct updates
  }
}

const INITIAL_BOOKINGS: Booking[] = [];

// Error Boundary Component
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-red-50">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-600 mb-6">We're sorry, but something went wrong. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: AppRole; name: string; phone: string; uid: string } | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [authRole, setAuthRole] = useState<AppRole | null>(null);
  
  const [activeTab, setActiveTab] = useState('home');
  const [language, setLanguage] = useState<Language>((localStorage.getItem('mistry_lang') as Language) || 'EN');
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);
  
  // Removed gpsInterval - no longer needed with area-based matching

  const t = (key: keyof typeof translations.EN) => translations[language][key] || key;

  useEffect(() => {
    localStorage.setItem('mistry_lang', language);
  }, [language]);

  // Fetch user bookings periodically instead of real-time subscription
  // Optimized for faster booking status updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    const fetchBookings = async () => {
      if (user?.uid) {
        try {
          await subscribeToUserBookings(
            user.uid,
            (bookingsData) => {
              // Convert BookingData to Booking interface
              const convertedBookings = bookingsData.map(b => ({
                id: b.id || '',
                service: b.description,
                mistry: b.assignedCarpenterName || 'Searching...',
                status: b.status,
                time: 'Just now',
                address: 'Customer location',
                lat: b.location.lat,
                lng: b.location.lng,
                price: '₹400',
                isUpcoming: true,
                isRated: false,
                customerName: b.customerName,
                createdAt: b.createdAt?.toDate?.().getTime() || Date.now(),
                mistryId: b.assignedCarpenterId
              }));
              
              // ONLY update if there are actual changes to prevent unnecessary re-renders
              setBookings(prevBookings => {
                // Deep comparison to check if bookings actually changed
                const hasChanges = convertedBookings.length !== prevBookings.length || 
                  convertedBookings.some((newBooking, index) => {
                    const oldBooking = prevBookings[index];
                    return !oldBooking || 
                      newBooking.id !== oldBooking.id || 
                      newBooking.status !== oldBooking.status ||
                      newBooking.mistry !== oldBooking.mistry;
                  });
                
                if (hasChanges) {
                  return convertedBookings;
                }
                return prevBookings; // No changes, return existing array
              });
            },
            (error) => {
              console.error('Booking fetch error:', error);
            }
          );
        } catch (error) {
          console.error('Error fetching bookings:', error);
        }
      }
    };
    
    // Initial fetch
    fetchBookings();
    
    // Set up frequent polling for better responsiveness (every 5 seconds)
    if (user?.uid) {
      intervalId = setInterval(fetchBookings, 5000);
    }
    
    // Cleanup function
    return () => {
      if (intervalId) {
        console.log('🧹 Cleaning up booking polling interval');
        clearInterval(intervalId);
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    // Show auth flow if no user is logged in
    setShowAuth(!user);
    if (!user) {
      setAuthRole(null); // Reset auth role when showing auth flow
    }
  }, [user]);

  // Listen for tab switching events from child components
  useEffect(() => {
    const handleTabSwitch = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };
    
    // Listen for manual booking refresh requests
    const handleRefreshBookings = () => {
      console.log('🔄 Manual booking refresh triggered');
      // Force immediate refresh
      if (user?.uid) {
        subscribeToUserBookings(
          user.uid,
          (bookingsData) => {
            const convertedBookings = bookingsData.map(b => ({
              id: b.id || '',
              service: b.description,
              mistry: b.assignedCarpenterName || 'Searching...',
              status: b.status,
              time: 'Just now',
              address: 'Customer location',
              lat: b.location.lat,
              lng: b.location.lng,
              price: '₹400',
              isUpcoming: true,
              isRated: false,
              customerName: b.customerName,
              createdAt: b.createdAt?.toDate?.().getTime() || Date.now(),
              mistryId: b.assignedCarpenterId
            }));
            
            setBookings(convertedBookings);
          },
          (error) => {
            console.error('Booking fetch error:', error);
          }
        );
      }
    };
    
    window.addEventListener('switchTab', handleTabSwitch as EventListener);
    window.addEventListener('refreshBookings', handleRefreshBookings as EventListener);
    
    return () => {
      window.removeEventListener('switchTab', handleTabSwitch as EventListener);
      window.removeEventListener('refreshBookings', handleRefreshBookings as EventListener);
    };
  }, [user?.uid]);



  const addBooking = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
  };

  const removeBooking = (id: string) => {
    setBookings(prev => {
      const removedBooking = prev.find(b => b.id === id);
      const updatedBookings = prev.filter(b => b.id !== id);
      
      return updatedBookings;
    });
  };

  const cancelBookingRequest = (id: string) => {
    // Immediately update the local state to CANCELLED to prevent any visual flicker
    setBookings(prev => {
      const cancelledBooking = prev.find(b => b.id === id);
      const updatedBookings = prev.map(b => 
        b.id === id ? { ...b, status: JobStatus.CANCELLED } : b
      );
      
      // If the user is a customer and they're cancelling a searching job, we no longer auto-redirect
      // The customer stays on the same page after cancellation
      if (user && user.role === AppRole.CUSTOMER && cancelledBooking && cancelledBooking.status === JobStatus.SEARCHING) {
        // Removed auto-redirection to home tab
      }
      
      return updatedBookings;
    });

    // Update the status in Firestore to CANCELLED
    cancelBooking(id).catch(error => {
      console.error('Error cancelling booking in Firestore:', error);
      // If the Firestore update fails, we might want to revert the local state
      // For now, we'll just log the error
    });
  };

  const updateBookingStatus = (id: string, status: JobStatus, mistryId?: string) => {
    console.log('🔄 updateBookingStatus called:', { id, status, mistryId });
    
    // 🔒 APPLICATION-LEVEL STATUS DUPLICATE PREVENTION 🔒
    // Prevent updating to the same status (avoids repeated writes)
    const currentBooking = bookings.find(b => b.id === id);
    if (currentBooking && currentBooking.status === status) {
      console.log(`⏭️ Skipping update - booking ${id} already has status ${status}`);
      return;
    }
    
    // Prevent rapid successive updates to the same booking
    const lastUpdateTimeKey = `last_update_${id}`;
    const lastUpdateTime = localStorage.getItem(lastUpdateTimeKey);
    const now = Date.now();
    
    if (lastUpdateTime) {
      const timeDiff = now - parseInt(lastUpdateTime);
      if (timeDiff < 2000) { // 2 second cooldown
        console.log(`⏭️ Rate limiting - booking ${id} updated too recently (${timeDiff}ms ago)`);
        return;
      }
    }
    
    // Prevent multiple updates to the same booking simultaneously
    setBookings(prev => {
      const bookingExists = prev.some(b => b.id === id);
      if (!bookingExists) {
        console.warn(`⚠️ Booking ${id} not found in local state`);
        return prev;
      }
      
      const updatedBookings = prev.map(b => {
        if (b.id === id) {
          console.log(`📝 Updating booking ${id}: ${b.status} → ${status}`);
          const update: Partial<Booking> = { status };
          if (mistryId) {
            update.mistryId = mistryId;
            const carp = carpenters.find(c => c.id === mistryId);
            if (carp) update.mistry = carp.name;
          }
          return { ...b, ...update };
        }
        return b;
      });
      
      // Auto-switch to 'jobs' tab when a customer's searching booking gets accepted
      if (user && user.role === AppRole.CUSTOMER) {
        const originalBooking = prev.find(b => b.id === id);
        if (originalBooking && originalBooking.status === JobStatus.SEARCHING && status === JobStatus.ACCEPTED) {
          // Add a small delay for better UX transition
          setTimeout(() => {
            setActiveTab('jobs');
          }, 500);
        }
      }
      
      return updatedBookings;
    });
    
    // Record this update time
    localStorage.setItem(lastUpdateTimeKey, now.toString());
    
    // DIRECT Firestore update - no debouncing to prevent repeated calls
    // Each user action should trigger exactly one Firestore write
    updateBookingStatusFirestore(id, status).then(() => {
      console.log(`✅ Firestore updated successfully for booking ${id} to status ${status}`);
    }).catch(error => {
      console.error(`❌ Error updating Firestore for booking ${id}:`, error);
      
      // CRITICAL: DO NOT retry job status updates automatically
      // This prevents repeated status updates and quota exceeded errors
      // Status updates must ONLY happen from explicit user actions
      console.warn(`⚠️ Status update failed for booking ${id} - NO AUTOMATIC RETRY`);
    });
  };

  const handleRateBooking = (id: string, ratingValue: number, tags: string[]) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, isRated: true } : b));
  };

  const handleLogin = (role: AppRole, identifier: string, name: string, uid: string) => {
    setUser({
      role,
      phone: identifier.includes('@') ? '' : identifier, // If identifier is email, set phone as empty
      name,
      uid: uid
    });
    setShowAuth(false);
    setAuthRole(null); // Reset auth role for next login
  };

  // Removed GPS tracking effect - no longer needed with area-based matching

  // Automatic cancellation of searching bookings after 60 seconds
  useEffect(() => {
    const autoCancelTimeouts = new Map<string, NodeJS.Timeout>();
    
    // Set up auto-cancellation for new searching bookings
    const setupAutoCancellation = (bookingId: string, createdAt: number) => {
      // Clear any existing timeout for this booking
      if (autoCancelTimeouts.has(bookingId)) {
        clearTimeout(autoCancelTimeouts.get(bookingId)!);
        autoCancelTimeouts.delete(bookingId);
      }
      
      // Calculate remaining time (60 seconds total)
      const elapsed = Date.now() - createdAt;
      const remainingTime = Math.max(0, 60000 - elapsed); // 60 seconds = 60000ms
      
      if (remainingTime > 0) {
        console.log(`⏱️ Setting up auto-cancellation for booking ${bookingId} in ${remainingTime}ms`);
        const timeoutId = setTimeout(() => {
          // Check if booking is still searching before cancelling
          const booking = bookings.find(b => b.id === bookingId);
          if (booking && booking.status === JobStatus.SEARCHING) {
            console.log(`⏰ Auto-cancelling booking ${bookingId} after 60 seconds`);
            cancelBookingRequest(bookingId);
          }
          autoCancelTimeouts.delete(bookingId);
        }, remainingTime);
        
        autoCancelTimeouts.set(bookingId, timeoutId);
      }
    };
    
    // Set up auto-cancellation for existing searching bookings
    bookings.forEach(booking => {
      if (booking.status === JobStatus.SEARCHING) {
        setupAutoCancellation(booking.id, booking.createdAt);
      }
    });
    
    // Clean up timeouts on component unmount
    return () => {
      autoCancelTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      autoCancelTimeouts.clear();
      
      // Clean up old localStorage entries
      const now = Date.now();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('last_update_')) {
          const timestamp = parseInt(localStorage.getItem(key) || '0');
          // Remove entries older than 10 minutes
          if (now - timestamp > 600000) {
            localStorage.removeItem(key);
          }
        }
      });
    };
  }, [bookings]);

  return (
    <div className="mobile-container flex flex-col min-h-screen border-x border-gray-100 relative overflow-hidden">
      {showAuth ? (
        authRole === null ? (
          // Enhanced role selection screen
          <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
            <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
              <h1 className="text-5xl font-black text-amber-900 mb-3">Mistry<span className="text-orange-600">Local</span></h1>
              <p className="text-gray-500 font-bold text-lg">Connect skilled professionals with customers</p>
            </div>
            
            <div className="w-full max-w-md space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setAuthRole(AppRole.CUSTOMER)}
                className="w-full p-7 bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 rounded-3xl shadow-lg hover:shadow-2xl transition-all active:scale-95 flex flex-col items-center gap-4 group"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <User className="text-orange-600" size={36} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-amber-900 mb-2 group-hover:text-orange-600 transition-colors">I'm a Customer</h3>
                  <p className="text-base text-gray-600 font-medium max-w-[280px]">Find skilled carpenters for your home projects</p>
                </div>
                <div className="mt-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                  Book Services
                </div>
              </button>
              
              <button 
                onClick={() => setAuthRole(AppRole.CARPENTER)}
                className="w-full p-7 bg-gradient-to-br from-white to-amber-50 border-2 border-amber-200 rounded-3xl shadow-lg hover:shadow-2xl transition-all active:scale-95 flex flex-col items-center gap-4 group"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Hammer className="text-amber-900" size={36} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-amber-900 mb-2 group-hover:text-amber-700 transition-colors">I'm a Mistry</h3>
                  <p className="text-base text-gray-600 font-medium max-w-[280px]">Get hired for carpentry jobs in your area</p>
                </div>
                <div className="mt-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                  Offer Services
                </div>
              </button>
            </div>
            
            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full border border-gray-200">
                <ShieldCheck className="text-green-600" size={20} />
                <p className="text-xs font-black uppercase tracking-tighter text-gray-600">100% Secured by MistryLocal Trust</p>
              </div>
            </div>
          </div>
        ) : authRole === AppRole.CUSTOMER ? (
          <CustomerAuth 
            onLogin={handleLogin}
            language={language}
            setLanguage={setLanguage}
            t={t}
          />
        ) : (
          <CarpenterAuth 
            onLogin={handleLogin}
            language={language}
            setLanguage={setLanguage}
            t={t}
          />
        )
      ) : (
        <>
          <header className="px-5 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h1 className="text-xl font-bold text-amber-900 tracking-tight flex items-center gap-2">
                  Mistry<span className="text-orange-600">Local</span>
                </h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{t('app_subtitle')}</p>
              </div>
              <div className="flex gap-1.5">
                {(['EN', 'HI', 'PA'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`w-7 h-7 rounded-full text-[8px] font-black transition-all flex items-center justify-center ${language === lang ? 'bg-amber-900 text-white' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-24">
            <ErrorBoundary>
              {!user ? (
                <div className="p-10 text-center text-gray-400 font-medium italic">User not authenticated</div>
              ) : user.role === AppRole.CUSTOMER ? (
                activeTab === 'home' ? <CustomerHome onBook={addBooking} onCancel={cancelBookingRequest} onUpdateStatus={updateBookingStatus} carpenters={carpenters} bookings={bookings} t={t} user={user} /> :
                activeTab === 'jobs' ? <MyBookings bookings={bookings} onUpdateStatus={updateBookingStatus} onRateBooking={handleRateBooking} t={t} /> :
                activeTab === 'profile' ? (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8">{t('profile')}</h2>
                    
                    <div className="bg-gradient-to-br from-white to-orange-50/30 border border-orange-100 rounded-[2.5rem] p-8 mb-8 shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <User size={32} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{t('customer_mode')}</p>
                          <p className="text-2xl font-black text-amber-900 leading-tight">{user?.name || 'Guest'}</p>
                          <p className="text-sm font-bold text-gray-400">{user?.phone || ''}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100">
                        <div className="text-center p-3">
                          <p className="text-lg font-black text-amber-900">{bookings.filter(b => b.status === JobStatus.COMPLETED).length}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Fixes Done</p>
                        </div>
                        <div className="text-center p-3 border-l border-gray-100">
                          <p className="text-lg font-black text-orange-600">4.9</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">My Rating</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">


                      <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Account Settings</p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-amber-900 font-bold text-sm">
                            <span>Saved Addresses</span>
                            <RefreshCcw size={16} className="text-gray-300" />
                          </div>
                          <div className="flex items-center justify-between text-amber-900 font-bold text-sm">
                            <span>Payment Methods</span>
                            <RefreshCcw size={16} className="text-gray-300" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 flex flex-col items-center opacity-30 grayscale">
                      <ShieldCheck className="text-green-600 mb-2" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-tighter">Verified by MistryLocal Trust</p>
                    </div>
                  </div>
                ) : <div className="p-10 text-center text-gray-400 font-medium italic">Feature coming soon...</div>
              ) : (
                activeTab === 'home' ? <CarpenterPortal bookings={bookings} onUpdateStatus={updateBookingStatus} t={t} user={user} /> :
                activeTab === 'jobs' ? (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8">My Bookings</h2>
                    <div className="p-10 text-center text-gray-400 font-medium italic">
                      View your accepted jobs and track their progress
                    </div>
                  </div>
                ) : activeTab === 'alerts' ? (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8">Job Alerts</h2>
                    <div className="p-10 text-center text-gray-400 font-medium italic">
                      Notifications about new job opportunities
                    </div>
                  </div>
                ) : activeTab === 'profile' ? (
                   <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8">{t('profile')}</h2>
                    
                    <div className="bg-white border-2 border-orange-50 rounded-[2.5rem] p-8 mb-8 shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                          <img src="https://picsum.photos/seed/carp3/200/200" className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-100" />
                          <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm"></div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{t('carpenter_mode')}</p>
                          <p className="text-2xl font-black text-amber-900 leading-tight">{user?.name || 'Carpenter Profile'}</p>
                          <p className="text-sm font-bold text-gray-400">ID: ML-9920</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100">
                        <div className="text-center p-3">
                          <p className="text-lg font-black text-amber-900">142</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Jobs Completed</p>
                        </div>
                        <div className="text-center p-3 border-l border-gray-100">
                          <p className="text-lg font-black text-orange-600">4.9</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Rating</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">


                      <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Earnings & Wallet</p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-amber-900 font-bold text-sm">
                            <span>Weekly Earnings</span>
                            <span className="text-green-600">₹8,450</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-900 font-bold text-sm">
                            <span>Current Balance</span>
                            <span className="text-amber-900">₹1,200</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 flex flex-col items-center opacity-30 grayscale">
                      <Star className="text-orange-600 mb-2" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-tighter">Verified Top Professional</p>
                    </div>
                  </div>
                ) : <div className="p-10 text-center text-gray-400 font-medium italic">Feature coming soon...</div>
              )}
            </ErrorBoundary>
          </main>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-orange-600' : 'text-gray-400'}`}>
          <Home size={22} />
          <span className="text-[10px] font-medium">{t('home')}</span>
        </button>
        <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'jobs' ? 'text-orange-600' : 'text-gray-400'}`}>
          <Briefcase size={22} />
          <span className="text-[10px] font-medium">{user && user.role === AppRole.CUSTOMER ? t('bookings') : 'My Jobs'}</span>
        </button>
        <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'alerts' ? 'text-orange-600' : 'text-gray-400'}`}>
          <div className="relative">
            <Bell size={22} />
            {user && user.role === AppRole.CARPENTER && bookings.some(b => b.status === JobStatus.SEARCHING) && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-600 rounded-full border-2 border-white"></div>
            )}
          </div>
          <span className="text-[10px] font-medium">{t('alerts')}</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-orange-600' : 'text-gray-400'}`}>
          <User size={22} />
          <span className="text-[10px] font-medium">{t('profile')}</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
