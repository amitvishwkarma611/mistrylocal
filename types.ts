
export enum AppRole {
  CUSTOMER = 'CUSTOMER',
  CARPENTER = 'CARPENTER'
}

export enum JobStatus {
  SEARCHING = 'SEARCHING',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  ACCEPT_TIMEOUT = 'ACCEPT_TIMEOUT',
  ON_THE_WAY = 'ON_THE_WAY',
  ARRIVED = 'ARRIVED',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Service {
  id: string;
  title: string;
  titleHindi: string;
  titlePunjabi: string;
  description: string;
  icon: string;
  basePrice?: number;
  category: 'repair' | 'fitting' | 'custom' | 'special' | 'cleaning';
}

export interface Address {
  line1?: string;
  line2?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AddressProof {
  type?: "Aadhar" | "VoterID" | "DrivingLicense" | "Other";
  documentNumber?: string;
  photoUrl?: string;
  verified?: boolean;
}

export interface Carpenter {
  id: string;
  name: string;
  phone: string;
  rating: number;
  ratingCount: number;
  jobsCompleted: number;
  verified: boolean;
  distance: string;
  specialties: string[];
  acceptsSmallJobs: boolean;
  image: string;
  lat: number;
  lng: number;
  trustScore: number;
  recentTags?: string[];
  serviceAreas?: string[]; // Added for area-based matching
  serviceArea?: string; // Primary service area for geographic restriction
  
  // PROFESSION FIELD (NEW - for auto-set feature)
  profession?: string; // "carpenter" | "plumber" | "electrician" - optional for backward compatibility
  
  // NEW PROFESSIONAL DETAILS (optional)
  alternateMobileNumber?: string;
  address?: Address;
  addressProof?: AddressProof;
  profilePhotoUrl?: string;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  
  // EARNINGS DATA (may not exist in current documents)
  weeklyEarnings?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: Address;
  profilePhotoUrl?: string;
  registrationDate?: any; // Firestore Timestamp
  lastActive?: any; // Firestore Timestamp
  totalBookings?: number;
  rating?: number;
}

export interface Booking {
  id: string;
  service: string;
  mistry: string;
  mistryId?: string;
  mistryPhone?: string;
  customerPhone?: string;
  status: JobStatus;
  time: string;
  address: string;
  lat: number;
  lng: number;
  price: string;
  isUpcoming: boolean;
  customerName?: string;
  eta?: string;
  isRated?: boolean;
  createdAt: number;
  pincode?: string; // Added for area-based matching
  serviceArea?: string; // Service area for geographic restriction
  
  // RATING SUBMISSION TRACKING
  ratingSubmitted?: boolean; // Flag to indicate if rating has been submitted
  ratingSubmittedAt?: number; // Timestamp when rating was submitted
  ratingValue?: number; // Submitted rating value (1-5)
  ratingTags?: string[]; // Tags associated with the rating
}
