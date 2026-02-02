
export enum AppRole {
  CUSTOMER = 'CUSTOMER',
  CARPENTER = 'CARPENTER'
}

export enum JobStatus {
  SEARCHING = 'SEARCHING',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
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
  
  // NEW PROFESSIONAL DETAILS (optional)
  alternateMobileNumber?: string;
  address?: Address;
  addressProof?: AddressProof;
  profilePhotoUrl?: string;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface Booking {
  id: string;
  service: string;
  mistry: string;
  mistryId?: string;
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
}
