
import React, { useState, useEffect, useRef, Component } from 'react';
import { generateFCMToken } from "./firebase";
import { WalletProvider } from './contexts/WalletContext';
import { AppRole, Booking, JobStatus, Carpenter, Customer } from './types';
import CustomerHome from './views/CustomerHome';
import CarpenterPortal from './views/CarpenterPortal';
import MyBookings from './views/MyBookings';
import CustomerAuth from './views/CustomerAuth';
import CarpenterAuth from './views/CarpenterAuth';
import CarpenterProfileEdit from './views/CarpenterProfileEdit';
import CustomerProfileEdit from './views/CustomerProfileEdit';
import AdminPanel from './views/AdminPanel';
import { MOCK_CARPENTERS } from './constants';
import { translations, Language } from './translations';
import { Home, User, Bell, Briefcase, RefreshCcw, Hammer, ShieldCheck, Star, Wrench, Zap, Shield } from 'lucide-react';
import { subscribeToUserBookings, updateBookingStatus as updateBookingStatusFirestore, cancelBooking, releaseCarpenterJob, startBookingJob } from './services/bookingService';
import { applyMinimumPrice } from './services/priceService';
import { auth } from './firebase'; // Import auth
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import { getMessaging, onMessage } from 'firebase/messaging'; // Add messaging imports

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    // Handle notification click data
    notificationData?: any;
  }
}

// In-memory map to track active auto-cancel timers
const autoCancelTimers = new Map<string, NodeJS.Timeout>();

const INITIAL_BOOKINGS: Booking[] = [];

