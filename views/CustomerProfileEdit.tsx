import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Phone, User, Edit3, Save, X, Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Customer, Address } from '../types';

interface CustomerProfileEditProps {
  customerProfile: Customer | null;
  user: { role: any; name: string; phone: string; uid: string } | null;
  onSaveProfile: (profile: Partial<Customer>) => Promise<void>;
  onCancel: () => void;
  t: (key: string) => string;
}

const CustomerProfileEdit: React.FC<CustomerProfileEditProps> = ({ 
  customerProfile, 
  user, 
  onSaveProfile, 
  onCancel,
  t 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Customer>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (customerProfile) {
      setEditedProfile({
        ...customerProfile,
        address: { ...customerProfile.address }
      });
    }
  }, [customerProfile]);

  // Clean up profile data to remove undefined values before saving
  const cleanProfileData = (profile: Partial<Customer>): Partial<Customer> => {
    const cleaned: any = {};
    
    Object.keys(profile).forEach(key => {
      const value = (profile as any)[key];
      if (value !== undefined) {
        // For nested objects like address, clean them recursively
        if (key === 'address' && value) {
          const cleanedAddress: any = {};
          Object.keys(value).forEach(addrKey => {
            const addrValue = (value as any)[addrKey];
            if (addrValue !== undefined) {
              cleanedAddress[addrKey] = addrValue;
            }
          });
          cleaned[key] = cleanedAddress;
        } else {
          // Only add the field if it's not undefined (empty strings are valid)
          cleaned[key] = value;
        }
      }
    });
    
    return cleaned;
  };

  const handleInputChange = (field: keyof Customer, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      address: {
        ...(prev.address || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const cleanedProfile = cleanProfileData(editedProfile);
      await onSaveProfile(cleanedProfile);
      
      // Show success feedback
      setSaveSuccess(true);
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError('Failed to save profile. Please try again.');
      
      // Clear error message after 5 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveError(null);
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-orange-50 rounded-[2.5rem] p-8 mb-8 shadow-sm relative">
      {/* Status indicators */}
      {saveSuccess && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium animate-fade-in">
          <CheckCircle size={16} />
          Profile saved successfully
        </div>
      )}
      
      {saveError && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-full text-sm font-medium animate-fade-in">
          <AlertCircle size={16} />
          {saveError}
        </div>
      )}
      
      {isSaving && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium">
          <Clock className="animate-spin" size={16} />
          Saving...
        </div>
      )}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-2 bg-orange-100 rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div className="relative">
              <img 
                src={editedProfile.profilePhotoUrl ?? "https://picsum.photos/seed/cust1/200/200"} 
                className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg transition-transform duration-300 group-hover:scale-105" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/seed/cust1/200/200";
                }}
                alt="Customer profile"
              />
              <button 
                className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-orange-600 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white"
                aria-label="Change profile photo"
              >
                <Camera size={18} />
              </button>
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-3 border-white shadow-md animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <p className="text-[11px] font-black text-orange-700 uppercase tracking-widest">{t('customer_mode')}</p>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-3xl font-black text-amber-900 leading-tight bg-transparent border-b-2 border-orange-300 focus:border-orange-500 outline-none transition-colors duration-300 w-full max-w-md"
                placeholder="Enter your name"
                aria-label="Customer name"
              />
            ) : (
              <div className="group">
                <p className="text-3xl font-black text-amber-900 leading-tight group-hover:text-amber-800 transition-colors duration-300">
                  {customerProfile?.name ?? user?.name ?? 'Customer Profile'}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded-lg">ID: ML-{(customerProfile?.id ?? '').substring(0, 4).toUpperCase() || 'XXXX'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-xl font-bold text-xs hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Edit3 size={14} />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  // Reset the edited profile to original values
                  if (customerProfile) {
                    setEditedProfile({
                      ...customerProfile,
                      address: { ...customerProfile.address }
                    });
                  }
                  setIsEditing(false);
                  setSaveError(null);
                  setSaveSuccess(false);
                }}
                className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all duration-300 shadow hover:shadow-md"
                aria-label="Cancel editing"
              >
                <X size={14} />
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-xl font-bold text-xs hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <p className="text-[11px] font-black uppercase text-gray-600 tracking-widest">Contact Information</p>
        </div>
        <div className="text-sm text-amber-900 space-y-3">
          {isEditing ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200 hover:border-blue-300 transition-colors duration-300">
                <Phone size={16} className="text-blue-500 flex-shrink-0" />
                <input
                  type="tel"
                  value={editedProfile.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-transparent border-none focus:outline-none w-full text-gray-800 placeholder-gray-400"
                  placeholder="Phone Number"
                  aria-label="Phone number"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200 hover:border-blue-300 transition-colors duration-300">
                <Mail size={16} className="text-blue-500 flex-shrink-0" />
                <input
                  type="email"
                  value={editedProfile.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-transparent border-none focus:outline-none w-full text-gray-800 placeholder-gray-400"
                  placeholder="Email Address"
                  aria-label="Email address"
                />
              </div>
            </>
          ) : (
            <>
              {customerProfile?.phone && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                  <Phone size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="font-bold text-gray-800">{customerProfile.phone}</span>
                </div>
              )}
              {customerProfile?.email && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                  <Mail size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="font-bold text-gray-800">{customerProfile.email}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 my-6 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-orange-500" />
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Address Information</p>
        </div>
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editedProfile.address?.line1 || ''}
              onChange={(e) => handleAddressChange('line1', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300"
              placeholder="Address Line 1"
              aria-label="Address line 1"
            />
            <input
              type="text"
              value={editedProfile.address?.line2 || ''}
              onChange={(e) => handleAddressChange('line2', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300"
              placeholder="Address Line 2"
              aria-label="Address line 2"
            />
            <input
              type="text"
              value={editedProfile.address?.area || ''}
              onChange={(e) => handleAddressChange('area', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300"
              placeholder="Area"
              aria-label="Area"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={editedProfile.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300"
                placeholder="City"
                aria-label="City"
              />
              <input
                type="text"
                value={editedProfile.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300"
                placeholder="State"
                aria-label="State"
              />
            </div>
            <input
              type="text"
              value={editedProfile.address?.pincode || ''}
              onChange={(e) => handleAddressChange('pincode', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-300"
              placeholder="Pincode"
              aria-label="Pincode"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {customerProfile?.address?.line1 && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm text-gray-800">
                {customerProfile.address.line1}
              </div>
            )}
            {customerProfile?.address?.line2 && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm text-gray-800">
                {customerProfile.address.line2}
              </div>
            )}
            {customerProfile?.address?.area && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm text-gray-800">
                {customerProfile.address.area}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {customerProfile?.address?.city && (
                <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm text-gray-800">
                  {customerProfile.address.city}
                </div>
              )}
              {customerProfile?.address?.state && (
                <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm text-gray-800">
                  {customerProfile.address.state}
                </div>
              )}
            </div>
            {customerProfile?.address?.pincode && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-orange-600">
                Pincode: {customerProfile.address.pincode}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-8 border-t border-gray-200 mt-8">
        <div className="text-center p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
            <span className="text-2xl font-black text-blue-600">{customerProfile?.totalBookings ?? 0}</span>
          </div>
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-tighter">Total Bookings</p>
        </div>
        <div className="text-center p-5 bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
            <span className="text-2xl font-black text-orange-600">
              {typeof customerProfile?.rating === 'number' ? customerProfile.rating.toFixed(1) : '0.0'}
            </span>
          </div>
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-tighter">Rating</p>
        </div>
      </div>
      
      <div className="mt-10 flex flex-col items-center opacity-40 hover:opacity-60 transition-opacity duration-300">
        <div className="relative">
          <div className="absolute -inset-3 bg-green-100 rounded-full blur opacity-30"></div>
          <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full">
            <User className="text-white" size={28} />
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-[11px] font-black text-green-700 uppercase tracking-tighter">Verified Customer</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileEdit;