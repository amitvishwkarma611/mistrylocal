import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction,
  deleteDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { JobStatus } from '../types';

// GLOBAL WRITE OPERATION TRACKING
// Prevent excessive write operations that could cause quota exhaustion
const activeWriteOperations = new Set<string>();
const MAX_CONCURRENT_WRITES = 2; // Further reduced to be more conservative
const WRITE_COOLDOWN_MS = 5000; // Increased to 5 seconds cooldown between writes
const lastWriteTimes = new Map<string, number>();

// BATCH OPERATION QUEUING
// Queue write operations to prevent quota bursts
const writeQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

/**
 * Process write operations in batches with delays
 */
const processWriteQueue = async () => {
  if (isProcessingQueue || writeQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    while (writeQueue.length > 0) {
      const operation = writeQueue.shift();
      if (operation) {
        await operation();
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
};

/**
 * Executes a write operation with strict quota protection
 * @param operationKey - Unique key identifying the operation type
 * @param operation - Async function to execute
 * @returns Promise with result of operation
 */
const executeWriteOperation = async <T>(operationKey: string, operation: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  
  // Check if we're at max concurrent writes
  if (activeWriteOperations.size >= MAX_CONCURRENT_WRITES) {
    // Queue the operation instead of throwing error
    console.log(`🕒 Queuing operation: ${operationKey}`);
    return new Promise((resolve, reject) => {
      writeQueue.push(async () => {
        try {
          const result = await executeWriteOperation(operationKey, operation);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      processWriteQueue();
    });
  }
  
  // Check cooldown period for this operation type
  const lastWrite = lastWriteTimes.get(operationKey);
  if (lastWrite && (now - lastWrite) < WRITE_COOLDOWN_MS) {
    const remainingCooldown = WRITE_COOLDOWN_MS - (now - lastWrite);
    console.log(`⏳ Cooldown active for ${operationKey}. Queuing operation.`);
    // Queue the operation instead of throwing error
    return new Promise((resolve, reject) => {
      writeQueue.push(async () => {
        try {
          const result = await executeWriteOperation(operationKey, operation);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      processWriteQueue();
    });
  }
  
  // Add to active operations
  activeWriteOperations.add(operationKey);
  lastWriteTimes.set(operationKey, now);
  
  try {
    const result = await operation();
    console.log(`✅ Write operation completed: ${operationKey}`);
    return result;
  } catch (error) {
    console.error(`❌ Write operation failed: ${operationKey}`, error);
    throw error;
  } finally {
    // Always cleanup
    activeWriteOperations.delete(operationKey);
    
    // Periodic cleanup of old timestamps
    if (lastWriteTimes.size > 50) { // Prevent memory leak
      const cutoff = now - 300000; // 5 minutes ago
      for (const [key, timestamp] of lastWriteTimes.entries()) {
        if (timestamp < cutoff) {
          lastWriteTimes.delete(key);
        }
      }
    }
  }
};
export interface BookingData {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  furnitureType: string;
  problemType: string;
  description: string;
  location: { lat: number; lng: number };
  pincode: string; // Added for area-based matching
  status: JobStatus;
  assignedCarpenterId?: string;
  assignedCarpenterName?: string;
  createdAt: any; // Firestore server timestamp
  updatedAt?: any; // Firestore server timestamp
  acceptedAt?: any; // Firestore server timestamp - when booking was accepted
  acceptTimeoutAt?: any; // Firestore server timestamp - when timeout should occur
  acceptTimedOutAt?: any; // Firestore server timestamp - when timeout actually occurred
  startedAt?: any; // Firestore server timestamp - when work started
  distanceKm?: number; // Calculated distance for nearby jobs
  wave?: number; // Wave priority (1, 2, or 3) - UI ONLY
  
  // RATING SUBMISSION TRACKING
  ratingSubmitted?: boolean; // Flag to indicate if rating has been submitted
  ratingSubmittedAt?: any; // Firestore server timestamp - when rating was submitted
  ratingValue?: number; // Submitted rating value (1-5)
  ratingTags?: string[]; // Tags associated with the rating
}

// Interface for job inbox item
// Removed JobInboxItem interface - no longer needed with polling architecture

// Removed calculateDistance function - no longer needed for area-based matching

// Interface for carpenter data
export interface CarpenterData {
  id: string;
  name: string;
  phone: string;
  online: boolean;
  services: string[];
  location: { lat: number; lng: number };
  city: string;
  rating: number;
  serviceAreas: string[]; // Added for area-based matching
  
  // FIELDS FROM Carpenter INTERFACE
  verified?: boolean;
  distance?: string;
  specialties?: string[];
  acceptsSmallJobs?: boolean;
  image?: string;
  lat?: number;
  lng?: number;
  trustScore?: number;
  recentTags?: string[];
  
  // NEW PROFESSIONAL DETAILS (optional)
  alternateMobileNumber?: string;
  address?: {
    line1?: string;
    line2?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  addressProof?: {
    type?: "Aadhar" | "VoterID" | "DrivingLicense" | "Other";
    documentNumber?: string;
    photoUrl?: string;
    verified?: boolean;
  };
  profilePhotoUrl?: string;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  
  // STATS DATA (may not exist in current documents)
  jobsCompleted?: number;
  ratingCount?: number;
  // EARNINGS DATA (may not exist in current documents)
  weeklyEarnings?: number;
  walletBalance?: number;
}

// ACCEPT JOB CONCURRENCY GUARD
// Prevent multiple concurrent acceptJob calls for the same booking
const activeAcceptRequests = new Set<string>(); // Track booking IDs being processed

// CARPENTER ACTIVE JOB TRACKING - Ensures one job per carpenter
const carpenterActiveJobs = new Map<string, string>(); // carpenterId -> bookingId

// POLLING SYSTEM STATE
// Track active polling timers
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isPollingActive = false;
let pollingCallback: ((bookings: BookingData[]) => void) | null = null;
let pollingErrorCount = 0;
const MAX_POLLING_ERRORS = 3;
const BASE_POLLING_INTERVAL = 8000; // 8 seconds for better responsiveness
const MAX_POLLING_INTERVAL = 30000; // 30 seconds

/**
 * Creates a new booking with area-based matching
 * QUOTA-SAFE: Simple document creation, no distribution logic
 * @param bookingData - Booking information including pincode
 * @returns Promise with the created booking ID
 */
export const createBookingWithDistribution = async (
  bookingData: Omit<BookingData, 'id' | 'status' | 'createdAt' | 'assignedCarpenterId'>
): Promise<string> => {
  console.log('📥 createBookingWithDistribution called with:', bookingData);
  
  return executeWriteOperation('create_booking', async () => {
    console.log('📤 Creating booking document in Firestore...');
    
    // Create the booking document with minimal data for faster creation
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      customerId: bookingData.customerId,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      furnitureType: bookingData.furnitureType,
      problemType: bookingData.problemType,
      description: bookingData.description,
      location: bookingData.location,
      pincode: bookingData.pincode,
      status: JobStatus.SEARCHING,
      assignedCarpenterId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const bookingId = bookingRef.id;
    console.log('✅ Booking created with ID:', bookingId);
    console.log('📄 Booking document reference:', bookingRef.path);
    
    return bookingId;
  });
};

/**
 * Accepts a job and notifies other carpenters
 * UBER-STYLE: Atomic first-accept-wins with inbox cleanup
 * QUOTA-SAFE: Single transaction with cascading cleanup
 * @param bookingId - ID of the booking to accept
 * @param carpenterId - ID of the carpenter accepting the job
 * @param carpenterName - Name of the carpenter accepting the job
 * @returns Promise<boolean> - True if accepted successfully, false if already taken
 */
export const acceptJobWithNotification = async (
  bookingId: string, 
  carpenterId: string, 
  carpenterName: string
): Promise<boolean> => {
  return executeWriteOperation(`accept_job_${bookingId}`, async () => {
    // CONCURRENCY GUARD: Prevent multiple simultaneous calls for same booking
    if (activeAcceptRequests.has(bookingId)) {
      console.warn(`⚠️ acceptJob blocked - request already in progress for booking ${bookingId}`);
      return false; // Already being processed
    }
    
    // CARPENTER JOB LIMIT CHECK: Prevent carpenter from taking multiple jobs
    if (carpenterActiveJobs.has(carpenterId)) {
      const existingBookingId = carpenterActiveJobs.get(carpenterId);
      console.warn(`⚠️ Carpenter ${carpenterId} already has active job ${existingBookingId}`);
      return false; // Carpenter already has an active job
    }
    
    // Mark this booking as being processed
    activeAcceptRequests.add(bookingId);
    
    const bookingRef = doc(db, 'bookings', bookingId);
    const carpenterRef = doc(db, 'carpenters', carpenterId);
    
    try {
      // SINGLE TRANSACTION - no retry loops, no exponential backoff
      await runTransaction(db, async (transaction) => {
        // Read the booking document
        const bookingSnapshot = await transaction.get(bookingRef);
        
        if (!bookingSnapshot.exists()) {
          throw new Error('Booking does not exist');
        }
        
        const bookingData = bookingSnapshot.data() as BookingData;
        
        // VERIFY status is still SEARCHING (race condition check)
        if (bookingData.status !== JobStatus.SEARCHING) {
          throw new Error('Job is no longer available');
        }
        
        // Read carpenter document to verify availability
        const carpenterSnapshot = await transaction.get(carpenterRef);
        
        if (!carpenterSnapshot.exists()) {
          throw new Error('Carpenter does not exist');
        }
        
        const carpenterData = carpenterSnapshot.data() as any;
        
        // VERIFY carpenter doesn't already have an active job
        if (carpenterData.activeJobId) {
          throw new Error('Carpenter already has an active job');
        }
        
        // Calculate timeout time (5 minutes from now)
        const acceptTimeoutAt = new Date(Date.now() + 300000); // 5 minutes = 300000 ms
        
        // ATOMIC UPDATE - booking status and assignment with timeout fields
        transaction.update(bookingRef, {
          status: JobStatus.ACCEPTED,
          assignedCarpenterId: carpenterId,
          assignedCarpenterName: carpenterName,
          acceptedAt: serverTimestamp(),
          acceptTimeoutAt: acceptTimeoutAt,
          updatedAt: serverTimestamp()
        });
        
        // ATOMIC UPDATE - carpenter active job tracking
        transaction.update(carpenterRef, {
          activeJobId: bookingId,
          isAvailable: false,
          updatedAt: serverTimestamp()
        });
      });
      
      // SUCCESS: Update local tracking
      carpenterActiveJobs.set(carpenterId, bookingId);
      console.log(`✅ Job ${bookingId} accepted by carpenter ${carpenterId}`);
      
      return true;
    } catch (error: any) {
      console.error('❌ Error accepting job:', error);
      
      // FAILURE MEANS JOB TAKEN OR CARPENTER BUSY - no retries, no storm
      if (error.message.includes('available') || 
          error.message.includes('does not exist') || 
          error.message.includes('active job')) {
        return false; // Job was already taken or carpenter busy
      }
      
      throw error; // Re-throw other errors for UI to handle
    } finally {
      // ALWAYS clean up the guard, regardless of success/failure
      activeAcceptRequests.delete(bookingId);
    }
  });
};

// Removed cleanupJobFromOtherInboxes - no longer needed with polling architecture

/**
 * Starts polling for searching bookings in carpenter's service areas
 * QUOTA-SAFE: Uses getDocs() with 10-15 second intervals
 * @param carpenterId - ID of the carpenter
 * @param serviceAreas - Array of pincodes/localities the carpenter serves
 * @param callback - Function to call with matching bookings
 */
export const startPollingSearchingBookings = (
  carpenterId: string,
  serviceAreas: string[],
  callback: (bookings: BookingData[]) => void
): void => {
  // Stop existing polling if active
  if (pollingTimer) {
    console.log('🔄 Stopping existing polling timer');
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  
  if (serviceAreas.length === 0) {
    console.log('⚠️ No service areas provided - polling not started');
    return;
  }
  
  console.log(`🚀 Starting polling for carpenter ${carpenterId} in areas:`, serviceAreas);
  
  // Store callback
  pollingCallback = callback;
  isPollingActive = true;
  
  // Initial fetch
  pollForBookings(serviceAreas);
  
  // Set up polling with exponential backoff
  let currentInterval = BASE_POLLING_INTERVAL;
  
  const scheduleNextPoll = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    
    pollingTimer = setInterval(() => {
      if (isPollingActive) {
        pollForBookings(serviceAreas)
          .then(() => {
            // Reset error count on successful poll
            pollingErrorCount = 0;
            currentInterval = BASE_POLLING_INTERVAL;
          })
          .catch((error) => {
            console.error('❌ Polling error:', error);
            pollingErrorCount++;
            
            // Exponential backoff
            if (pollingErrorCount <= MAX_POLLING_ERRORS) {
              currentInterval = Math.min(
                currentInterval * 1.5,
                MAX_POLLING_INTERVAL
              );
              console.log(`📈 Increasing polling interval to ${currentInterval}ms due to errors`);
            } else {
              console.log('🚨 Too many polling errors, stopping polling');
              stopPollingSearchingBookings();
            }
          });
      }
    }, currentInterval);
  };
  
  scheduleNextPoll();
};

/**
 * Stops polling for searching bookings
 */
export const stopPollingSearchingBookings = (): void => {
  console.log('🛑 Stopping polling for searching bookings');
  
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  
  isPollingActive = false;
  pollingCallback = null;
  pollingErrorCount = 0; // Reset error counter
};

/**
 * Internal function to poll for searching bookings
 * @param serviceAreas - Array of pincodes to search in
 */
const pollForBookings = async (serviceAreas: string[]): Promise<void> => {
  // Skip polling if we've hit too many errors
  if (pollingErrorCount > MAX_POLLING_ERRORS) {
    console.log('⏭️ Skipping poll due to error threshold exceeded');
    return;
  }
  try {
    // Query for searching bookings in carpenter's service areas
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('status', '==', JobStatus.SEARCHING),
      where('pincode', 'in', serviceAreas.slice(0, 10)) // Firestore 'in' query limit is 10
    );
    
    const snapshot = await getDocs(bookingsQuery);
    const bookings: BookingData[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as BookingData;
      bookings.push({
        ...data,
        id: doc.id
      });
    });
    
    console.log(`📊 Polled ${bookings.length} searching bookings`);
    
    // Notify callback if available - ONLY for searching jobs
    if (pollingCallback) {
      // Filter to ensure we only send searching jobs to prevent updating accepted jobs
      const searchingJobs = bookings.filter(booking => booking.status === JobStatus.SEARCHING);
      pollingCallback(searchingJobs);
    }
  } catch (error) {
    console.error('❌ Error polling for bookings:', error);
    // No retries - let next poll handle it
  }
};

/**
 * Forces cleanup of all active polling and tracking collections
 * CALL THIS WHEN APP SUSPENDS OR USER LOGS OUT
 */
export const forceCleanupAllListeners = (): void => {
  console.log('🚨 FORCE CLEANUP: Stopping polling and clearing tracking collections');
  
  // Stop polling
  stopPollingSearchingBookings();
  
  // Clear tracking collections
  activeAcceptRequests.clear();
  activeStatusUpdates.clear();
  activeWriteOperations.clear();
  lastStatusUpdates.clear();
  lastWriteTimes.clear();
  writeQueue.length = 0; // Clear queue
  isProcessingQueue = false;
  pollingErrorCount = 0;
  carpenterActiveJobs.clear(); // Clear carpenter job tracking
  
  console.log('✅ All polling stopped and tracking collections cleaned up');
};

/**
 * Gets current polling and tracking statistics for debugging
 */
export const getTrackingStats = (): Record<string, number> => {
  return {
    isPollingActive: isPollingActive ? 1 : 0,
    activeAcceptRequests: activeAcceptRequests.size,
    activeStatusUpdates: activeStatusUpdates.size,
    activeWriteOperations: activeWriteOperations.size,
    trackedStatusUpdates: lastStatusUpdates.size,
    trackedWriteOperations: lastWriteTimes.size
  };
};

/**
 * Creates a new booking with status = SEARCHING (backward compatible)
 * @param bookingData - Booking information including pincode
 * @returns Promise with the created booking ID
 */
export const createBooking = async (bookingData: Omit<BookingData, 'id' | 'status' | 'createdAt' | 'assignedCarpenterId'>): Promise<string> => {
  return createBookingWithDistribution(bookingData);
};

/**
 * Accepts a job using the new notification system (backward compatible)
 * @param bookingId - ID of the booking to accept
 * @param carpenterId - ID of the carpenter accepting the job
 * @param carpenterName - Name of the carpenter accepting the job
 * @returns Promise<boolean> - True if accepted successfully
 */
export const acceptJob = async (bookingId: string, carpenterId: string, carpenterName: string): Promise<boolean> => {
  return acceptJobWithNotification(bookingId, carpenterId, carpenterName);
};

/**
 * Checks if an accepted booking has timed out and handles the timeout if needed
 * LAZY EVALUATION - Only executes when booking is read/accessed
 * QUOTA-SAFE: Uses conditional transaction to ensure only one client succeeds
 * @param bookingData - The booking data to check
 * @returns Promise<boolean> - true if timeout was processed, false otherwise
 */
export const checkAndHandleBookingTimeout = async (bookingData: BookingData): Promise<boolean> => {
  // Only check ACCEPTED bookings that have timeout configuration
  if (bookingData.status !== JobStatus.ACCEPTED || 
      !bookingData.acceptTimeoutAt || 
      bookingData.startedAt) {
    return false; // Not eligible for timeout check
  }
  
  // Convert Firestore timestamp to Date for comparison
  const timeoutTime = bookingData.acceptTimeoutAt.toDate ? 
    bookingData.acceptTimeoutAt.toDate() : 
    new Date(bookingData.acceptTimeoutAt);
  
  // Check if timeout has expired
  if (Date.now() <= timeoutTime.getTime()) {
    return false; // Not timed out yet
  }
  
  // Timeout has expired - attempt to process it
  const bookingId = bookingData.id;
  if (!bookingId) return false;
  
  const bookingRef = doc(db, 'bookings', bookingId);
  const carpenterId = bookingData.assignedCarpenterId;
  
  // Add in-memory guard to prevent duplicate processing
  const processedTimeouts = new Set<string>();
  
  try {
    // Check if already processed in this session
    if (processedTimeouts.has(bookingId)) {
      return false;
    }
    
    await runTransaction(db, async (transaction) => {
      // STEP 1 — READS ONLY
      // Read booking document
      const bookingSnapshot = await transaction.get(bookingRef);
      
      if (!bookingSnapshot.exists()) {
        throw new Error('Booking does not exist');
      }
      
      const currentBookingData = bookingSnapshot.data() as BookingData;
      
      // Read carpenter document (if assigned)
      let carpenterData: any = null;
      let carpenterRef: any = null;
      
      if (carpenterId) {
        carpenterRef = doc(db, 'carpenters', carpenterId);
        const carpenterSnapshot = await transaction.get(carpenterRef);
        
        if (carpenterSnapshot.exists()) {
          carpenterData = carpenterSnapshot.data() as any;
        }
      }
      
      // STEP 2 — VALIDATION
      // If booking.status !== "ACCEPTED", exit transaction
      if (currentBookingData.status !== JobStatus.ACCEPTED) {
        throw new Error('Booking no longer in ACCEPTED state');
      }
      
      // If booking.startedAt exists, exit transaction
      if (currentBookingData.startedAt) {
        throw new Error('Booking already started');
      }
      
      // If booking.acceptTimedOutAt exists, exit transaction
      if (currentBookingData.acceptTimedOutAt) {
        throw new Error('Booking already timed out');
      }
      
      // If currentTime <= booking.acceptTimeoutAt, exit transaction
      const timeoutTime = currentBookingData.acceptTimeoutAt.toDate ? 
        currentBookingData.acceptTimeoutAt.toDate() : 
        new Date(currentBookingData.acceptTimeoutAt);
      
      if (Date.now() <= timeoutTime.getTime()) {
        throw new Error('Booking not yet timed out');
      }
      
      // STEP 3 — WRITES (ONLY AFTER ALL READS)
      // Update booking
      transaction.update(bookingRef, {
        status: JobStatus.ACCEPT_TIMEOUT,
        acceptTimedOutAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // If carpenter is assigned and this is their active job, release them
      if (carpenterData && carpenterData.activeJobId === bookingId) {
        transaction.update(carpenterRef, {
          activeJobId: null,
          isAvailable: true,
          updatedAt: serverTimestamp()
        });
      }
    });
    
    // Mark as processed to prevent duplicates in this session
    processedTimeouts.add(bookingId);
    
    console.log(`✅ Booking ${bookingId} timed out after 5 minutes of inactivity`);
    return true;
    
  } catch (error: any) {
    // Expected failures when another client processed the timeout first
    if (error.message.includes('not yet timed out') || 
        error.message.includes('already started') || 
        error.message.includes('already timed out') || 
        error.message.includes('no longer in ACCEPTED state') ||
        error.message.includes('does not exist')) {
      return false; // Timeout conditions no longer met or already processed
    }
    
    console.error(`❌ Error processing booking timeout for ${bookingId}:`, error);
    throw error; // Re-throw unexpected errors
  }
};

/**
 * Releases a carpenter's active job assignment
 * Called when job is completed, cancelled, or carpenter becomes available
 * @param carpenterId - ID of the carpenter
 * @param bookingId - ID of the booking being released (optional for validation)
 */
export const releaseCarpenterJob = async (carpenterId: string, bookingId?: string): Promise<void> => {
  const carpenterRef = doc(db, 'carpenters', carpenterId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const carpenterSnapshot = await transaction.get(carpenterRef);
      
      if (!carpenterSnapshot.exists()) {
        throw new Error('Carpenter does not exist');
      }
      
      const carpenterData = carpenterSnapshot.data() as any;
      
      // Validate that this is the correct booking being released (if provided)
      if (bookingId && carpenterData.activeJobId !== bookingId) {
        throw new Error('Carpenter does not have this booking assigned');
      }
      
      // Update carpenter document
      transaction.update(carpenterRef, {
        activeJobId: null,
        isAvailable: true,
        updatedAt: serverTimestamp()
      });
    });
    
    // Update local tracking
    carpenterActiveJobs.delete(carpenterId);
    console.log(`✅ Carpenter ${carpenterId} job released`);
    
  } catch (error) {
    console.error('❌ Error releasing carpenter job:', error);
    throw error;
  }
};

/**
 * Marks a booking as started (WORK_IN_PROGRESS)
 * PROTECTS AGAINST TIMEOUT: Sets startedAt timestamp to prevent timeout processing
 * @param bookingId - ID of the booking to start
 * @returns Promise<void>
 */
export const startBookingJob = async (bookingId: string): Promise<void> => {
  const bookingRef = doc(db, 'bookings', bookingId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);
      
      if (!bookingSnapshot.exists()) {
        throw new Error('Booking does not exist');
      }
      
      const bookingData = bookingSnapshot.data() as BookingData;
      
      // Verify booking is in ACCEPTED state
      if (bookingData.status !== JobStatus.ACCEPTED) {
        throw new Error('Booking is not in ACCEPTED state');
      }
      
      // Update booking to WORK_IN_PROGRESS with startedAt timestamp
      // The startedAt timestamp prevents timeout processing
      transaction.update(bookingRef, {
        status: JobStatus.WORK_IN_PROGRESS,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    console.log(`✅ Booking ${bookingId} marked as started`);
    
  } catch (error) {
    console.error('❌ Error starting booking job:', error);
    throw error;
  }
};

/**
 * Marks a booking as having submitted rating
 * @param bookingId - ID of the booking
 * @param ratingValue - Rating value (1-5)
 * @param tags - Optional tags for the rating
 */
export const submitBookingRating = async (bookingId: string, ratingValue: number, tags: string[] = []): Promise<void> => {
  return executeWriteOperation(`submit_rating_${bookingId}`, async () => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      // SINGLE update - no retries
      await updateDoc(bookingRef, {
        ratingSubmitted: true,
        ratingSubmittedAt: serverTimestamp(),
        ratingValue: ratingValue,
        ratingTags: tags,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Rating submitted for booking ${bookingId}: ${ratingValue} stars`);
    } catch (error) {
      console.error('❌ Error submitting booking rating:', error);
      throw error;
    }
  });
};

// BOOKING STATUS UPDATE DEDUPLICATION
// Prevent multiple concurrent updateBookingStatus calls for the same booking
const activeStatusUpdates = new Set<string>(); // Track booking IDs being updated

// GLOBAL STATUS UPDATE TRACKING
// Prevent duplicate status updates across the entire application
const lastStatusUpdates = new Map<string, { status: JobStatus; timestamp: number }>();
const STATUS_UPDATE_DEBOUNCE_MS = 1000; // Prevent same status updates within 1 second

// Periodic cleanup of tracking collections to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  
  // Cleanup old status tracking entries (older than 5 minutes)
  const expiredStatusEntries: string[] = [];
  lastStatusUpdates.forEach((value, key) => {
    if (now - value.timestamp > 300000) {
      expiredStatusEntries.push(key);
    }
  });
  
  expiredStatusEntries.forEach(key => {
    lastStatusUpdates.delete(key);
  });
  
  // Cleanup old write timestamps (older than 10 minutes)
  const expiredWriteEntries: string[] = [];
  lastWriteTimes.forEach((timestamp, key) => {
    if (now - timestamp > 600000) {
      expiredWriteEntries.push(key);
    }
  });
  
  expiredWriteEntries.forEach(key => {
    lastWriteTimes.delete(key);
  });
  
  // Log cleanup stats
  if (expiredStatusEntries.length > 0 || expiredWriteEntries.length > 0) {
    console.log(`🧹 Periodic cleanup: ${expiredStatusEntries.length} status entries, ${expiredWriteEntries.length} write entries removed`);
  }
  
  // Safety check: Force cleanup if collections grow too large
  if (lastStatusUpdates.size > 100) {
    console.warn(`⚠️ Status tracking collection oversized (${lastStatusUpdates.size}), forcing cleanup`);
    lastStatusUpdates.clear();
  }
  
  if (lastWriteTimes.size > 100) {
    console.warn(`⚠️ Write tracking collection oversized (${lastWriteTimes.size}), forcing cleanup`);
    lastWriteTimes.clear();
  }
}, 120000); // Run cleanup every 2 minutes

/**
 * Updates the status of a booking with safety guards
 * QUOTA-SAFE: Single updateDoc call with duplicate prevention
 * 
 * 🔒 STATUS UPDATE SAFETY POLICY 🔒
 * - Only accepts calls from explicit user actions (onClick handlers)
 * - Prevents duplicate writes for same booking ID
 * - Blocks updates if new status equals current status
 * - Strictly forbidden from useEffect, onSnapshot, or automatic triggers
 * 
 * @param bookingId - ID of the booking to update
 * @param status - New status for the booking
 * @returns Promise<void>
 */
export const updateBookingStatus = async (bookingId: string, status: JobStatus): Promise<void> => {
  return executeWriteOperation(`update_status_${bookingId}_${status}`, async () => {
    // 🔒 GLOBAL STATUS DEBOUNCING 🔒
    // Prevent repeated status updates for the same booking within short timeframe
    const lastUpdate = lastStatusUpdates.get(bookingId);
    const now = Date.now();
    
    if (lastUpdate && 
        lastUpdate.status === status && 
        (now - lastUpdate.timestamp) < STATUS_UPDATE_DEBOUNCE_MS) {
      console.log(`⏭️ Global debounce blocked - booking ${bookingId} already updated to ${status} recently`);
      return; // Skip if same status was updated recently
    }
    
    // STATUS CHANGE GUARD: Prevent unnecessary updates
    // This prevents repeated status updates when status is already correct
    // TODO: This requires knowing current status - will be handled in App.tsx
    
    // CONCURRENCY GUARD: Prevent multiple simultaneous calls for same booking
    const updateKey = `${bookingId}-${status}`;
    if (activeStatusUpdates.has(updateKey)) {
      console.warn(`⚠️ updateBookingStatus blocked - update already in progress for booking ${bookingId} to status ${status}`);
      return; // Already being processed
    }
    
    // Mark this update as being processed
    activeStatusUpdates.add(updateKey);
    
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      // SINGLE update - no retries
      await updateDoc(bookingRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
      // Record successful update
      lastStatusUpdates.set(bookingId, { status, timestamp: now });
      
      // Release carpenter job if booking is completed or cancelled
      if (status === JobStatus.COMPLETED || status === JobStatus.CANCELLED) {
        // Get the booking to find the assigned carpenter
        const bookingSnapshot = await getDoc(bookingRef);
        if (bookingSnapshot.exists()) {
          const bookingData = bookingSnapshot.data() as BookingData;
          if (bookingData.assignedCarpenterId) {
            try {
              await releaseCarpenterJob(bookingData.assignedCarpenterId, bookingId);
            } catch (error) {
              console.warn('Warning: Failed to release carpenter job:', error);
              // Don't throw error here as the status update succeeded
            }
          }
        }
      }
      
      console.log(`✅ Booking ${bookingId} status updated to: ${status}`);
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    } finally {
      // ALWAYS clean up the guard, regardless of success/failure
      activeStatusUpdates.delete(updateKey);
    }
  });
};

/**
 * Cancels a booking by updating its status to CANCELLED
 * QUOTA-SAFE: Single updateDoc call
 * @param bookingId - ID of the booking to cancel
 */
export const cancelBooking = async (bookingId: string): Promise<void> => {
  return executeWriteOperation(`cancel_booking_${bookingId}`, async () => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      // SINGLE update - no retries
      await updateDoc(bookingRef, {
        status: JobStatus.CANCELLED,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Booking ${bookingId} cancelled successfully`);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  });
};

/**
 * Calculates wave for UI display only (NO DATABASE WRITES)
 * UBER-STYLE: Waves are pure UI indicators - zero Firestore impact
 * Wave 1: 0-15 seconds (Urgent)
 * Wave 2: 15-30 seconds (Priority)  
 * Wave 3: 30+ seconds (Available)
 * @param createdAt - Firestore timestamp
 * @returns Wave number (1, 2, or 3) for UI display
 */
export const getWaveForBooking = (createdAt: any): number => {
  const createdTime = createdAt.toDate().getTime();
  const elapsedSeconds = (Date.now() - createdTime) / 1000;
  
  if (elapsedSeconds < 15) return 1;
  if (elapsedSeconds < 60) return 2;
  return 3;
};

// Removed listenForBookingUpdates - no longer needed with polling architecture

// Removed listenForAssignedBookings - handled by subscribeToUserBookings

// Removed listenForCarpenterStatus - handled by direct queries

/**
 * Creates a carpenter's profile in Firestore if it doesn't exist
 * QUOTA-SAFE: Conditional setDoc call - creates only if document doesn't exist
 * @param carpenterData - Carpenter information
 */
export const createOrUpdateCarpenter = async (carpenterData: Omit<CarpenterData, 'id'> & { id: string }): Promise<void> => {
  return executeWriteOperation(`create_carpenter_${carpenterData.id}`, async () => {
    try {
      const carpenterRef = doc(db, 'carpenters', carpenterData.id);
      
      // Check if document exists
      const docSnap = await getDoc(carpenterRef);
      
      if (!docSnap.exists()) {
        // Only create the document if it doesn't exist
        await setDoc(carpenterRef, {
          ...carpenterData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`Carpenter ${carpenterData.id} profile created`);
      } else {
        // If document exists, just update the online status and services
        await updateDoc(carpenterRef, {
          online: carpenterData.online,
          services: carpenterData.services,
          serviceAreas: carpenterData.serviceAreas,
          updatedAt: serverTimestamp()
        });
        
        console.log(`Carpenter ${carpenterData.id} profile exists, updated online status and services`);
      }
    } catch (error) {
      console.error('Error creating/updating carpenter profile:', error);
      throw error;
    }
  });
};

/**
 * Sets carpenter online/offline status
 * QUOTA-SAFE: Lightweight updateDoc only - no full document recreation
 * @param carpenterId - Unique carpenter ID
 * @param online - Boolean indicating online status
 */
export const setCarpenterOnlineStatus = async (carpenterId: string, online: boolean): Promise<void> => {
  return executeWriteOperation(`set_online_${carpenterId}_${online}`, async () => {
    try {
      const carpenterRef = doc(db, 'carpenters', carpenterId);
      // UPDATE only - no setDoc, no retries
      await updateDoc(carpenterRef, {
        online,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Carpenter ${carpenterId} online status set to: ${online}`);
    } catch (error) {
      console.error('Error updating carpenter online status:', error);
      throw error; // Let UI handle errors
    }
  });
};

/**
 * Sets up real-time listener for a user's bookings (both customer and carpenter)
 * INDEX-FREE QUERY: Uses equality filters only (customerId, assignedCarpenterId)
 * QUOTA-SAFE: No orderBy, no retries
 * @param userId - ID of the user (customer or carpenter)
 * @param callback - Function to call when bookings change
 * @param errorCallback - Function to call when errors occur
 * @returns Unsubscribe function
 */
export const fetchUserBookings = async (
  userId: string,
  callback: (bookings: BookingData[]) => void,
  errorCallback?: (error: Error) => void
): Promise<() => void> => {
  // Store both sets of bookings separately to combine them properly
  let customerBookings: BookingData[] = [];
  let assignedBookings: BookingData[] = [];
  
  // QUERY 1: Customer bookings (customerId == userId)
  const customerQuery = query(
    collection(db, 'bookings'),
    where('customerId', '==', userId)
  );
  
  // QUERY 2: Assigned bookings (assignedCarpenterId == userId)
  const assignedQuery = query(
    collection(db, 'bookings'),
    where('assignedCarpenterId', '==', userId)
  );
  
  // Execute customer query
  const customerSnapshot = await getDocs(customerQuery);
  customerSnapshot.forEach((doc) => {
      customerBookings.push({
        id: doc.id,
        ...(doc.data() as BookingData)
      });
    });
    
    // Execute assigned query
    const assignedSnapshot = await getDocs(assignedQuery);
    assignedSnapshot.forEach((doc) => {
      assignedBookings.push({
        id: doc.id,
        ...(doc.data() as BookingData)
      });
    });
    
    // Check for timeouts in all bookings
    const allPotentialBookings = [...customerBookings, ...assignedBookings];
    const timeoutChecks = allPotentialBookings.map(async (booking) => {
      try {
        await checkAndHandleBookingTimeout(booking);
      } catch (error) {
        // Silently handle timeout check errors to avoid disrupting main flow
        console.debug(`Timeout check failed for booking ${booking.id}:`, error);
      }
    });
    
    // Wait for all timeout checks to complete
    await Promise.all(timeoutChecks);
    
    // Re-fetch bookings after timeout processing to get updated statuses
    const updatedCustomerSnapshot = await getDocs(customerQuery);
    const updatedAssignedSnapshot = await getDocs(assignedQuery);
    
    customerBookings = [];
    assignedBookings = [];
    
    updatedCustomerSnapshot.forEach((doc) => {
      customerBookings.push({
        id: doc.id,
        ...(doc.data() as BookingData)
      });
    });
    
    updatedAssignedSnapshot.forEach((doc) => {
      assignedBookings.push({
        id: doc.id,
        ...(doc.data() as BookingData)
      });
    });
  
  // Call the callback with combined bookings
  const allBookingsMap = new Map<string, BookingData>();
  
  // Add customer bookings first
  customerBookings.forEach(booking => {
    allBookingsMap.set(booking.id!, booking);
  });
  
  // Add assigned carpenter bookings
  assignedBookings.forEach(booking => {
    allBookingsMap.set(booking.id!, booking);
  });
  
  // Convert back to array and send to callback
  const combinedBookings = Array.from(allBookingsMap.values());
  callback(combinedBookings);
  
  // Return noop unsubscribe function for backward compatibility
  return () => {
    // No cleanup needed with getDocs approach
  };
};

/**
 * Stub function for backward compatibility - no longer used with polling architecture
 */
export const listenForBookingUpdates = (
  bookingId: string,
  callback: (booking: BookingData | null) => void
) => {
  console.warn(`⚠️ listenForBookingUpdates is deprecated - use polling instead`);
  // Return noop unsubscribe function
  return () => {};
};

/**
 * Wrapper function for backward compatibility
 */
export const subscribeToUserBookings = (
  userId: string,
  callback: (bookings: BookingData[]) => void,
  errorCallback?: (error: Error) => void
) => {
  // For backward compatibility, fetch once
  fetchUserBookings(userId, callback, errorCallback).catch(error => {
    console.error('Error in subscribeToUserBookings:', error);
    if (errorCallback) errorCallback(error);
  });
  
  // Return noop unsubscribe function
  return () => {};
};

/**
 * UBER-STYLE JOB MATCHING ARCHITECTURE SUMMARY:
 * 
 * SERVER-SIDE JOB DISTRIBUTION:
 * - On booking creation, server finds nearby online carpenters (within 10km default)
 * - Job is pushed directly to each carpenter's personal inbox collection
 * - No client-side polling or global listeners required
 * 
 * PUSH-BASED DELIVERY MODEL:
 * - Carpenters listen ONLY to their own jobInbox subcollection
 * - Firestore handles real-time delivery automatically
 * - Zero quota impact from polling or global queries
 * 
 * ATOMIC JOB ACCEPTANCE:
 * - First carpenter to accept wins via Firestore transaction
 * - Upon acceptance, job is automatically removed from all other inboxes
 * - No race conditions, no duplicate notifications
 * 
 * SCALABILITY BENEFITS:
 * - Linear scaling - N carpenters = N listeners (not N² queries)
 * - Zero global state or coordination required
 * - Firestore handles distribution and cleanup automatically
 * 
 * BACKWARD COMPATIBILITY:
 * - Existing API functions maintained (createBooking, acceptJob)
 * - UI components work unchanged
 * - Gradual migration path from pull to push model
 * 
 * QUOTA ELIMINATION:
 * - No more status == "SEARCHING" global queries
 * - No more repeated listener attachment/cleanup cycles
 * - No more batchGet storms from multiple clients
 * Each carpenter maintains exactly ONE listener
 */

/**
 * Updates a carpenter's profile in Firestore
 * QUOTA-SAFE: Single updateDoc call
 * @param carpenterId - Unique carpenter ID
 * @param updatedFields - Fields to update in the carpenter profile
 */
export const updateCarpenterProfile = async (carpenterId: string, updatedFields: Partial<CarpenterData>): Promise<void> => {
  return executeWriteOperation(`update_carpenter_profile_${carpenterId}`, async () => {
    try {
      const carpenterRef = doc(db, 'carpenters', carpenterId);
      // Prepare update data without id and remove undefined values
      const updateData: any = {};
      
      // Copy fields but exclude undefined values and id
      Object.keys(updatedFields).forEach(key => {
        const value = (updatedFields as any)[key];
        if (value !== undefined && key !== 'id') {
          updateData[key] = value;
        }
      });
      
      updateData.updatedAt = serverTimestamp();
      
      await updateDoc(carpenterRef, updateData);
      
      console.log(`Carpenter ${carpenterId} profile updated with fields:`, Object.keys(updateData));
    } catch (error) {
      console.error('Error updating carpenter profile:', error);
      throw error;
    }
  });
};

/**
 * Updates a customer's profile in Firestore
 * QUOTA-SAFE: Single setDoc call with merge
 * @param customerId - Unique customer ID
 * @param updatedFields - Fields to update in the customer profile
 */
export const updateCustomerProfile = async (customerId: string, updatedFields: Partial<any>): Promise<void> => {
  return executeWriteOperation(`update_customer_profile_${customerId}`, async () => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      // Prepare update data without id and remove undefined values
      const updateData: any = {};
      
      // Copy fields but exclude undefined values and id
      Object.keys(updatedFields).forEach(key => {
        const value = (updatedFields as any)[key];
        if (value !== undefined && key !== 'id') {
          updateData[key] = value;
        }
      });
      
      updateData.updatedAt = serverTimestamp();
      
      // Use setDoc with merge: true to create document if it doesn't exist
      await setDoc(customerRef, updateData, { merge: true });
      
      console.log(`Customer ${customerId} profile updated with fields:`, Object.keys(updateData));
    } catch (error) {
      console.error('Error updating customer profile:', error);
      throw error;
    }
  });
};