// Error boundary temporarily removed due to TypeScript issues

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: AppRole; name: string; phone: string; uid: string } | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(true); // Start with auth screen
  const [authRole, setAuthRole] = useState<AppRole | null>(null);
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null); // Track selected profession
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false); // Show full admin panel
  
  // Safe auth-based visibility flag
  const isLoggedIn = !!user;
  
  const [activeTab, setActiveTab] = useState('home');
  const [isAdminMode, setIsAdminMode] = useState(false); // Admin panel toggle
  
  // Debug logging for admin mode
  useEffect(() => {
    if(process.env.NODE_ENV === 'development') console.log('isAdminMode changed to:', isAdminMode);
  }, [isAdminMode]);
  const [language, setLanguage] = useState<Language>((localStorage.getItem('mistry_lang') as Language) || 'EN');
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);
  const [carpenterProfile, setCarpenterProfile] = useState<Carpenter | null>(null);
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  
  // Ref to prevent duplicate Firestore listeners
  const bookingListenerRef = useRef<(() => void) | null>(null);
  
  // In-memory set to track processed booking IDs
  const processedBookingIds = new Set<string>();

  // Check URL for admin panel parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setShowAdminPanel(true);
    }
  }, []);

  // FCM startup trigger
  useEffect(() => {
    generateFCMToken();
  }, []);

  // Admin mode toggle (press Ctrl+A to open admin page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open admin page with Ctrl+A
      if (e.key === 'a' && e.ctrlKey && !e.shiftKey && !e.altKey) {
        if(process.env.NODE_ENV === 'development') console.log('Opening admin page with Ctrl+A!');
        // Open in new window with full web dimensions
        const adminUrl = window.location.origin + window.location.pathname + '?admin=true';
        const adminWindow = window.open(adminUrl, '_blank', 'width=1200,height=800,resizable=yes,scrollbars=yes');
        if (adminWindow) {
          adminWindow.focus();
        }
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Import Firestore functions locally to avoid circular dependencies
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          // Fetch user document from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              role: userData.role as AppRole,
              name: userData.name || "User",
              phone: userData.phone || firebaseUser.phoneNumber || "",
              uid: firebaseUser.uid
            });
            
            // For carpenters, ensure welcome credit is given if not already received
            if (userData.role === AppRole.CARPENTER) {
              try {
                const { giveWelcomeCreditIfFirstLogin } = await import('./services/walletService');
                const { getWorkerProfessionSafe } = await import('./services/professionService');
                // Get the correct profession for the worker from their profile or localStorage
                const profession = await getWorkerProfessionSafe(firebaseUser.uid) || localStorage.getItem('selectedProfession') || 'carpenter';
                await giveWelcomeCreditIfFirstLogin(firebaseUser.uid, profession);
              } catch (error) {
                console.error('Failed to give welcome credit on auth state change:', error);
              }
            }
            
            setShowAuth(false); // Hide auth screen when logged in
          } else {
            // User exists in Firebase Auth but not in Firestore
            // Show auth screen to complete profile
            setShowAuth(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setShowAuth(true); // Show auth screen on error
        }
      } else {
        // User is not authenticated
        setUser(null);
        setShowAuth(true); // Show auth screen
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  // Setup foreground push notifications
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupForegroundNotifications = async () => {
      try {
        const { getMessaging, onMessage } = await import('firebase/messaging');
        const messaging = getMessaging();
        
        unsubscribe = onMessage(messaging, (payload) => {
          if(process.env.NODE_ENV === 'development') console.log('🔔 Foreground message received:', payload);
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'New Job', {
              body: payload.notification?.body || 'Tap to open app',
              icon: '/icons/icon-192.png'
            });
          }
        });
      } catch (error) {
        console.error('❌ Failed to setup foreground notifications:', error);
      }
    };
    
    setupForegroundNotifications();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Handle notification click from service worker
  useEffect(() => {
    // Listen for messages from service worker
    const handleNotificationClick = (event: MessageEvent) => {
      if(process.env.NODE_ENV === 'development') console.log('📬 App received message from SW:', event.data);
      
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        const data = event.data.data;
        if(process.env.NODE_ENV === 'development') console.log('📬 Notification clicked with data:', data);
        
        // Store the notification data for the app to use
        window.notificationData = data;
        
        // If there's a booking ID, trigger a refresh
        if (data?.bookingId) {
          window.dispatchEvent(new CustomEvent('refreshBookings'));
        }
        
        // If user should navigate to specific tab
        if (data?.tab) {
          window.dispatchEvent(new CustomEvent('switchTab', { detail: data.tab }));
        }
      }
    };
    
    // Add event listener for service worker messages
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleNotificationClick);
    }
    
    // Check if app was opened from notification (URL params)
    const urlParams = new URLSearchParams(window.location.search);
    const notificationData = urlParams.get('notification_data');
    if (notificationData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(notificationData));
        window.notificationData = parsed;
        console.log('📬 App opened from notification:', parsed);
      } catch (e) {
        console.error('Failed to parse notification data:', e);
      }
    }
    
    return () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleNotificationClick);
      }
    };
  }, []);
  
  // Periodic FCM token validation for workers
  useEffect(() => {
    if (!user || user.role !== AppRole.CARPENTER) return;
    
    let validationInterval: NodeJS.Timeout;
    
    const validateTokenPeriodically = async () => {
      try {
        const { fcmTokenManager } = await import('./src/services/fcmTokenManager');
        await fcmTokenManager.getToken(user.uid);
      } catch (error) {
        console.error('❌ Periodic token validation failed:', error);
      }
    };
    
    // Validate token immediately on login
    validateTokenPeriodically();
    
    // Set up periodic validation (every 6 hours)
    validationInterval = setInterval(validateTokenPeriodically, 6 * 60 * 60 * 1000);
    
    return () => {
      if (validationInterval) {
        clearInterval(validationInterval);
      }
    };
  }, [user]);
  
  // Fetch carpenter profile for carpenter users
  useEffect(() => {
    const fetchCarpenterProfile = async () => {
      if (user && user.role === AppRole.CARPENTER && user.uid) {
        try {
          // Import Firestore functions locally to avoid circular dependencies
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          const carpenterDoc = await getDoc(doc(db, 'carpenters', user.uid));
          if (carpenterDoc.exists()) {
            const data = carpenterDoc.data();
            // Map the fetched data to Carpenter interface
            const profile: Carpenter = {
              id: user.uid,
              name: data.name || user.name || 'Carpenter User',
              phone: data.phone || user.phone || '',
              rating: typeof data.rating === 'number' ? data.rating : 0,
              ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
              jobsCompleted: typeof data.jobsCompleted === 'number' ? data.jobsCompleted : 0,
              verified: Boolean(data.verified),
              distance: '0.0 km',
              specialties: Array.isArray(data.services) ? data.services : [],
              acceptsSmallJobs: true,
              image: data.profilePhotoUrl || 'https://picsum.photos/seed/carp3/200/200',
              lat: typeof data.location?.lat === 'number' ? data.location.lat : 0,
              lng: typeof data.location?.lng === 'number' ? data.location.lng : 0,
              trustScore: typeof data.trustScore === 'number' ? data.trustScore : 0,
              // Professional details (may not exist)
              alternateMobileNumber: typeof data.alternateMobileNumber === 'string' ? data.alternateMobileNumber : undefined,
              address: data.address,
              addressProof: data.addressProof,
              profilePhotoUrl: typeof data.profilePhotoUrl === 'string' ? data.profilePhotoUrl : undefined,
              // Earnings fields (may not exist in current data)
              weeklyEarnings: typeof data.weeklyEarnings === 'number' ? data.weeklyEarnings : 0,
              // Timestamps (may not exist)
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
            setCarpenterProfile(profile);
          } else {
            // If no profile exists, create a basic one
            setCarpenterProfile({
              id: user.uid,
              name: user.name || 'Carpenter User',
              phone: user.phone || '',
              rating: 0,
              ratingCount: 0,
              jobsCompleted: 0,
              verified: false,
              distance: '0.0 km',
              specialties: [],
              acceptsSmallJobs: true,
              image: 'https://picsum.photos/seed/carp3/200/200',
              lat: 0,
              lng: 0,
              trustScore: 0,
              weeklyEarnings: 0
            });
          }
        } catch (error) {
          console.error('Error fetching carpenter profile:', error);
        }
      } else {
        // Clear profile when not a carpenter
        setCarpenterProfile(null);
      }
    };

    fetchCarpenterProfile();
  }, [user]);

  // Fetch customer profile for customer users
  useEffect(() => {
    const fetchCustomerProfile = async () => {
      if (user && user.role === AppRole.CUSTOMER && user.uid) {
        try {
          // Import Firestore functions locally to avoid circular dependencies
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          const customerDoc = await getDoc(doc(db, 'customers', user.uid));
          if (customerDoc.exists()) {
            const data = customerDoc.data();
            // Map the fetched data to Customer interface
            const profile: Customer = {
              id: user.uid,
              name: data.name || user.name || 'Customer User',
              phone: data.phone || user.phone || '',
              email: typeof data.email === 'string' ? data.email : undefined,
              address: data.address,
              profilePhotoUrl: typeof data.profilePhotoUrl === 'string' ? data.profilePhotoUrl : undefined,
              registrationDate: data.registrationDate,
              lastActive: data.lastActive,
              totalBookings: typeof data.totalBookings === 'number' ? data.totalBookings : 0,
              rating: typeof data.rating === 'number' ? data.rating : 0
            };
            setCustomerProfile(profile);
          } else {
            // If no profile exists, create a basic one
            setCustomerProfile({
              id: user.uid,
              name: user.name || 'Customer User',
              phone: user.phone || '',
              totalBookings: 0,
              rating: 0
            });
          }
        } catch (error) {
          console.error('Error fetching customer profile:', error);
        }
      } else {
        // Clear profile when not a customer
        setCustomerProfile(null);
      }
    };

    fetchCustomerProfile();
  }, [user]);

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
          const fetchBookingsWithPhone = async (bookingsData) => {
            const convertedBookings = await Promise.all(bookingsData.map(async (b) => {
              let mistryPhone = '';
              
              // Get carpenter phone if assigned
              if (b.assignedCarpenterId) {
                try {
                  const { doc, getDoc } = await import('firebase/firestore');
                  const { db } = await import('./firebase');
                  
                  const carpenterDoc = await getDoc(doc(db, 'carpenters', b.assignedCarpenterId));
                  if (carpenterDoc.exists()) {
                    const carpenterData = carpenterDoc.data();
                    mistryPhone = carpenterData.phone || '';
                  }
                } catch (error) {
                  console.error('Error fetching carpenter phone:', error);
                }
              }
              
              // Calculate price based on service type
              const serviceType = b.serviceType || 'carpenter';
              // For now, we'll use a default price since we don't have the actual service details stored
              // In a real scenario, you might want to store the calculated price in the booking
              const calculatedPrice = applyMinimumPrice(serviceType, 400); // Default base price
              
              return {
                id: b.id || '',
                service: b.description,
                mistry: b.assignedCarpenterName || 'Searching...',
                status: b.status,
                time: 'Just now',
                address: 'Customer location',
                lat: b.location.lat,
                lng: b.location.lng,
                price: `₹${calculatedPrice}`,
                isUpcoming: true,
                isRated: b.ratingSubmitted || false,
                customerName: b.customerName,
                customerPhone: b.customerPhone,
                createdAt: b.createdAt?.toDate?.().getTime() || Date.now(),
                mistryId: b.assignedCarpenterId,
                mistryPhone: mistryPhone,
                // Rating submission tracking
                ratingSubmitted: b.ratingSubmitted || false,
                ratingSubmittedAt: b.ratingSubmittedAt?.toDate?.().getTime() || undefined,
                ratingValue: b.ratingValue,
                ratingTags: b.ratingTags || []
              };
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
                    newBooking.mistry !== oldBooking.mistry ||
                    newBooking.mistryId !== oldBooking.mistryId ||
                    newBooking.customerName !== oldBooking.customerName ||
                    newBooking.createdAt !== oldBooking.createdAt;
                });
              
              if (hasChanges) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`🔄 Bookings updated (${prevBookings.length} → ${convertedBookings.length}), changes detected`);
                }
                return convertedBookings;
              }
              if (process.env.NODE_ENV === 'development') {
                  console.log(`✅ Bookings unchanged, keeping existing array (${prevBookings.length} items)`);
                }
              return prevBookings; // No changes, return existing array
            });
          };
          
          await subscribeToUserBookings(
            user.uid,
            async (bookingsData) => {
              await fetchBookingsWithPhone(bookingsData);
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
        if (process.env.NODE_ENV === 'development') {
          console.log('🧹 Cleaning up booking polling interval');
        }
        clearInterval(intervalId);
      }
    };
  }, [user?.uid]); // Only run when user UID changes
  
  // Update carpenter profile stats based on completed bookings
  useEffect(() => {
    if (user?.role === AppRole.CARPENTER && user.uid && carpenterProfile) {
      // Calculate jobs completed and rating based on bookings
      const completedBookings = bookings.filter(b => 
        b.status === JobStatus.COMPLETED && b.mistryId === user.uid
      );
      
      const jobsCompleted = completedBookings.length;
      
      // Calculate average rating from completed bookings that have been rated
      const ratedBookings = completedBookings.filter(b => b.ratingSubmitted);
      let avgRating = 0;
      let ratingCount = ratedBookings.length;
      
      if (ratedBookings.length > 0) {
        const totalRating = ratedBookings.reduce((sum, booking) => sum + (booking.ratingValue || 0), 0);
        avgRating = totalRating / ratedBookings.length;
      }
      
      // Update local profile state with calculated values
      setCarpenterProfile(prev => {
        if (!prev) return prev;
        
        // Only update if values have changed to prevent unnecessary re-renders
        if (prev.jobsCompleted === jobsCompleted && 
            Math.abs((prev.rating || 0) - avgRating) < 0.01 &&
            prev.ratingCount === ratingCount) {
          return prev;
        }
        
        const updatedProfile = {
          ...prev,
          jobsCompleted,
          rating: avgRating,
          ratingCount
        };
        
        // Also update the values in Firestore to persist them
        const updateFirestoreStats = async () => {
          try {
            const { updateCarpenterProfile } = await import('./services/bookingService');
            await updateCarpenterProfile(user.uid, {
              jobsCompleted,
              rating: avgRating,
              ratingCount
            });
            
            // Update trust score based on new stats
            const { recalculateTrustScore } = await import('./services/trustScoreService');
            const { getWorkerProfessionSafe } = await import('./services/professionService');
            const profession = await getWorkerProfessionSafe(user.uid);
            await recalculateTrustScore(user.uid, profession);
          } catch (error) {
            console.error('Error updating carpenter stats in Firestore:', error);
          }
        };
        
        // Update Firestore in the background
        updateFirestoreStats();
        
        return updatedProfile;
      });
    }
  }, [bookings, user, carpenterProfile]);

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
    const handleRefreshBookings = async () => {
      console.log('🔄 Manual booking refresh triggered');
      // Force immediate refresh
      if (user?.uid) {
        const fetchBookingsWithPhone = async (bookingsData) => {
          const convertedBookings = await Promise.all(bookingsData.map(async (b) => {
            let mistryPhone = '';
            
            // Debug logging for verification code tracking
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 BOOKING CONVERSION DEBUG:', {
                id: b.id,
                customerName: b.customerName,
                status: b.status,
                sourceHasVerificationCode: !!b.verificationCode,
                sourceVerificationCode: b.verificationCode,
                sourceIsVerified: b.isVerified,
                createdAt: b.createdAt?.toDate?.().getTime() || Date.now()
              });
            }
            
            // Get carpenter phone if assigned
            if (b.assignedCarpenterId) {
              try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('./firebase');
                
                const carpenterDoc = await getDoc(doc(db, 'carpenters', b.assignedCarpenterId));
                if (carpenterDoc.exists()) {
                  const carpenterData = carpenterDoc.data();
                  mistryPhone = carpenterData.phone || '';
                }
              } catch (error) {
                console.error('Error fetching carpenter phone:', error);
              }
            }
            
            const convertedBooking = {
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
              isRated: b.ratingSubmitted || false,
              customerName: b.customerName,
              customerPhone: b.customerPhone,
              createdAt: b.createdAt?.toDate?.().getTime() || Date.now(),
              mistryId: b.assignedCarpenterId,
              mistryPhone: mistryPhone,
              // Rating submission tracking
              ratingSubmitted: b.ratingSubmitted || false,
              ratingSubmittedAt: b.ratingSubmittedAt?.toDate?.().getTime() || undefined,
              ratingValue: b.ratingValue,
              ratingTags: b.ratingTags || [],
              // Verification code system
              verificationCode: b.verificationCode,
              isVerified: b.isVerified || false
            };
            
            // Verify the converted booking has verification code
            if (process.env.NODE_ENV === 'development' && b.status === JobStatus.ACCEPTED) {
              console.log('✅ CONVERTED BOOKING VERIFICATION:', {
                id: convertedBooking.id,
                customerName: convertedBooking.customerName,
                status: convertedBooking.status,
                convertedHasVerificationCode: !!convertedBooking.verificationCode,
                convertedVerificationCode: convertedBooking.verificationCode,
                convertedIsVerified: convertedBooking.isVerified
              });
            }
            
            return convertedBooking;
          }));
          
          setBookings(convertedBookings);
        };
        
        await subscribeToUserBookings(
          user.uid,
          async (bookingsData) => {
            await fetchBookingsWithPhone(bookingsData);
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

  const handleRateBooking = async (id: string, ratingValue: number, tags: string[]) => {
    try {
      // Update local state immediately for responsive UI
      setBookings(prev => prev.map(b => b.id === id ? { 
        ...b, 
        isRated: true,
        ratingSubmitted: true,
        ratingValue: ratingValue,
        ratingTags: tags
      } : b));
      
      // Update Firestore with rating submission flag
      const { submitBookingRating } = await import('./services/bookingService');
      await submitBookingRating(id, ratingValue, tags);
      
      console.log(`✅ Rating submitted successfully for booking ${id}`);
      
      // Trigger a refresh to ensure UI updates properly
      window.dispatchEvent(new CustomEvent('refreshBookings'));
    } catch (error) {
      console.error(`❌ Error submitting rating for booking ${id}:`, error);
      // Revert local state on error
      setBookings(prev => prev.map(b => b.id === id ? { ...b, isRated: false } : b));
      throw error;
    }
  };

  const handleLogin = async (role: AppRole, identifier: string, name: string, uid: string) => {
    // Auto-set profession for workers on first login
    if (role === AppRole.CARPENTER && uid) {
      try {
        // Import profession service dynamically to avoid circular dependencies
        const { autoSetWorkerProfession } = await import('./services/professionService');
        
        // Get stored profession from localStorage as fallback
        const storedProfession = localStorage.getItem('selectedProfession');
        
        // Auto-set the profession (will only write if needed)
        await autoSetWorkerProfession(uid, role, selectedProfession || undefined, storedProfession || undefined);
        
        // Store the selected profession for future reference
        if (selectedProfession) {
          localStorage.setItem('selectedProfession', selectedProfession);
        }
        
        // Check and give welcome credit if not already given
        const { giveWelcomeCreditIfFirstLogin } = await import('./services/walletService');
        try {
          // Use the selected profession, or fall back to stored profession or default to 'carpenter'
          const profession = selectedProfession || storedProfession || 'carpenter';
          await giveWelcomeCreditIfFirstLogin(uid, profession);
        } catch (error) {
          console.error('Failed to give welcome credit on login:', error);
        }
      } catch (error) {
        console.error('Error auto-setting worker profession:', error);
        // Continue with login even if profession setting fails
      }
    }
    
    setUser({
      role,
      phone: identifier.includes('@') ? '' : identifier, // If identifier is email, set phone as empty
      name,
      uid: uid
    });
    setShowAuth(false);
    setAuthRole(null); // Reset auth role for next login
    setSelectedProfession(null); // Clear profession selection
  };

  // Removed GPS tracking effect - no longer needed with area-based matching

  // AUTO-CANCELLATION TIMER MAP - One timer per booking ID
  const autoCancelTimers = new Map<string, NodeJS.Timeout>();
  
  // Auto-cancellation logic with two-phase timing
  useEffect(() => {
    const now = Date.now();
    
    bookings.forEach(booking => {
      const bookingId = booking.id;
      
      // PHASE 1: SEARCHING -> 60 second timer
      if (booking.status === JobStatus.SEARCHING) {
        if (!autoCancelTimers.has(bookingId)) {
          // Calculate remaining time (60 seconds = 60000ms)
          const elapsed = now - booking.createdAt;
          const remainingTime = Math.max(0, 60000 - elapsed);
          
          if (remainingTime > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`⏱️ SEARCHING: Setting 60s auto-cancel timer for ${bookingId} (${remainingTime}ms left)`);
            }
            
            const timeoutId = setTimeout(() => {
              const currentBooking = bookings.find(b => b.id === bookingId);
              if (currentBooking?.status === JobStatus.SEARCHING) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`⏰ SEARCHING TIMEOUT: Auto-cancelling ${bookingId} after 60 seconds`);
                }
                cancelBookingRequest(bookingId);
              }
              autoCancelTimers.delete(bookingId);
            }, remainingTime);
            
            autoCancelTimers.set(bookingId, timeoutId);
          }
        }
      }
      
      // PHASE 2: ACCEPTED -> 10 minute timer for carpenter action
      else if (booking.status === JobStatus.ACCEPTED) {
        // Clear SEARCHING timer if exists
        if (autoCancelTimers.has(bookingId)) {
          const existingTimer = autoCancelTimers.get(bookingId);
          if (existingTimer) clearTimeout(existingTimer);
          autoCancelTimers.delete(bookingId);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Cleared SEARCHING timer for ${bookingId} (now ACCEPTED)`);
          }
        }
        
        // Start 10-minute inactivity timer
        if (!autoCancelTimers.has(bookingId)) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ ACCEPTED: Setting 10min activity timer for ${bookingId}`);
          }
          
          const timeoutId = setTimeout(() => {
            const currentBooking = bookings.find(b => b.id === bookingId);
            if (currentBooking?.status === JobStatus.ACCEPTED) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`⏰ ACCEPTED TIMEOUT: Auto-cancelling ${bookingId} - carpenter inactive for 10 minutes`);
              }
              cancelBookingRequest(bookingId);
            }
            autoCancelTimers.delete(bookingId);
          }, 600000); // 10 minutes = 600000ms
          
          autoCancelTimers.set(bookingId, timeoutId);
        }
      }
      
      // PHASE 3: ON_THE_WAY and later -> Clear all timers permanently
      else if (booking.status === JobStatus.ON_THE_WAY || 
               booking.status === JobStatus.ARRIVED || 
               booking.status === JobStatus.WORK_IN_PROGRESS || 
               booking.status === JobStatus.COMPLETED) {
        
        if (autoCancelTimers.has(bookingId)) {
          const timer = autoCancelTimers.get(bookingId);
          if (timer) clearTimeout(timer);
          autoCancelTimers.delete(bookingId);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Permanently cleared all timers for ${bookingId} (status: ${booking.status})`);
          }
        }
      }
    });
    
    // Cleanup function - called on effect re-run or unmount
    return () => {
      // Clear all remaining timers
      autoCancelTimers.forEach((timer, bookingId) => {
        clearTimeout(timer);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🧹 Cleanup: Cleared timer for ${bookingId}`);
        }
      });
      autoCancelTimers.clear();
    };
  }, [bookings]); // Only re-run when bookings change

  if (showAdminPanel) {
    return (
      <div className="w-screen h-screen bg-gray-50">
        <AdminPanel 
          t={{ 
            admin_dashboard: 'Admin Dashboard', 
            all_customers: 'All Customers', 
            total_workers: 'Total Workers', 
            no_data: 'No data',
            carpenters: 'Carpenters',
            plumbers: 'Plumbers',
            electricians: 'Electricians'
          }} 
          fetchRealData={true}
        />
      </div>
    );
  }

  return (
    <WalletProvider userId={user?.uid}>
    <div className="mobile-container flex flex-col min-h-screen border-x border-gray-100 relative overflow-hidden">
      {showAuth ? (
        authRole === null ? (
          // Enhanced role selection screen with profession selection
          <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 relative overflow-hidden">
            {/* Floating decorative elements */}
            <div className="absolute top-20 left-10 w-4 h-4 bg-orange-200 rounded-full float-animation opacity-60"></div>
            <div className="absolute top-40 right-16 w-3 h-3 bg-amber-200 rounded-full float-animation opacity-40 delay-1000"></div>
            <div className="absolute bottom-32 left-20 w-5 h-5 bg-orange-300 rounded-full float-animation opacity-50 delay-2000"></div>
            
            <div className="text-center mb-10 animate-in fade-in-up slide-in-from-bottom-4 duration-700 relative z-10">
              <div className="mb-6 hover-lift inline-block">
                <h1 className="text-5xl font-black text-amber-900 mb-3 drop-shadow-sm">Mistry<span className="text-orange-600">Local</span></h1>
              </div>
              <p className="text-gray-500 font-bold text-lg max-w-md mx-auto">Connect skilled professionals with customers</p>
            </div>
            
            {/* Customer Option */}
            <div className="w-full max-w-md space-y-5 animate-in fade-in-up slide-in-from-bottom-4 duration-700 delay-200 relative z-10">
              <button 
                onClick={() => {
                  setSelectedProfession(null); // Clear profession selection
                  setAuthRole(AppRole.CUSTOMER);
                }}
                className="w-full p-7 bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 rounded-3xl shadow-lg hover:shadow-2xl transition-all active:scale-95 flex flex-col items-center gap-4 group card-hover"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 hover-glow">
                  <User className="text-orange-600" size={36} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-amber-900 mb-2 group-hover:text-orange-600 transition-colors">I'm a Customer</h3>
                  <p className="text-base text-gray-600 font-medium max-w-[280px]">Find skilled professionals for your home projects</p>
                </div>
                <div className="mt-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 rounded-full text-xs font-bold shadow-sm">
                  Book Services
                </div>
              </button>
              
              {/* Worker Profession Selection */}
              <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 shadow-lg">
                <h3 className="text-xl font-black text-amber-900 mb-4 text-center">I'm a Professional</h3>
                <p className="text-gray-600 font-medium text-center mb-6 text-sm">Select your profession to get hired</p>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setSelectedProfession('carpenter');
                      setAuthRole(AppRole.CARPENTER);
                    }}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${
                      selectedProfession === 'carpenter' 
                        ? 'bg-amber-100 border-amber-500 shadow-md scale-105' 
                        : 'bg-gray-50 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    <Hammer className={`${
                      selectedProfession === 'carpenter' ? 'text-amber-700' : 'text-amber-600'
                    }`} size={24} />
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      selectedProfession === 'carpenter' ? 'text-amber-900' : 'text-gray-700'
                    }`}>Carpenter</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedProfession('plumber');
                      setAuthRole(AppRole.CARPENTER);
                    }}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${
                      selectedProfession === 'plumber' 
                        ? 'bg-blue-100 border-blue-500 shadow-md scale-105' 
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Wrench className={`${
                      selectedProfession === 'plumber' ? 'text-blue-700' : 'text-blue-600'
                    }`} size={24} />
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      selectedProfession === 'plumber' ? 'text-blue-900' : 'text-gray-700'
                    }`}>Plumber</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedProfession('electrician');
                      setAuthRole(AppRole.CARPENTER);
                    }}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${
                      selectedProfession === 'electrician' 
                        ? 'bg-purple-100 border-purple-500 shadow-md scale-105' 
                        : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <Zap className={`${
                      selectedProfession === 'electrician' ? 'text-purple-700' : 'text-purple-600'
                    }`} size={24} />
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      selectedProfession === 'electrician' ? 'text-purple-900' : 'text-gray-700'
                    }`}>Electrician</span>
                  </button>
                </div>
                
                {selectedProfession && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-amber-800 text-sm font-bold text-center">
                      Selected: {selectedProfession.charAt(0).toUpperCase() + selectedProfession.slice(1)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-12 text-center animate-in fade-in-up duration-700 delay-500 relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-full border border-gray-200 shadow-md hover-lift">
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
            selectedProfession={selectedProfession || 'carpenter'}
          />
        )
      ) : (
        <>
          <header className="px-5 py-4 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h1 className="text-xl font-bold text-amber-900 tracking-tight flex items-center gap-2 hover-lift">
                  Mistry<span className="text-orange-600">Local</span>
                </h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">{t('app_subtitle')}</p>
              </div>
              <div className="flex gap-1.5">
                {(['EN', 'HI', 'PA'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`w-7 h-7 rounded-full text-[8px] font-black transition-all flex items-center justify-center hover:scale-110 ${language === lang ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-24">
              {!user ? (
                <div className="p-10 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400 font-medium italic">Loading your profile...</p>
                </div>
              ) : user.role === AppRole.CUSTOMER ? (
                isAdminMode ? (
                  <AdminPanel t={t} />
                ) : activeTab === 'home' ? <CustomerHome onBook={addBooking} onCancel={cancelBookingRequest} onUpdateStatus={updateBookingStatus} carpenters={carpenters} bookings={bookings} t={t} user={user} /> :
                activeTab === 'jobs' ? <MyBookings bookings={bookings} onUpdateStatus={updateBookingStatus} onRateBooking={handleRateBooking} t={t} user={user} /> :
                activeTab === 'profile' ? (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8">{t('profile')}</h2>
                    
                    <CustomerProfileEdit 
                      customerProfile={customerProfile}
                      user={user}
                      onSaveProfile={async (updatedProfile) => {
                        // Save profile to Firestore
                        try {
                          const { updateCustomerProfile } = await import('./services/bookingService');
                          await updateCustomerProfile(user!.uid, updatedProfile as any);
                          
                          // Update local state
                          setCustomerProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
                        } catch (error) {
                          console.error('Error saving customer profile:', error);
                          throw error; // Re-throw to handle in the component
                        }
                      }}
                      onCancel={() => {}}
                      t={t}
                    />
                  </div>
                ) : (
                  <div className="p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mb-4">
                      <Star className="text-orange-600" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-amber-900 mb-2">Coming Soon</h3>
                    <p className="text-gray-400 font-medium max-w-xs">Exciting new features are on their way!</p>
                  </div>
                )
              ) : (
                isAdminMode ? (
                  <AdminPanel t={t} />
                ) : activeTab === 'home' ? <CarpenterPortal bookings={bookings} onUpdateStatus={updateBookingStatus} t={t} user={user} /> :
                activeTab === 'jobs' ? (
                  <MyBookings bookings={bookings} onUpdateStatus={updateBookingStatus} t={t} user={user} />
                ) : activeTab === 'alerts' ? (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8 flex items-center gap-3">
                      <Bell className="text-orange-600" size={32} />
                      Job Alerts
                    </h2>
                    <div className="p-10 text-center flex flex-col items-center justify-center min-h-[200px] bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl border border-orange-100">
                      <Bell className="text-orange-400 mb-4" size={48} />
                      <h3 className="text-lg font-black text-amber-900 mb-2">Stay Tuned</h3>
                      <p className="text-gray-500 font-medium max-w-xs">Get notified about new job opportunities in your area</p>
                    </div>
                  </div>
                ) : activeTab === 'profile' ? (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-black text-amber-900 mb-8">{t('profile')}</h2>
                    
                    <CarpenterProfileEdit 
                      carpenterProfile={carpenterProfile}
                      user={user}
                      onSaveProfile={async (updatedProfile) => {
                        // Save profile to Firestore
                        try {
                          const { updateCarpenterProfile } = await import('./services/bookingService');
                          await updateCarpenterProfile(user!.uid, updatedProfile as any);
                          
                          // Update local state
                          setCarpenterProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
                        } catch (error) {
                          console.error('Error saving profile:', error);
                          throw error; // Re-throw to handle in the component
                        }
                      }}
                      onCancel={() => {}}
                      t={t}
                    />
                  </div>
                ) : (
                  <div className="p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-4">
                      <Star className="text-amber-600" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-amber-900 mb-2">Coming Soon</h3>
                    <p className="text-gray-400 font-medium max-w-xs">New features for mistry professionals arriving soon!</p>
                  </div>
                )
              )}
          </main>
        </>
      )}

      {isLoggedIn && isAdminMode && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
          ADMIN MODE ACTIVE - Press Ctrl+Shift+A to exit
        </div>
      )}
      
      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 shadow-[0_-6px_20px_rgba(0,0,0,0.05)] rounded-t-2xl">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all duration-200 hover:scale-105 ${activeTab === 'home' ? 'text-orange-600 scale-110' : 'text-gray-400'}`}>
            <Home size={22} className={`${activeTab === 'home' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`} />
            <span className="text-[10px] font-medium">{t('home')}</span>
          </button>
          <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center gap-1 transition-all duration-200 hover:scale-105 ${activeTab === 'jobs' ? 'text-orange-600 scale-110' : 'text-gray-400'}`}>
            <Briefcase size={22} className={`${activeTab === 'jobs' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`} />
            <span className="text-[10px] font-medium">{user && user.role === AppRole.CUSTOMER ? t('bookings') : 'My Jobs'}</span>
          </button>
          <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center gap-1 transition-all duration-200 hover:scale-105 ${activeTab === 'alerts' ? 'text-orange-600 scale-110' : 'text-gray-400'}`}>
            <div className="relative">
              <Bell size={22} className={`${activeTab === 'alerts' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`} />
              {user && user.role === AppRole.CARPENTER && bookings.some(b => b.status === JobStatus.SEARCHING) && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-600 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </div>
            <span className="text-[10px] font-medium">{t('alerts')}</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all duration-200 hover:scale-105 ${activeTab === 'profile' ? 'text-orange-600 scale-110' : 'text-gray-400'}`}>
            <User size={22} className={`${activeTab === 'profile' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`} />
            <span className="text-[10px] font-medium">{t('profile')}</span>
          </button>
        </nav>
      )}
    </div>
    </WalletProvider>
  );
};

export default App;
