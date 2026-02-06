
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Star, BadgeCheck, Phone, CheckCircle, Clock, MapPin, IndianRupee, Navigation, MessageSquare, Hammer, Zap, AlertCircle, Radar, ChevronRight, History, X } from 'lucide-react';
import { Booking, JobStatus, AppRole, Carpenter } from '../types';
import { translations } from '../translations';
import { setCarpenterOnlineStatus, startPollingSearchingBookings, stopPollingSearchingBookings, acceptJob, createOrUpdateCarpenter, BookingData } from '../services/bookingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getWalletBalance } from '../services/walletService';

interface CarpenterPortalProps {
  bookings: Booking[];
  onUpdateStatus: (id: string, status: JobStatus, mistryId?: string) => void;
  t: (key: keyof typeof translations.EN) => string;
  user?: { role: AppRole; name: string; phone: string; uid: string };
}

const CarpenterPortal: React.FC<CarpenterPortalProps> = ({ bookings, onUpdateStatus, t, user }) => {
  const [timer, setTimer] = useState(15);
  const [online, setOnline] = useState(true);
  const [carpenterId, setCarpenterId] = useState(user?.uid || 'carpenter-123');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false); // Track job acceptance state
  const [isNavigating, setIsNavigating] = useState(false); // Track navigation start state
  const [hasArrived, setHasArrived] = useState(false); // Track arrival state
  const [isWorking, setIsWorking] = useState(false); // Track work start state
  const [isFinishing, setIsFinishing] = useState(false); // Track job finish state
  const [carpenterProfile, setCarpenterProfile] = useState<Carpenter | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0); // Wallet balance state
  
  // Initialize carpenter profile only once when component mounts (UBER-STYLE)
  useEffect(() => {
    let isMounted = true;
    
    const initializeCarpenterProfile = async () => {
      if (user && user.uid && isMounted) {
        setCarpenterId(user.uid);
        try {
          // CREATE carpenter profile ONLY ONCE when component mounts
          // UBER-STYLE: No repeated writes, no polling
          await createOrUpdateCarpenter({
            id: user.uid,
            name: user.name,
            phone: user.phone,
            online: true,
            services: ['Furniture Repair', 'Installation', 'Custom Work'],
            location: { lat: 19.1709, lng: 72.9966 }, // Airoli location
            city: 'Mumbai',
            rating: 4.9,
            serviceAreas: ['400707', '400708'], // Airoli service areas
            serviceArea: 'airoli' // Primary service area
          });
        } catch (error) {
          console.error('Error initializing carpenter profile:', error);
        }
      }
    };
    
    initializeCarpenterProfile();
    
    // Cleanup: set online status to false when component unmounts
    return () => {
      isMounted = false;
      if (user && user.uid) {
        // Lightweight update only - no recreating document
        setCarpenterOnlineStatus(user.uid, false).catch(err => 
          console.error('Error setting offline status:', err)
        );
      }
    };
  }, []); // EMPTY DEPENDENCY ARRAY - RUNS ONLY ONCE
  
  // Fetch carpenter profile when component mounts
  useEffect(() => {
    const fetchCarpenterProfile = async () => {
      if (user && user.uid) {
        try {
          const carpenterDoc = await getDoc(doc(db, 'carpenters', user.uid));
          if (carpenterDoc.exists()) {
            const data = carpenterDoc.data();
            // Map the fetched data to Carpenter interface
            const profile: Carpenter = {
              id: user.uid,
              name: data.name || user.name,
              phone: data.phone || user.phone,
              rating: data.rating || 0,
              ratingCount: data.ratingCount || 0,
              jobsCompleted: data.jobsCompleted || 0,
              verified: data.verified || false,
              distance: data.distance || 'N/A',
              specialties: data.specialties || [],
              acceptsSmallJobs: data.acceptsSmallJobs || false,
              image: data.image || 'https://picsum.photos/seed/carp3/200/200',
              lat: data.location?.lat || 0,
              lng: data.location?.lng || 0,
              trustScore: data.trustScore || 0,
              recentTags: data.recentTags || [],
              serviceAreas: data.serviceAreas || [],
              
              // NEW PROFESSIONAL DETAILS
              alternateMobileNumber: data.alternateMobileNumber,
              address: data.address,
              addressProof: data.addressProof,
              profilePhotoUrl: data.profilePhotoUrl,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
            setCarpenterProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching carpenter profile:', error);
        }
      }
    };
    
    fetchCarpenterProfile();
  }, [user]);
  
  // Fetch wallet balance when component mounts
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (user && user.uid) {
        try {
          const balance = await getWalletBalance(user.uid);
          setWalletBalance(balance);
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
        }
      }
    };
    
    fetchWalletBalance();
  }, [user]);
  
  // Update online status separately when needed (lightweight)
  useEffect(() => {
    if (user && user.uid && carpenterId) {
      // UPDATE only online status - no full document recreation
      setCarpenterOnlineStatus(user.uid, true).catch(err => 
        console.error('Error updating online status:', err)
      );
    }
  }, [user, carpenterId]); // Only when user or carpenterId changes
  
  // Monitor online status changes and trigger listener cleanup/reattachment
  useEffect(() => {
    console.log('🌐 Online status changed:', online);
    // The main useEffect above will handle listener attachment/removal based on online status
  }, [online]);
  
  // State for nearby jobs
  const [nearbyJobs, setNearbyJobs] = useState<Booking[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>(['400707', '400708']); // Airoli service areas
  
  // Refs to track component state
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const hasAttachedListenerRef = useRef(false);
  
  // FLAG to track if this component started polling (StrictMode safety)
  const startedPollingByThisComponent = useRef(false);

  // POLLING MANAGEMENT - Start/stop based on online status
  useEffect(() => {
    // Only start polling when carpenter is online and has valid user
    if (!user || !user.uid || !online) {
      // Stop polling if carpenter goes offline
      console.log('🛑 Stopping polling - carpenter offline or no user');
      if (startedPollingByThisComponent.current) {
        stopPollingSearchingBookings();
        startedPollingByThisComponent.current = false;
      }
      setNearbyJobs([]); // Clear jobs when going offline
      return;
    }
    
    console.log('🚀 Starting polling for searching bookings');
    
    // START POLLING - runs every 10-15 seconds
    startPollingSearchingBookings(
      user.uid,
      serviceAreas,
      (bookings: BookingData[]) => {
        // Only log when the number of jobs actually changes
        const prevJobCount = nearbyJobs.length;
        if (bookings.length !== prevJobCount) {
          console.log(`📊 Received ${bookings.length} searching bookings from polling (was ${prevJobCount})`);
        }
        
        // Convert BookingData to Booking interface - ONLY for searching jobs
        const convertedJobs = bookings
          .filter(booking => booking.status === JobStatus.SEARCHING) // Ensure only searching jobs
          .map(booking => ({
            id: booking.id || '',
            service: booking.description,
            mistry: 'Searching...',
            status: booking.status,
            time: 'Just now',
            address: `Area: ${booking.pincode}`,
            lat: booking.location.lat,
            lng: booking.location.lng,
            price: `₹500`, // Default price
            isUpcoming: true,
            customerName: booking.customerName,
            createdAt: booking.createdAt?.toDate?.().getTime() || Date.now(),
            distanceKm: 0, // Not used in area-based matching
            wave: 1 // Default wave for new jobs
          }));
        
        // Sort by creation time (newest first)
        const sortedJobs = convertedJobs.sort((a, b) => b.createdAt - a.createdAt);
        
        // Only update if jobs actually changed to prevent unnecessary re-renders
        setNearbyJobs(prevJobs => {
          const hasChanges = sortedJobs.length !== prevJobs.length || 
            sortedJobs.some((newJob, index) => {
              const oldJob = prevJobs[index];
              return !oldJob || newJob.id !== oldJob.id;
            });
          
          return hasChanges ? sortedJobs : prevJobs;
        });
      },
      'airoli' // Filter by airoli service area
    );
    
    // Mark that this component started polling
    startedPollingByThisComponent.current = true;
    
  }, [user?.uid, online, serviceAreas]); // Dependencies: user, online status, service areas

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Final cleanup - stopping polling on component unmount');
      // ONLY stop polling if this component was the one that started it
      if (startedPollingByThisComponent.current) {
        stopPollingSearchingBookings();
        startedPollingByThisComponent.current = false;
      }
    };
  }, []); // EMPTY DEPENDENCY ARRAY - runs only on unmount
  
  // Use the first nearby job as active offer
  const activeOffer = nearbyJobs.length > 0 ? nearbyJobs[0] : null;
    
  // Calculate current job based on bookings and user ID
  const currentJob = useMemo(() => {
    return bookings.find(b => 
      b.status !== JobStatus.COMPLETED && 
      b.status !== JobStatus.CANCELLED && 
      b.status !== JobStatus.SEARCHING && 
      b.status !== JobStatus.ACCEPT_TIMEOUT &&
      b.mistryId === user?.uid
    );
  }, [bookings, user?.uid]);
  
  // Debug logging - only log when job ID actually changes
  const previousJobId = useRef<string | null>(null);
  
  useEffect(() => {
    if (currentJob && currentJob.id !== previousJobId.current) {
      console.log('🎯 CarpenterPortal - Current job updated:', {
        id: currentJob.id,
        status: currentJob.status,
        service: currentJob.service
      });
      previousJobId.current = currentJob.id;
    }
  }, [currentJob]);

  // Filter completed jobs for this specific carpenter
  const completedJobs = useMemo(() => {
    return bookings.filter(b => b.status === JobStatus.COMPLETED && b.mistryId === user?.uid)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [bookings, user?.uid]);

  // Filter cancelled jobs for this specific carpenter (recent cancellations)
  const cancelledJobs = useMemo(() => {
    return bookings.filter(b => b.status === JobStatus.CANCELLED && b.mistryId === user?.uid)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [bookings, user?.uid]);

  // Filter timeout jobs for this specific carpenter
  const timeoutJobs = useMemo(() => {
    return bookings.filter(b => b.status === JobStatus.ACCEPT_TIMEOUT && b.mistryId === user?.uid)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [bookings, user?.uid]);

  const totalEarned = useMemo(() => {
    return completedJobs.reduce((acc, job) => {
      const priceStr = job.price?.replace('₹', '').replace(',', '') || '0';
      const price = parseInt(priceStr) || 0;
      return acc + price;
    }, 0);
  }, [completedJobs]);

  return (
    <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-8 shadow-sm">
        <div className="flex gap-4 items-center mb-6">
          <div className="relative">
            <img src={carpenterProfile?.profilePhotoUrl || carpenterProfile?.image || 'https://picsum.photos/seed/carp3/200/200'} className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-100" />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-amber-900">{carpenterProfile?.name || t('carpenter_profile')}</h2>
              <BadgeCheck size={18} className="text-blue-500" />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-0.5 text-xs font-bold text-orange-500">
                <Star size={14} fill="currentColor" /> {carpenterProfile?.rating || '4.9'}
              </span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wider">{t('online')}</span>
            </div>
            {/* Wallet Balance Display */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Wallet Balance</span>
              <span className="text-sm font-bold text-amber-900">₹{walletBalance}</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl flex items-center justify-between border border-amber-100">
          <div>
            <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">{t('trust_score')}</p>
            <p className="text-xl font-black text-amber-900">{carpenterProfile?.trustScore || '92'}%</p>
          </div>
          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600" style={{ width: `${carpenterProfile?.trustScore || 92}%` }}></div>
          </div>
        </div>
      </div>

      {activeOffer && (
        <div className="mb-8 animate-in zoom-in-95 duration-300">
          <div className="bg-black text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border-2 border-orange-600">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-600 rounded-full mb-4">
              <Zap size={14} fill="white" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {activeOffer.wave === 1 ? 'WAVE 1 - URGENT' : 
                 activeOffer.wave === 2 ? 'WAVE 2 - PRIORITY' : 
                 'WAVE 3 - AVAILABLE'}
              </span>
            </div>
            <h3 className="text-2xl font-black mb-1">{activeOffer.service}</h3>
            <p className="text-orange-400 text-sm font-bold mb-6 flex items-center gap-1.5">
              <MapPin size={14} /> Area: {activeOffer.address.replace('Area: ', '')}
            </p>
            <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">{t('estimated_pay')}</p>
                <p className="text-2xl font-black flex items-center gap-1"><IndianRupee size={20} /> {activeOffer.price?.replace('₹', '') || '500'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-60">{t('job_urgency')}</p>
                <p className={`text-sm font-bold 
                  ${activeOffer.wave === 1 ? 'text-red-400' : 
                    activeOffer.wave === 2 ? 'text-orange-400' : 
                    'text-green-400'}`}>
                  {activeOffer.wave === 1 ? 'Urgent' : 
                   activeOffer.wave === 2 ? 'Priority' : 
                   'Available'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={async () => {
                  // 🔒 USER-INITIATED ONLY - CRITICAL AUTO-ACCEPT PREVENTION 🔒
                  // This is the ONLY LEGITIMATE PLACE where acceptJob() can be called
                  // ABSOLUTELY FORBIDDEN to call from:
                  // - useEffect hooks
                  // - onSnapshot listeners  
                  // - render logic
                  // - conditional state updates
                  // - automatic/scheduled/background processes
                  //
                  // AUTO-ACCEPT BUG SAFEGUARDS:
                  // - No auto-accept based on job.status
                  // - No auto-accept based on job presence
                  // - No auto-accept based on wave or urgency
                  // - No side-effects automatically trigger this function
                  if (activeOffer && user && !isAccepting) {
                    setIsAccepting(true);
                    try {
                      // Attempt to accept the job using Firestore transaction
                      const success = await acceptJob(activeOffer.id, user.uid, user.name);
                      if (success) {
                        // Update parent component
                        onUpdateStatus(activeOffer.id, JobStatus.ACCEPTED, user.uid);
                      } else {
                        // Job was already taken by another carpenter
                        alert('Sorry, this job has been taken by another carpenter.');
                      }
                    } finally {
                      setIsAccepting(false);
                    }
                  }
                }}
                disabled={isAccepting}
                className="flex-1 py-4 bg-orange-600 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAccepting ? 'Accepting...' : t('accept_job')}
              </button>
              <button onClick={() => {}} className="px-6 py-4 bg-white/10 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all">
                {t('pass')}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentJob ? (
        <div className="mb-8 animate-in slide-in-from-right-4 duration-300" key={`job-${currentJob.id}-${currentJob.status}`}>
           <h3 className="text-lg font-bold text-amber-900 mb-4 px-1">{t('active_assignment')}</h3>
           <div className="bg-white border-2 border-orange-50 rounded-3xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-orange-600 text-white animate-in fade-in zoom-in-95">
                    {currentJob.status}
                  </span>
                  <h4 className="text-lg font-bold text-amber-900 mt-2">{currentJob.service}</h4>
                </div>
                <p className="text-lg font-black text-orange-600">{currentJob.price}</p>
              </div>
              <div className="flex flex-col gap-3">
                {currentJob.status === JobStatus.ACCEPTED && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          // Open WhatsApp to customer
                          const customerPhone = currentJob.customerPhone || '';
                          const message = encodeURIComponent(`Hi, I'm on my way to complete your ${currentJob.service} job. ETA: 15-20 mins.`);
                          window.open(`https://wa.me/${customerPhone}?text=${message}`, '_blank');
                        }}
                        className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-green-600"
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </button>
                      <button 
                        onClick={() => {
                          // Call customer
                          const customerPhone = currentJob.customerPhone || '';
                          window.open(`tel:${customerPhone}`);
                        }}
                        className="flex-1 py-3 bg-blue-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-blue-600"
                      >
                        <Phone size={14} /> Call
                      </button>
                    </div>
                    <button 
                      onClick={async () => {
                        console.log('🚗 Clicked Start Navigation for job:', currentJob.id);
                        if (isNavigating) return;
                        setIsNavigating(true);
                        try {
                          await onUpdateStatus(currentJob.id, JobStatus.ON_THE_WAY, user?.uid);
                          console.log('✅ Navigation started successfully');
                        } catch (error) {
                          console.error('❌ Error starting navigation:', error);
                        } finally {
                          setIsNavigating(false);
                        }
                      }} 
                      disabled={isNavigating}
                      className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-orange-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Navigation size={18} /> {isNavigating ? 'Updating...' : t('start_nav')}
                    </button>
                  </div>
                )}
                {currentJob.status === JobStatus.ON_THE_WAY && (
                   <div className="flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
                     <div className="bg-orange-600 p-4 rounded-2xl text-center shadow-lg shadow-orange-100 text-white font-black text-sm flex flex-col items-center animate-pulse">
                        <p className="flex items-center gap-2"><Radar size={16} className="animate-spin" /> {t('broadcasting')}</p>
                     </div>
                     <button 
                       onClick={async () => {
                         console.log('📍 Clicked Reached Destination for job:', currentJob.id);
                         if (hasArrived) return;
                         setHasArrived(true);
                         try {
                           await onUpdateStatus(currentJob.id, JobStatus.ARRIVED, user?.uid);
                           console.log('✅ Arrived successfully');
                         } catch (error) {
                           console.error('❌ Error marking arrival:', error);
                         } finally {
                           setHasArrived(false);
                         }
                       }} 
                       disabled={hasArrived}
                       className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-amber-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <MapPin size={18} /> {hasArrived ? 'Updating...' : t('reached_destination')}
                     </button>
                   </div>
                )}
                {currentJob.status === JobStatus.ARRIVED && (
                  <button 
                    onClick={async () => {
                      console.log('🔨 Clicked Started Working for job:', currentJob.id);
                      if (isWorking) return;
                      setIsWorking(true);
                      try {
                        await onUpdateStatus(currentJob.id, JobStatus.WORK_IN_PROGRESS, user?.uid);
                        console.log('✅ Work started successfully');
                      } catch (error) {
                        console.error('❌ Error starting work:', error);
                      } finally {
                        setIsWorking(false);
                      }
                    }} 
                    disabled={isWorking}
                    className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-amber-700 hover:shadow-lg animate-in slide-in-from-top-4 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Hammer size={18} /> {isWorking ? 'Updating...' : t('started_working')}
                  </button>
                )}
                {currentJob.status === JobStatus.WORK_IN_PROGRESS && (
                   <button 
                     onClick={async () => {
                       console.log('✅ Clicked Finish Job for job:', currentJob.id);
                       if (isFinishing) return;
                       setIsFinishing(true);
                       try {
                         await onUpdateStatus(currentJob.id, JobStatus.COMPLETED, user?.uid);
                         console.log('✅ Job completed successfully');
                       } catch (error) {
                         console.error('❌ Error completing job:', error);
                       } finally {
                         setIsFinishing(false);
                       }
                     }} 
                     disabled={isFinishing}
                     className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-green-700 hover:shadow-lg animate-in slide-in-from-top-4 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                    <CheckCircle size={18} /> {isFinishing ? 'Updating...' : t('finish_job')}
                  </button>
                )}
              </div>
           </div>
        </div>
      ) : (
        !activeOffer && (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-10 text-center mb-8">
             <Radar size={32} className="mx-auto text-gray-300 mb-3 animate-spin duration-[4000ms]" />
             <p className="text-gray-400 font-bold italic">{t('radar_scanning')}</p>
             <p className="text-[10px] text-gray-400 uppercase font-black mt-2 tracking-widest">{t('stay_within')}</p>
          </div>
        )
      )}

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white border border-gray-100 p-4 rounded-2xl">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{t('total_earnings')}</p>
          <p className="text-xl font-black text-amber-900 flex items-center gap-0.5"><IndianRupee size={16} /> {totalEarned.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-2xl">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Fixes Done</p>
          <p className="text-xl font-black text-amber-900">{completedJobs.length}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-amber-900 flex items-center gap-2">
            <History size={20} className="text-orange-600" />
            Job History
          </h3>
        </div>
        
        {completedJobs.length > 0 ? (
          <div className="space-y-3">
            {completedJobs.slice(0, 3).map(job => (
              <div key={job.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 leading-tight">{job.service}</h4>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{job.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-green-600 flex items-center justify-end gap-0.5">
                    +<IndianRupee size={12} /> {job.price?.replace('₹', '') || '0'}
                  </p>
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Verified</p>
                </div>
              </div>
            ))}
            {completedJobs.length > 3 && (
              <div className="pt-3">
                <button 
                  onClick={() => {
                    // Dispatch event to switch to 'jobs' tab in parent component
                    const event = new CustomEvent('switchTab', { detail: 'jobs' });
                    window.dispatchEvent(event);
                  }}
                  className="w-full py-3 bg-orange-100 text-orange-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-200 transition-colors"
                >
                  Show More <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-xs font-bold text-gray-400 italic">No completed jobs yet.</p>
          </div>
        )}
      </div>
      
      {/* Timeout Jobs Section */}
      {timeoutJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-amber-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-500" />
              Timeout Jobs
            </h3>
          </div>
          
          <div className="space-y-3 mb-6">
            {timeoutJobs.map(job => (
              <div key={job.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 leading-tight">{job.service}</h4>
                    <p className="text-[10px] text-orange-600 font-medium mt-0.5">Timeout - No response</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-orange-600">₹{job.price?.replace('₹', '') || '0'}</p>
                  <p className="text-[8px] font-black text-orange-400 uppercase tracking-tighter">No Earnings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Wallet Recharge Section */}
      <div className="mb-8">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-amber-900">Wallet Management</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl">
              <span className="text-sm font-bold text-amber-900">Current Balance</span>
              <span className="text-lg font-black text-amber-900">₹{walletBalance}</span>
            </div>
            <button
              onClick={async () => {
                if (!user?.uid) return;
                try {
                  const { rechargeWallet } = await import('../services/walletService');
                  await rechargeWallet(user.uid, 500);
                  // Refresh balance display
                  const balance = await getWalletBalance(user.uid);
                  setWalletBalance(balance);
                  alert('₹500 added to your wallet!');
                } catch (error) {
                  console.error('Error recharging wallet:', error);
                  alert('Failed to recharge wallet. Please try again.');
                }
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all"
            >
              <IndianRupee size={16} /> Add ₹500 Test Balance
            </button>
          </div>
        </div>
      </div>

      {/* Cancelled Jobs Section */}
      {cancelledJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-amber-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              Cancelled Jobs
            </h3>
          </div>
          
          <div className="space-y-3">
            {cancelledJobs.slice(0, 3).map(job => (  // Show only recent cancelled jobs
              <div key={job.id} className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                    <X size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 leading-tight">{job.service}</h4>
                    <p className="text-[10px] text-red-600 font-medium mt-0.5">Cancelled</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-red-600">₹{job.price?.replace('₹', '') || '0'}</p>
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter">Lost</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarpenterPortal;
