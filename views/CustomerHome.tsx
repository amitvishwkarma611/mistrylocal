
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SERVICES, CATEGORIES, getIcon } from '../constants';
import { analyzeCarpentryPhoto } from '../geminiService';
import { Booking, JobStatus, Carpenter, AppRole } from '../types';
import { translations, Language } from '../translations';
import { Camera, Star, BadgeCheck, Loader2, X, ArrowRight, Hammer, PenLine, Radar, Zap, MessageSquare, Phone, Navigation, ChevronRight, CheckSquare, Square, CheckCircle as CheckCircle2, IndianRupee, Clock, ShieldCheck } from 'lucide-react';
import { createBooking } from '../services/bookingService';
import { SERVICE_LIST } from '../data/serviceList';
import { applyMinimumPrice } from '../services/priceService';
import SkeletonWrapper from '../components/SkeletonWrapper';

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
  const [selectedServiceType, setSelectedServiceType] = useState<'carpenter' | 'plumber' | 'electrician'>('carpenter');
  // Removed location state - using area-based matching only
  const [selectedArea, setSelectedArea] = useState('Airoli, Mumbai');
  
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
    const result = bookings.some(b => 
      b.status === JobStatus.ACCEPTED && 
      b.customerName === user?.name
    );
      
    if(process.env.NODE_ENV === 'development') {
      console.log('🔍 hasAcceptedBooking check:', {
        allBookings: bookings.map(b => ({id: b.id, status: b.status, customerName: b.customerName, verificationCode: b.verificationCode})),
        user: user?.name,
        hasAccepted: result,
        acceptedBookings: bookings.filter(b => b.status === JobStatus.ACCEPTED && b.customerName === user?.name)
      });
    }
      
    return result;
  }, [bookings, user?.name]);
      
  // Get the accepted booking for verification display
  const acceptedBooking = useMemo(() => {
    const result = bookings.find(b => 
      b.status === JobStatus.ACCEPTED && 
      b.customerName === user?.name
    );
      
    if(process.env.NODE_ENV === 'development') {
      console.log('🔍 acceptedBooking find:', {
        allBookings: bookings.map(b => ({id: b.id, status: b.status, customerName: b.customerName, verificationCode: b.verificationCode})),
        user: user?.name,
        found: result,
        hasVerificationCode: !!result?.verificationCode
      });
    }
      
    return result;
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
    if (statusChangedBookings.length > 0 && process.env.NODE_ENV === 'development') {
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
      if(process.env.NODE_ENV === 'development') console.log('🎯 Detected transition: SEARCHING → ACCEPTED', {
        user: user?.name,
        bookingFound: acceptedBooking,
        hasVerificationCode: !!acceptedBooking?.verificationCode,
        verificationCode: acceptedBooking?.verificationCode
      });
      
      // Ensure we have the latest booking data with verification code
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 500);
      
      // Enhanced verification code fetching with multiple strategies
      const fetchVerificationCode = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          
          // Find the accepted booking
          const acceptedBooking = bookings.find(b => 
            b.status === JobStatus.ACCEPTED && 
            b.customerName === user?.name
          );
          
          if (acceptedBooking?.id) {
            if(process.env.NODE_ENV === 'development') {
              console.log('🔄 ATTEMPTING DIRECT VERIFICATION CODE FETCH:', {
                bookingId: acceptedBooking.id,
                currentHasCode: !!acceptedBooking.verificationCode,
                attemptTime: new Date().toISOString()
              });
            }
            
            const bookingDoc = await getDoc(doc(db, 'bookings', acceptedBooking.id));
            if (bookingDoc.exists()) {
              const bookingData = bookingDoc.data();
              if(process.env.NODE_ENV === 'development') {
                console.log('✅ DIRECT FIRESTORE FETCH RESULT:', {
                  bookingId: acceptedBooking.id,
                  firestoreHasCode: !!bookingData.verificationCode,
                  firestoreCode: bookingData.verificationCode,
                  firestoreIsVerified: bookingData.isVerified,
                  firestoreStatus: bookingData.status,
                  localHasCode: !!acceptedBooking.verificationCode,
                  localCode: acceptedBooking.verificationCode
                });
              }
              
              // If we found the verification code in Firestore but not in local state
              if (bookingData.verificationCode && !acceptedBooking.verificationCode) {
                console.log('🎯 VERIFICATION CODE FOUND IN FIRESTORE, TRIGGERING REFRESH');
                window.dispatchEvent(new CustomEvent('refreshBookings'));
              }
            }
          }
        } catch (error) {
          console.error('❌ Direct verification code fetch error:', error);
        }
      };
      
      // Multiple fetch attempts with different intervals
      setTimeout(fetchVerificationCode, 500);  // First attempt
      setTimeout(fetchVerificationCode, 1500); // Second attempt
      setTimeout(fetchVerificationCode, 3000); // Third attempt
      
      setShowAcceptanceScreen(true);
      // Hide after 15 seconds to allow time to see verification code
      setTimeout(() => {
        setShowAcceptanceScreen(false);
        // Switch to jobs tab after showing acceptance screen
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('switchTab', { detail: 'jobs' });
          window.dispatchEvent(event);
        }
      }, 15000);
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
    
    // Check for verification code updates in existing accepted bookings
    const verificationCodeUpdatedBookings = bookings.filter(currentBooking => {
      if (currentBooking.status === JobStatus.ACCEPTED && currentBooking.customerName === user?.name) {
        const previousBooking = previousBookings.current.find(pb => pb.id === currentBooking.id);
        return previousBooking && 
               !previousBooking.verificationCode && 
               currentBooking.verificationCode; // Code was added
      }
      return false;
    });
    
    // If verification code was just added to an accepted booking, refresh UI
    if (verificationCodeUpdatedBookings.length > 0 && showAcceptanceScreen) {
      if(process.env.NODE_ENV === 'development') {
        console.log('🔄 VERIFICATION CODE APPEARED IN BOOKING, FORCING UI UPDATE:', {
          bookingId: verificationCodeUpdatedBookings[0].id,
          newCode: verificationCodeUpdatedBookings[0].verificationCode,
          timestamp: new Date().toISOString()
        });
      }
      
      // Force a re-render by toggling the acceptance screen
      setShowAcceptanceScreen(false);
      setTimeout(() => {
        setShowAcceptanceScreen(true);
      }, 100);
    }
    
    // Only show acceptance screen if no cancellation occurred for this transition
    if (searchToAcceptTransition && !showAcceptanceScreen && !cancellationOccurred) {
      if(process.env.NODE_ENV === 'development') console.log('🎯 Detected direct status change: SEARCHING → ACCEPTED', {
        user: user?.name,
        bookingFound: acceptedBooking,
        hasVerificationCode: !!acceptedBooking?.verificationCode,
        verificationCode: acceptedBooking?.verificationCode
      });
      
      // Ensure we have the latest booking data with verification code
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 500);
      
      // Enhanced verification code fetching with multiple strategies
      const fetchVerificationCode = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          
          // Find the accepted booking
          const acceptedBooking = bookings.find(b => 
            b.status === JobStatus.ACCEPTED && 
            b.customerName === user?.name
          );
          
          if (acceptedBooking?.id) {
            if(process.env.NODE_ENV === 'development') {
              console.log('🔄 ATTEMPTING DIRECT VERIFICATION CODE FETCH:', {
                bookingId: acceptedBooking.id,
                currentHasCode: !!acceptedBooking.verificationCode,
                attemptTime: new Date().toISOString()
              });
            }
            
            const bookingDoc = await getDoc(doc(db, 'bookings', acceptedBooking.id));
            if (bookingDoc.exists()) {
              const bookingData = bookingDoc.data();
              if(process.env.NODE_ENV === 'development') {
                console.log('✅ DIRECT FIRESTORE FETCH RESULT:', {
                  bookingId: acceptedBooking.id,
                  firestoreHasCode: !!bookingData.verificationCode,
                  firestoreCode: bookingData.verificationCode,
                  firestoreIsVerified: bookingData.isVerified,
                  firestoreStatus: bookingData.status,
                  localHasCode: !!acceptedBooking.verificationCode,
                  localCode: acceptedBooking.verificationCode
                });
              }
              
              // If we found the verification code in Firestore but not in local state
              if (bookingData.verificationCode && !acceptedBooking.verificationCode) {
                console.log('🎯 VERIFICATION CODE FOUND IN FIRESTORE, TRIGGERING REFRESH');
                window.dispatchEvent(new CustomEvent('refreshBookings'));
              }
            }
          }
        } catch (error) {
          console.error('❌ Direct verification code fetch error:', error);
        }
      };
      
      // Multiple fetch attempts with different intervals
      setTimeout(fetchVerificationCode, 500);  // First attempt
      setTimeout(fetchVerificationCode, 1500); // Second attempt
      setTimeout(fetchVerificationCode, 3000); // Third attempt
      
      setShowAcceptanceScreen(true);
      setTimeout(() => {
        setShowAcceptanceScreen(false);
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('switchTab', { detail: 'jobs' });
          window.dispatchEvent(event);
        }
      }, 15000);
    } else if (cancellationOccurred) {
      if(process.env.NODE_ENV === 'development') console.log('🎯 Cancellation detected, hiding acceptance screen if showing');
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

  // Function to get services based on selected service type
  const getServicesForType = () => {
    if (selectedServiceType === 'carpenter') {
      return SERVICES;
    } else if (selectedServiceType === 'plumber') {
      // Create service objects for plumber services
      return SERVICE_LIST.plumber.map((service, index) => ({
        id: `plumber-${index}`,
        title: service,
        titleHindi: service, // Placeholder - would need translation
        titlePunjabi: service, // Placeholder - would need translation
        description: 'Plumbing service',
        icon: 'Hammer', // Using hammer as placeholder
        basePrice: 500, // Default price for plumbing
        category: 'repair'
      }));
    } else if (selectedServiceType === 'electrician') {
      // Create service objects for electrician services
      return SERVICE_LIST.electrician.map((service, index) => ({
        id: `electrician-${index}`,
        title: service,
        titleHindi: service, // Placeholder - would need translation
        titlePunjabi: service, // Placeholder - would need translation
        description: 'Electrical service',
        icon: 'Hammer', // Using hammer as placeholder
        basePrice: 550, // Default price for electrical
        category: 'repair'
      }));
    }
    return SERVICES; // Default to carpenter services
  };

  // Function to get categories based on selected service type
  const getCategoriesForType = () => {
    if (selectedServiceType === 'carpenter') {
      return CATEGORIES;
    } else {
      // For plumber/electrician, create a general category
      return [{
        id: 'general',
        name: selectedServiceType.charAt(0).toUpperCase() + selectedServiceType.slice(1),
        emoji: selectedServiceType === 'plumber' ? '🔧' : '⚡',
        nameHindi: selectedServiceType,
        namePunjabi: selectedServiceType
      }];
    }
  };



  const handleBooking = async (ids?: string[], user?: { role: AppRole; name: string; phone: string; uid: string }) => {
    if(process.env.NODE_ENV === 'development') console.log('🚀 handleBooking called with:', { ids, user });
    
    // Validate user authentication
    if (!user || !user.uid) {
      console.error('❌ User not authenticated or missing UID');
      alert('Please log in first to create a booking');
      return;
    }
    
    // Set loading state
    setCreatingBooking(true);
    
    const sIds = ids || selectedServiceIds;
    // Get services based on the selected service type
    const allServices = getServicesForType();
    const selected = allServices.filter(s => sIds.includes(s.id));
    
    if(process.env.NODE_ENV === 'development') console.log('📋 Selected services:', selected);
    
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
      const rawTotal = selected.reduce((acc, s) => acc + (s.basePrice || 0), 0);
      totalPrice = applyMinimumPrice(selectedServiceType, rawTotal);
    } else {
      console.warn('⚠️ No services selected for booking');
      setCreatingBooking(false);
      return;
    }
    
    if(process.env.NODE_ENV === 'development') console.log('📝 Booking details:', {
      customerId: user.uid,
      customerName: user.name,
      customerPhone: user.phone,
      description: text,
      totalPrice
    });
    
    try {
      // Create booking in Firestore with real-time capability
      if(process.env.NODE_ENV === 'development') console.log('📤 Creating booking in Firestore...');
      const bookingId = await createBooking({
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone,
        furnitureType: 'Furniture Repair',
        problemType: 'General Issue',
        description: text,
        location: {
          lat: 19.1709,  // Airoli latitude
          lng: 72.9966   // Airoli longitude
        },
        pincode: '400707',
        serviceType: selectedServiceType
      });
      
      if(process.env.NODE_ENV === 'development') console.log('✅ Booking created successfully with ID:', bookingId);
      
      // Fetch the actual booking document to get verification code
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        // Wait a moment for the document to be fully created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        
        if(process.env.NODE_ENV === 'development') {
          console.log('🔍 Firestore booking document check:', {
            exists: bookingDoc.exists(),
            bookingId: bookingId,
            data: bookingDoc.exists() ? bookingDoc.data() : null
          });
        }
        if (bookingDoc.exists()) {
          const bookingData = bookingDoc.data();
          
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
            createdAt: Date.now(),
            verificationCode: bookingData.verificationCode,
            isVerified: bookingData.isVerified || false
          };
          
          if(process.env.NODE_ENV === 'development') console.log('📱 Adding booking to UI with verification code:', newBooking);
          onBook(newBooking);
        } else {
          // Fallback to temporary booking if document not found
          const tempBooking = {
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
          
          if(process.env.NODE_ENV === 'development') console.log('📱 Adding temporary booking to UI:', tempBooking);
          onBook(tempBooking);
          
          // Trigger refresh to get the real data with verification code
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshBookings'));
          }, 1000);
        }
      } catch (fetchError) {
        console.error('❌ Error fetching booking document:', fetchError);
        // Fallback to temporary booking
        const tempBooking = {
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
        
        onBook(tempBooking);
        
        // Trigger refresh to get the real data
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshBookings'));
        }, 1000);
      }
      
      // Trigger immediate refresh to ensure UI updates quickly
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 100);
      
      // Clear selection after booking
      setSelectedServiceIds([]);
      setCustomIssue('');
      setIsCustomMode(false);
      setAiResult(null);
      
      if(process.env.NODE_ENV === 'development') console.log('✅ Booking process completed successfully');
      
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      // Always reset loading state
      setCreatingBooking(false);
    }
  };

  // Get services based on selected service type for total calculation
  const servicesForCalculation = getServicesForType();
  const rawTotal = servicesForCalculation
    .filter(s => selectedServiceIds.includes(s.id))
    .reduce((acc, s) => acc + (s.basePrice || 0), 0);
  const calculatedTotal = applyMinimumPrice(selectedServiceType, rawTotal);

  // Removed map view - using simple area selection instead

  if (showAcceptanceScreen) {
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
    
    // Comprehensive debug logging
    if(process.env.NODE_ENV === 'development') {
      console.log('🎯 ACCEPTANCE SCREEN DEBUG:', {
        user: user?.name,
        showAcceptanceScreen,
        acceptedBooking: acceptedBooking ? {
          id: acceptedBooking.id,
          status: acceptedBooking.status,
          customerName: acceptedBooking.customerName,
          hasVerificationCode: !!acceptedBooking.verificationCode,
          verificationCode: acceptedBooking.verificationCode,
          isVerified: acceptedBooking.isVerified
        } : null,
        allBookings: bookings.map(b => ({
          id: b.id,
          status: b.status,
          customerName: b.customerName,
          hasVerificationCode: !!b.verificationCode,
          verificationCode: b.verificationCode,
          isVerified: b.isVerified
        }))
      });
        
      // Check if there are any bookings with verification codes but not showing
      const bookingsWithCodes = bookings.filter(b => b.verificationCode);
      if (bookingsWithCodes.length > 0) {
        console.log('🔐 BOOKINGS WITH VERIFICATION CODES:', bookingsWithCodes.map(b => ({
          id: b.id,
          status: b.status,
          customerName: b.customerName,
          verificationCode: b.verificationCode,
          isVerified: b.isVerified
        })));
      }
      
      // Check if we have an accepted booking but no verification code is showing
      const acceptedBookingWithoutCode = bookings.find(b => 
        b.status === JobStatus.ACCEPTED && 
        b.customerName === user?.name && 
        !b.verificationCode
      );
      
      if (acceptedBookingWithoutCode && showAcceptanceScreen) {
        console.log('⚠️ ACCEPTED BOOKING WITHOUT VERIFICATION CODE:', {
          bookingId: acceptedBookingWithoutCode.id,
          status: acceptedBookingWithoutCode.status,
          customerName: acceptedBookingWithoutCode.customerName,
          hasLocalCode: !!acceptedBookingWithoutCode.verificationCode,
          localCode: acceptedBookingWithoutCode.verificationCode
        });
      }
        
      // Direct Firestore check for verification code
      if (acceptedBooking?.id) {
        import('firebase/firestore').then(async (firestore) => {
          const { doc, getDoc } = firestore;
          import('../firebase').then(async (firebase) => {
            const bookingDoc = await getDoc(doc(firebase.db, 'bookings', acceptedBooking.id));
            console.log('🔍 DIRECT FIRESTORE VERIFICATION:', {
              bookingId: acceptedBooking.id,
              documentExists: bookingDoc.exists(),
              firestoreData: bookingDoc.exists() ? {
                status: bookingDoc.data().status,
                verificationCode: bookingDoc.data().verificationCode,
                isVerified: bookingDoc.data().isVerified,
                customerName: bookingDoc.data().customerName
              } : null
            });
          });
        });
      }
    }
    
    // Enhanced verification code polling with comprehensive error handling
    useEffect(() => {
      if (showAcceptanceScreen) {
        // Find the current accepted booking
        const currentAcceptedBooking = bookings.find(b => 
          b.status === JobStatus.ACCEPTED && 
          b.customerName === user?.name
        );
        
        if (currentAcceptedBooking && !currentAcceptedBooking.verificationCode) {
          if(process.env.NODE_ENV === 'development') {
            console.log('🔄 STARTING ENHANCED VERIFICATION CODE POLLING:', {
              bookingId: currentAcceptedBooking.id,
              customerName: currentAcceptedBooking.customerName,
              startTime: new Date().toISOString()
            });
          }
          
          let consecutiveErrors = 0;
          const maxConsecutiveErrors = 5;
          
          // Direct Firestore fetch for the specific booking
          const fetchBookingDirectly = async () => {
            try {
              const { doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('../firebase');
              
              const bookingDoc = await getDoc(doc(db, 'bookings', currentAcceptedBooking.id));
              
              // Reset error counter on successful fetch
              consecutiveErrors = 0;
              
              if (bookingDoc.exists()) {
                const bookingData = bookingDoc.data();
                if(process.env.NODE_ENV === 'development') {
                  console.log('🔍 DIRECT FIRESTORE POLLING RESULT:', {
                    timestamp: new Date().toISOString(),
                    bookingId: currentAcceptedBooking.id,
                    firestoreHasCode: !!bookingData.verificationCode,
                    firestoreCode: bookingData.verificationCode,
                    firestoreIsVerified: bookingData.isVerified,
                    firestoreStatus: bookingData.status,
                    localHasCode: !!currentAcceptedBooking.verificationCode,
                    localCode: currentAcceptedBooking.verificationCode
                  });
                }
                
                // If we found the verification code, trigger a full refresh
                if (bookingData.verificationCode && !currentAcceptedBooking.verificationCode) {
                  console.log('🎯 VERIFICATION CODE DETECTED IN POLLING, TRIGGERING REFRESH');
                  window.dispatchEvent(new CustomEvent('refreshBookings'));
                }
              } else {
                console.warn('⚠️ Booking document not found during polling:', currentAcceptedBooking.id);
              }
            } catch (error) {
              consecutiveErrors++;
              console.error(`❌ Polling error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
              
              // Stop polling if too many consecutive errors
              if (consecutiveErrors >= maxConsecutiveErrors) {
                console.error('🚨 STOPPING POLLING DUE TO TOO MANY CONSECUTIVE ERRORS');
                clearInterval(refreshInterval);
                clearTimeout(stopInterval);
              }
            }
          };
          
          // Aggressive polling schedule: 500ms, 1s, 1.5s, 2s, then every 2s
          const pollingSchedule = [500, 1000, 1500, 2000];
          let scheduleIndex = 0;
          
          const startScheduledPolling = () => {
            if (scheduleIndex < pollingSchedule.length) {
              setTimeout(() => {
                fetchBookingDirectly();
                scheduleIndex++;
                if (scheduleIndex < pollingSchedule.length) {
                  startScheduledPolling();
                } else {
                  // Switch to regular interval polling
                  refreshInterval = setInterval(fetchBookingDirectly, 2000);
                }
              }, pollingSchedule[scheduleIndex]);
            }
          };
          
          // Start the scheduled polling
          startScheduledPolling();
          
          // Regular interval polling reference (will be set after scheduled polling)
          let refreshInterval: NodeJS.Timeout;
          
          // Stop after 30 seconds (extended duration)
          const stopInterval = setTimeout(() => {
            if (refreshInterval) {
              clearInterval(refreshInterval);
            }
            if(process.env.NODE_ENV === 'development') {
              console.log('🔍 STOPPING VERIFICATION CODE POLLING AFTER 30 SECONDS');
            }
          }, 30000);
          
          return () => {
            if (refreshInterval) {
              clearInterval(refreshInterval);
            }
            clearTimeout(stopInterval);
          };
        }
      }
    }, [showAcceptanceScreen, bookings, user?.name]);
    
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
          
          {/* Verification Code Display */}
          {acceptedBooking && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Security Code</p>
                  <p className="text-xs font-bold text-amber-800">Share with your worker</p>
                </div>
              </div>
              {acceptedBooking.verificationCode ? (
                <div className="bg-white border-2 border-amber-200 rounded-xl p-4 text-center animate-in zoom-in-95">
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Verification Code</p>
                  <p className="text-3xl font-black text-amber-900 tracking-widest">{acceptedBooking.verificationCode}</p>
                  <p className="text-[10px] font-bold text-gray-600 mt-2">Worker must enter this code before starting work</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-amber-200 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <p className="text-sm font-bold text-amber-700">Generating security code...</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">This may take a few seconds</p>
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('refreshBookings'))}
                      className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-lg font-bold transition-colors"
                    >
                      Refresh Data
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const { doc, getDoc } = await import('firebase/firestore');
                          const { db } = await import('../firebase');
                                          
                          const bookingDoc = await getDoc(doc(db, 'bookings', acceptedBooking.id));
                          if (bookingDoc.exists()) {
                            const bookingData = bookingDoc.data();
                            console.log('🔍 Force fetch result:', bookingData);
                            window.dispatchEvent(new CustomEvent('refreshBookings'));
                          }
                        } catch (error) {
                          console.error('❌ Force fetch error:', error);
                        }
                      }}
                      className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1 rounded-lg font-bold transition-colors"
                    >
                      Force Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
  
  if (showAcceptanceScreen) {
    // Get the accepted booking to display details
    const acceptedBooking = useMemo(() => {
      return bookings.find(b => 
        b.status === JobStatus.ACCEPTED && 
        b.customerName === user?.name
      );
    }, [bookings, user?.name]);
    
    // Check if there's a cancelled booking to avoid showing acceptance screen when cancelled
    const cancelledBooking = useMemo(() => {
      return bookings.find(b => 
        b.status === JobStatus.CANCELLED && 
        b.customerName === user?.name
      );
    }, [bookings, user?.name]);
    
    // DEBUG: Log the verification code status every time this renders
    if (process.env.NODE_ENV === 'development' && acceptedBooking) {
      console.log('🔄 ACCEPTANCE SCREEN RENDER - VERIFICATION CODE STATUS:', {
        bookingId: acceptedBooking.id,
        hasVerificationCode: !!acceptedBooking.verificationCode,
        verificationCode: acceptedBooking.verificationCode,
        status: acceptedBooking.status,
        customerName: acceptedBooking.customerName,
        timestamp: new Date().toISOString()
      });
    }
    
    // Don't show acceptance screen if booking has been cancelled
    if (cancelledBooking) {
      // Hide the acceptance screen if a cancellation occurred
      setShowAcceptanceScreen(false);
      // Fall through to render main UI
    } else {
      // Render acceptance screen
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
            
            {/* Verification Code Display */}
            {acceptedBooking && (
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Security Code</p>
                    <p className="text-xs font-bold text-amber-800">Share with your worker</p>
                  </div>
                </div>
                {acceptedBooking.verificationCode ? (
                  <div className="bg-white border-2 border-amber-200 rounded-xl p-4 text-center animate-in zoom-in-95">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Verification Code</p>
                    <p className="text-3xl font-black text-amber-900 tracking-widest">{acceptedBooking.verificationCode}</p>
                    <p className="text-[10px] font-bold text-gray-600 mt-2">Worker must enter this code before starting work</p>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-amber-200 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                      <p className="text-sm font-bold text-amber-700">Generating security code...</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">This may take a few seconds</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('refreshBookings'))}
                        className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-lg font-bold transition-colors"
                      >
                        Refresh Data
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const { doc, getDoc } = await import('firebase/firestore');
                            const { db } = await import('../firebase');
                                            
                            const bookingDoc = await getDoc(doc(db, 'bookings', acceptedBooking.id));
                            if (bookingDoc.exists()) {
                              const bookingData = bookingDoc.data();
                              if(process.env.NODE_ENV === 'development') {
                                console.log('🔍 FORCE FETCH RESULT:', {
                                  bookingId: acceptedBooking.id,
                                  hasCode: !!bookingData.verificationCode,
                                  code: bookingData.verificationCode,
                                  status: bookingData.status,
                                  isVerified: bookingData.isVerified
                                });
                              }
                              window.dispatchEvent(new CustomEvent('refreshBookings'));
                            }
                          } catch (error) {
                            console.error('❌ Force fetch error:', error);
                          }
                        }}
                        className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1 rounded-lg font-bold transition-colors"
                      >
                        Force Refresh
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            // Attempt to generate a verification code manually if it's missing
                            const { doc, getDoc, updateDoc } = await import('firebase/firestore');
                            const { db } = await import('../firebase');
                            
                            const bookingRef = doc(db, 'bookings', acceptedBooking.id);
                            const bookingDoc = await getDoc(bookingRef);
                            
                            if (bookingDoc.exists()) {
                              const bookingData = bookingDoc.data();
                              if (!bookingData.verificationCode) {
                                const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                                await updateDoc(bookingRef, {
                                  verificationCode: newCode,
                                  isVerified: false,
                                  updatedAt: new Date()
                                });
                                
                                console.log('🔄 GENERATED VERIFICATION CODE MANUALLY:', newCode);
                                window.dispatchEvent(new CustomEvent('refreshBookings'));
                              }
                            }
                          } catch (error) {
                            console.error('❌ Manual code generation failed:', error);
                            alert('Failed to generate verification code. Please try again or contact support.');
                          }
                        }}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg font-bold transition-colors"
                        disabled={false}
                      >
                        Generate Code
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">If code doesn't appear after 30 seconds, click 'Generate Code'</p>
                  </div>
                )}
              </div>
            )}
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
            <button onClick={() => { setIsCustomMode(true); setSelectedServiceIds([]); setAiResult(null); }} className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700/50 border border-amber-600/50 text-white rounded-2xl font-bold text-sm w-full justify-center tap-target-large touch-active">
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
          <button disabled={!customIssue.trim()} onClick={() => handleBooking(undefined, user)} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 flex items-center justify-center gap-2 tap-target-large touch-active">
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

      {/* Service Type Selection */}
      <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-3">Select Service Type</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedServiceType('carpenter')}
            className={`p-3 rounded-xl border transition-all text-center tap-target-large touch-active ${
              selectedServiceType === 'carpenter' 
                ? 'bg-orange-50 border-orange-500 shadow-inner' 
                : 'bg-gray-50 border-gray-200 hover:border-orange-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${
              selectedServiceType === 'carpenter' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <Hammer size={16} />
            </div>
            <span className={`text-[10px] font-bold ${selectedServiceType === 'carpenter' ? 'text-orange-900' : 'text-gray-600'}`}>
              Carpenter
            </span>
          </button>
          
          <button
            onClick={() => setSelectedServiceType('plumber')}
            className={`p-3 rounded-xl border transition-all text-center tap-target-large touch-active ${
              selectedServiceType === 'plumber' 
                ? 'bg-blue-50 border-blue-500 shadow-inner' 
                : 'bg-gray-50 border-gray-200 hover:border-blue-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${
              selectedServiceType === 'plumber' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <span className="text-lg font-bold">🔧</span>
            </div>
            <span className={`text-[10px] font-bold ${selectedServiceType === 'plumber' ? 'text-blue-900' : 'text-gray-600'}`}>
              Plumber
            </span>
          </button>
          
          <button
            onClick={() => setSelectedServiceType('electrician')}
            className={`p-3 rounded-xl border transition-all text-center tap-target-large touch-active ${
              selectedServiceType === 'electrician' 
                ? 'bg-yellow-50 border-yellow-500 shadow-inner' 
                : 'bg-gray-50 border-gray-200 hover:border-yellow-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${
              selectedServiceType === 'electrician' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              <span className="text-lg font-bold">⚡</span>
            </div>
            <span className={`text-[10px] font-bold ${selectedServiceType === 'electrician' ? 'text-yellow-900' : 'text-gray-600'}`}>
              Electrician
            </span>
          </button>
        </div>
      </div>

      {getCategoriesForType().map(cat => {
        // Get services for this category based on selected service type
        const servicesForCategory = selectedServiceType === 'carpenter' 
          ? SERVICES.filter(s => s.category === cat.id)
          : getServicesForType();

        return (
          <div key={cat.id} className="mb-8">
            <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest px-1 mb-3 flex items-center gap-2">
              <span>{cat.emoji}</span> {getCategoryName(cat)}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {servicesForCategory.map(service => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <button 
                    key={service.id} 
                    onClick={() => toggleService(service.id)} 
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col gap-2 group relative h-full tap-target-large ${isSelected ? 'bg-orange-50 border-orange-500 shadow-inner scale-[0.98]' : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-md active:scale-95 touch-active'}`}
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
        );
      })}



      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-bold text-amber-900">{t('active_near')}</h3>
      </div>
      
      {/* Professional Trust Verification Notice */}
      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-green-700 tracking-widest mb-1">Verified Professionals</p>
            <p className="text-sm font-bold text-green-800">All carpenters are background-checked and rated 4.5+ stars</p>
          </div>
        </div>
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
                <button className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform tap-target-large touch-active"><MessageSquare size={14} /></button>
                <button className="px-4 py-2 border border-gray-100 text-amber-900 rounded-xl text-xs font-bold active:scale-95 transition-transform tap-target-large touch-active"><Phone size={14} /></button>
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
               <button onClick={() => setSelectedServiceIds([])} className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl hover:bg-white/20 transition-all active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center tap-target-large touch-active"><X className="sm:size-5" size={16}/></button>
               <button 
                 onClick={() => handleBooking(undefined, user)} 
                 className="py-2 sm:py-3 px-4 sm:px-6 bg-orange-600 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 shadow-lg shadow-black/20 active:scale-95 transition-all hover:bg-orange-700 min-w-[100px] tap-target-large touch-active"
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
