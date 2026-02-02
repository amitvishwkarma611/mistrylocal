
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SERVICES, CATEGORIES, getIcon } from '../constants';
import { analyzeCarpentryPhoto } from '../geminiService';
import { Booking, JobStatus, Carpenter, AppRole } from '../types';
import { translations, Language } from '../translations';
import { Camera, Star, BadgeCheck, Loader2, X, ArrowRight, Hammer, PenLine, Radar, Zap, MessageSquare, Phone, Navigation, ChevronRight, CheckSquare, Square, CheckCircle2, IndianRupee, Clock } from 'lucide-react';
import { createBooking } from '../services/bookingService';

interface CustomerHomeProps {
  onBook: (booking: Booking) => void;
  onCancel: (id: string) => void;
  onUpdateStatus: (id: string, status: JobStatus, mistryId?: string) => void;
  carpenters: Carpenter[];
  bookings: Booking[];
  t: (key: keyof typeof translations.EN) => string;
  user?: { role: AppRole; name: string; phone: string; uid: string };
}

const CustomerHome: React.FC<CustomerHomeProps> = ({ onBook, onCancel, onUpdateStatus, carpenters, bookings, t, user }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [aiResult, setAiResult] = useState<{issue: string; issueHindi: string; isSmallJob: boolean} | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customIssue, setCustomIssue] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  // Removed location state - using area-based matching only
  const [selectedArea, setSelectedArea] = useState('Sector 45, Gurgaon');
  
  // Ref to track previous service selection count for immediate UI updates
  const prevSelectedCountRef = useRef(selectedServiceIds.length);
  
  // Effect to ensure immediate UI updates when service selections change
  useEffect(() => {
    // Force a re-render when service selection count changes
    const currentCount = selectedServiceIds.length;
    const prevCount = prevSelectedCountRef.current;
    
    if (currentCount !== prevCount) {
      // This helps trigger immediate UI updates
      prevSelectedCountRef.current = currentCount;
    }
  }, [selectedServiceIds]);

  const currentLang = (localStorage.getItem('mistry_lang') as Language) || 'EN';
  
  const searchingJob = useMemo(() => {
    return bookings.find(b => b.status === JobStatus.SEARCHING && b.customerName === user?.name);
  }, [bookings, user?.name]);
  
  // Check if customer has any accepted bookings that were previously searching
  const hasAcceptedBooking = useMemo(() => {
    return bookings.some(b => 
      b.status === JobStatus.ACCEPTED && 
      b.customerName === user?.name
    );
  }, [bookings, user?.name]);
  
  // Store previous searching state to detect transition
  const hadSearchingJob = useRef(false);
  const [showAcceptanceScreen, setShowAcceptanceScreen] = useState(false);
  
  // Track previous bookings to detect status changes
  const previousBookings = useRef<Booking[]>([]);
  
  // Detect transition from searching to accepted
  useEffect(() => {
    const currentlySearching = bookings.some(b => 
      b.status === JobStatus.SEARCHING && 
      b.customerName === user?.name
    );
    
    const hasAccepted = bookings.some(b => 
      b.status === JobStatus.ACCEPTED && 
      b.customerName === user?.name
    );
    
    // Check for status changes in individual bookings
    const statusChangedBookings = bookings.filter(currentBooking => {
      const previousBooking = previousBookings.current.find(b => b.id === currentBooking.id);
      return previousBooking && previousBooking.status !== currentBooking.status;
    });
    
    // Only log when there are actual status changes to prevent repeated logs
    if (statusChangedBookings.length > 0) {
      console.log('🔍 CustomerHome Debug:', {
        user: user?.name,
        totalBookings: bookings.length,
        currentlySearching,
        hasAccepted,
        hadSearchingJob: hadSearchingJob.current,
        showAcceptanceScreen,
        statusChangedBookings: statusChangedBookings.map(b => ({
          id: b.id,
          oldStatus: previousBookings.current.find(pb => pb.id === b.id)?.status,
          newStatus: b.status
        }))
      });
      
      // Log customer bookings only when there are changes
      const customerBookings = bookings.filter(b => b.customerName === user?.name);
      console.log('📋 Customer bookings:', customerBookings.map(b => ({
        id: b.id,
        status: b.status,
        service: b.service,
        createdAt: new Date(b.createdAt).toLocaleTimeString()
      })));
    }
    
    // If we had a searching job and now have an accepted job, show acceptance screen
    if (hadSearchingJob.current && !currentlySearching && hasAccepted && !showAcceptanceScreen) {
      console.log('🎯 Detected transition: SEARCHING → ACCEPTED');
      setShowAcceptanceScreen(true);
      // Hide after 3 seconds
      setTimeout(() => {
        setShowAcceptanceScreen(false);
        // Switch to jobs tab after showing acceptance screen
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('switchTab', { detail: 'jobs' });
          window.dispatchEvent(event);
        }
      }, 3000);
    }
    
    // Also check if any booking changed from SEARCHING to ACCEPTED
    const searchToAcceptTransition = statusChangedBookings.find(b => 
      previousBookings.current.find(pb => pb.id === b.id)?.status === JobStatus.SEARCHING &&
      b.status === JobStatus.ACCEPTED
    );
    
    // Check if any booking changed to CANCELLED (cancellation happened)
    const cancellationOccurred = statusChangedBookings.some(b => 
      b.status === JobStatus.CANCELLED
    );
    
    // Only show acceptance screen if no cancellation occurred for this transition
    if (searchToAcceptTransition && !showAcceptanceScreen && !cancellationOccurred) {
      console.log('🎯 Detected direct status change: SEARCHING → ACCEPTED');
      setShowAcceptanceScreen(true);
      setTimeout(() => {
        setShowAcceptanceScreen(false);
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('switchTab', { detail: 'jobs' });
          window.dispatchEvent(event);
        }
      }, 3000);
    } else if (cancellationOccurred) {
      console.log('🎯 Cancellation detected, hiding acceptance screen if showing');
      // If cancellation occurred and acceptance screen is showing, hide it
      if (showAcceptanceScreen) {
        setShowAcceptanceScreen(false);
      }
    }
    
    hadSearchingJob.current = currentlySearching;
    previousBookings.current = [...bookings];
  }, [bookings, user?.name, showAcceptanceScreen]);

  // Removed map useEffect - no live location tracking

  const toggleService = (id: string) => {
    // Force immediate state update to trigger UI changes
    setSelectedServiceIds(prev => {
      const newIds = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      return [...newIds]; // Create new array to ensure re-render
    });
  };

  // Removed detectCurrentLocation - no live GPS functionality

  const handleAreaSelection = (area: string) => {
    setSelectedArea(area);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await analyzeCarpentryPhoto(base64);
      if (result) {
        setAiResult(result);
        setSelectedServiceIds([]);
        setIsCustomMode(false);
      }
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const getServiceTitle = (service: any) => {
    if (currentLang === 'HI') return service.titleHindi;
    if (currentLang === 'PA') return service.titlePunjabi;
    return service.title;
  };

  const getCategoryName = (cat: any) => {
    if (currentLang === 'HI') return cat.nameHindi;
    if (currentLang === 'PA') return cat.namePunjabi;
    return cat.name;
  }

  const handleConfirmLocation = () => {
    const mockAddress = `Sector 45, Gurgaon (Near Lat: ${location.lat.toFixed(4)})`;
    setLocation(prev => ({ ...prev, address: mockAddress }));
    setShowMap(false);
  };

  const handleBooking = async (ids?: string[], user?: { role: AppRole; name: string; phone: string; uid: string }) => {
    console.log('🚀 handleBooking called with:', { ids, user });
    
    // Validate user authentication
    if (!user || !user.uid) {
      console.error('❌ User not authenticated or missing UID');
      alert('Please log in first to create a booking');
      return;
    }
    
    // Set loading state
    setCreatingBooking(true);
    
    const sIds = ids || selectedServiceIds;
    const selected = SERVICES.filter(s => sIds.includes(s.id));
    
    console.log('📋 Selected services:', selected);
    
    let text = "";
    let totalPrice = 0;

    if (aiResult) {
      text = aiResult.issue;
      totalPrice = 400; // Default min for AI scan
    } else if (isCustomMode) {
      text = customIssue;
      totalPrice = 400; // Custom starts from 400
    } else if (selected.length > 0) {
      if (selected.length > 1) {
        const itemNames = selected.map(s => getServiceTitle(s)).join(', ');
        text = `${t('multi_book_title')} (${selected.length} items: ${itemNames})`;
      } else {
        text = getServiceTitle(selected[0]);
      }
      totalPrice = selected.reduce((acc, s) => acc + (s.basePrice || 0), 0);
    } else {
      console.warn('⚠️ No services selected for booking');
      setCreatingBooking(false);
      return;
    }
    
    console.log('📝 Booking details:', {
      customerId: user.uid,
      customerName: user.name,
      customerPhone: user.phone,
      description: text,
      totalPrice
    });
    
    try {
      // Create booking in Firestore with real-time capability
      console.log('📤 Creating booking in Firestore...');
      const bookingId = await createBooking({
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone,
        furnitureType: 'Furniture Repair',
        problemType: 'General Issue',
        description: text,
        location: {
          lat: 28.4595,
          lng: 77.0266
        },
        pincode: '122001'
      });
      
      console.log('✅ Booking created successfully with ID:', bookingId);
      
      // Create a temporary booking object to show in UI immediately
      const newBooking = {
        id: bookingId,
        service: text,
        mistry: 'Searching...',
        status: JobStatus.SEARCHING,
        time: 'Just now',
        address: selectedArea,
        lat: 28.4595,
        lng: 77.0266,
        price: `₹${totalPrice}`,
        isUpcoming: true,
        isRated: false,
        customerName: user.name,
        createdAt: Date.now()
      };
      
      console.log('📱 Adding booking to UI immediately:', newBooking);
      onBook(newBooking);
      
      // Trigger immediate refresh to ensure UI updates quickly
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 100);
      
      // Clear selection after booking
      setSelectedServiceIds([]);
      setCustomIssue('');
      setIsCustomMode(false);
      setAiResult(null);
      
      console.log('✅ Booking process completed successfully');
      
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      // Always reset loading state
      setCreatingBooking(false);
    }
  };

  const calculatedTotal = SERVICES
    .filter(s => selectedServiceIds.includes(s.id))
    .reduce((acc, s) => acc + (s.basePrice || 0), 0);

  // Removed map view - using simple area selection instead

  if (showAcceptanceScreen) {
    // Get the accepted booking to display details
    const acceptedBooking = bookings.find(b => 
      b.status === JobStatus.ACCEPTED && 
      b.customerName === user?.name
    );
    
    // Check if there's a cancelled booking to avoid showing acceptance screen when cancelled
    const cancelledBooking = bookings.find(b => 
      b.status === JobStatus.CANCELLED && 
      b.customerName === user?.name
    );
    
    // Don't show acceptance screen if booking has been cancelled
    if (cancelledBooking) {
      // Hide the acceptance screen if a cancellation occurred
      setShowAcceptanceScreen(false);
      return null; // Return null to render nothing
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mb-8">
          <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-200 animate-in zoom-in-95">
            <CheckCircle2 size={48} className="text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-amber-900 mb-2 animate-in slide-in-from-top-4 delay-100">Job Accepted!</h2>
        <p className="text-sm font-bold text-gray-600 mb-8 italic animate-in slide-in-from-top-4 delay-200">
          Your request has been accepted by {acceptedBooking?.mistry || 'your mistry'}
        </p>
        <div className="bg-white border-2 border-green-200 rounded-2xl p-6 w-full max-w-md shadow-lg animate-in slide-in-from-bottom-4 delay-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-green-600 rounded-full"></div>
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Service Area</p>
              <p className="text-sm font-bold text-amber-900">{acceptedBooking?.address || 'Your location'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <IndianRupee size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Price</p>
              <p className="text-sm font-bold text-amber-900">{acceptedBooking?.price || '₹400'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Estimated Time</p>
              <p className="text-sm font-bold text-amber-900">Arriving soon</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-8 animate-in slide-in-from-bottom-4 delay-500">
          Redirecting to bookings page...
        </p>
      </div>
    );
  }
  
  if (searchingJob) {
    const elapsed = (Date.now() - searchingJob.createdAt) / 1000;
    const wave = elapsed < 15 ? 1 : (elapsed < 30 ? 2 : 3);
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-orange-200/30 rounded-full animate-ping"></div>
          <div className="relative w-32 h-32 bg-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-200">
            <Radar size={48} className="text-white animate-spin duration-[3000ms]" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-amber-900 mb-2">{t('searching_title')}</h2>
        <p className="text-sm font-bold text-gray-500 mb-8 italic">{t('searching_subtitle')}</p>
        <div className="w-full space-y-4">
          <div className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${wave === 1 ? 'bg-orange-50 border-orange-200 shadow-sm scale-105' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${wave === 1 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
            <div className="text-left">
              <p className="font-bold text-xs text-amber-900 leading-tight">{t('wave_1')}</p>
              <p className="text-[10px] text-gray-500">{t('wave_1_desc')}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${wave === 2 ? 'bg-orange-50 border-orange-200 shadow-sm scale-105' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${wave === 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
            <div className="text-left">
              <p className="font-bold text-xs text-amber-900 leading-tight">{t('wave_2')}</p>
              <p className="text-[10px] text-gray-500">{t('wave_2_desc')}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${wave === 3 ? 'bg-orange-50 border-orange-200 shadow-sm scale-105' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${wave === 3 ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-200 text-gray-400'}`}><Zap size={14} /></div>
            <div className="text-left">
              <p className="font-bold text-xs text-amber-900 leading-tight">{t('wave_3')}</p>
              <p className="text-[10px] text-gray-500">{t('wave_3_desc')}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => onCancel(searchingJob.id)}
          className="mt-12 text-sm font-bold text-gray-400 underline underline-offset-4 hover:text-orange-600 transition-colors"
        >
          {t('cancel_request')}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-40">
        <div className="mb-6 flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl shadow-sm">
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Service Area</p>
            <p className="text-sm font-bold text-amber-900 truncate">{selectedArea}</p>
          </div>
        </div>

      <div className="bg-gradient-to-br from-amber-800 to-amber-900 rounded-3xl p-6 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full mb-4">
            <BadgeCheck size={14} className="text-orange-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300">{t('app_subtitle')}</span>
          </div>
          <h2 className="text-2xl font-bold mb-1 leading-tight">{t('mistry_for_small')}</h2>
          <h3 className="text-lg font-medium text-amber-100 mb-4 leading-snug">{t('mistry_small_hindi')}</h3>
          <p className="text-amber-200 text-sm mb-6 leading-relaxed opacity-90">{t('uc_ignore')}</p>
          <div className="flex flex-col gap-3">
            <label className="inline-flex items-center gap-2 px-6 py-4 bg-white text-amber-900 rounded-2xl font-bold text-sm shadow-xl cursor-pointer hover:bg-orange-50 transition-colors">
              <Camera size={20} className="text-orange-600" />
              {t('photo_upload')}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
            <button onClick={() => { setIsCustomMode(true); setSelectedServiceIds([]); setAiResult(null); }} className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700/50 border border-amber-600/50 text-white rounded-2xl font-bold text-sm w-full justify-center">
              <PenLine size={18} /> {t('manual_write')}
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10"><Hammer size={240} /></div>
      </div>

      {isCustomMode && !aiResult && (
        <div className="bg-white border-2 border-orange-500 rounded-3xl p-6 mb-8 shadow-lg animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-amber-900 flex items-center gap-2"><PenLine className="text-orange-600" size={18} /> {t('manual_write')}</h4>
            <button onClick={() => setIsCustomMode(false)} className="text-gray-400 p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
          </div>
          <textarea value={customIssue} onChange={(e) => setCustomIssue(e.target.value)} placeholder="E.g. My wooden shoe rack door is broken..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm min-h-[100px] mb-4 text-amber-900" />
          <button disabled={!customIssue.trim()} onClick={() => handleBooking(undefined, user)} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 flex items-center justify-center gap-2">
            {t('find_now')} <ArrowRight size={18} />
          </button>
        </div>
      )}

      {analyzing && (
        <div className="bg-white border-2 border-dashed border-orange-300 rounded-3xl p-8 mb-8 flex flex-col items-center gap-4 animate-pulse text-center">
          <Loader2 className="text-orange-600 animate-spin" size={32} />
          <p className="font-semibold text-orange-900">Scanning problem...</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-lg font-black text-amber-900">{t('choose_service')}</h3>
      </div>

      {CATEGORIES.map(cat => (
        <div key={cat.id} className="mb-8">
          <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest px-1 mb-3 flex items-center gap-2">
            <span>{cat.emoji}</span> {getCategoryName(cat)}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.filter(s => s.category === cat.id).map(service => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <button 
                  key={service.id} 
                  onClick={() => toggleService(service.id)} 
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col gap-2 group relative h-full ${isSelected ? 'bg-orange-50 border-orange-500 shadow-inner scale-[0.98]' : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-md active:scale-95'}`}
                >
                  <div className="absolute top-2 right-2">
                    {isSelected ? <CheckSquare size={16} className="text-orange-600" /> : <Square size={16} className="text-gray-200 group-hover:text-orange-100" />}
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'}`}>
                    {getIcon(service.icon, "size-5")}
                  </div>
                  <div className="flex-1">
                     <p className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-orange-900' : 'text-amber-900'}`}>
                      {getServiceTitle(service)}
                    </p>
                    <p className={`text-[8px] font-medium mt-0.5 mb-2 ${isSelected ? 'text-orange-700/60' : 'text-gray-400'}`}>{service.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 w-full">
                    {service.basePrice ? (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${isSelected ? 'bg-orange-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
                        ₹{service.basePrice}
                      </span>
                    ) : <span></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}



      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-bold text-amber-900">{t('active_near')}</h3>
      </div>
      <div className="flex flex-col gap-4 pb-40">
        {carpenters.map(carp => (
          <div key={carp.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex gap-4 hover:shadow-md transition-all">
            <div className="relative shrink-0">
              <img src={carp.image} alt={carp.name} className="w-16 h-16 rounded-2xl object-cover" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5">{carp.name} {carp.verified && <BadgeCheck size={14} className="text-blue-500" />}</h4>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 tracking-wider mb-2">
                    <span className="flex items-center gap-0.5 text-orange-500"><Star size={12} fill="currentColor" /> {carp.rating}</span>
                    <span>{carp.distance}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"><MessageSquare size={14} /></button>
                <button className="px-4 py-2 border border-gray-100 text-amber-900 rounded-xl text-xs font-bold active:scale-95 transition-transform"><Phone size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* MOBILE-FRIENDLY FLOATING SELECTION FOOTER - Optimized for mobile devices */}
    {selectedServiceIds.length > 0 && (
      <div className="fixed bottom-4 left-2 right-2 z-50 bg-white p-3 shadow-2xl rounded-2xl border border-gray-200 max-w-md mx-auto">
         <div className="bg-amber-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-3 sm:gap-4 border-2 border-orange-500/30">
            <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3">
               <div className="flex items-center gap-1.5">
                  <span className="bg-orange-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{selectedServiceIds.length}</span>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-70">{t('items_selected')}</p>
               </div>
               <p className="text-base sm:text-xl font-black flex items-center gap-1">₹{calculatedTotal}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
               <button onClick={() => setSelectedServiceIds([])} className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl hover:bg-white/20 transition-all active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center"><X className="sm:size-5" size={16}/></button>
               <button 
                 onClick={() => handleBooking(undefined, user)} 
                 className="py-2 sm:py-3 px-4 sm:px-6 bg-orange-600 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 shadow-lg shadow-black/20 active:scale-95 transition-all hover:bg-orange-700 min-w-[100px]"
                 disabled={creatingBooking}
               >
                 {creatingBooking ? (
                   <>
                     <Loader2 className="animate-spin sm:size-5" size={14}/> <span className="hidden sm:inline">Creating...</span><span className="sm:hidden">Cr...</span>
                   </>
                 ) : (
                   <>
                     <span>{selectedServiceIds.length > 1 ? t('multi_book_title') : t('book_selection')}</span> <ArrowRight className="sm:size-5" size={14}/>
                   </>
                 )}
               </button>
            </div>
         </div>
      </div>
    )}
  </div>
  );
};

export default CustomerHome;
