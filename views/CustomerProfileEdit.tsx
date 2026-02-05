import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Phone, User, Edit3, Save, X, Mail } from 'lucide-react';
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
    try {
      const cleanedProfile = cleanProfileData(editedProfile);
      await onSaveProfile(cleanedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-orange-50 rounded-[2.5rem] p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={editedProfile.profilePhotoUrl ?? "https://picsum.photos/seed/cust1/200/200"} 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-100" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://picsum.photos/seed/cust1/200/200";
              }}
            />
            <button className="absolute -bottom-2 -right-2 bg-orange-500 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-600 transition-colors">
              <Camera size={16} />
            </button>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{t('customer_mode')}</p>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-2xl font-black text-amber-900 leading-tight bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none"
              />
            ) : (
              <p className="text-2xl font-black text-amber-900 leading-tight">
                {customerProfile?.name ?? user?.name ?? 'Customer Profile'}
              </p>
            )}
            <p className="text-sm font-bold text-gray-400">ID: ML-{(customerProfile?.id ?? '').substring(0, 4).toUpperCase() || 'XXXX'}</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-200 transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={onCancel}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Contact Information</p>
        <div className="text-xs text-amber-900 space-y-2">
          {isEditing ? (
            <>
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-gray-500" />
                <input
                  type="tel"
                  value={editedProfile.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none w-full"
                  placeholder="Phone Number"
                />
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-gray-500" />
                <input
                  type="email"
                  value={editedProfile.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none w-full"
                  placeholder="Email Address"
                />
              </div>
            </>
          ) : (
            <>
              {customerProfile?.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-gray-500" />
                  <span className="font-bold">{customerProfile.phone}</span>
                </div>
              )}
              {customerProfile?.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-gray-500" />
                  <span className="font-bold">{customerProfile.email}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 my-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <MapPin size={14} />
          Address Information
        </p>
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editedProfile.address?.line1 || ''}
              onChange={(e) => handleAddressChange('line1', e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
              placeholder="Address Line 1"
            />
            <input
              type="text"
              value={editedProfile.address?.line2 || ''}
              onChange={(e) => handleAddressChange('line2', e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
              placeholder="Address Line 2"
            />
            <input
              type="text"
              value={editedProfile.address?.area || ''}
              onChange={(e) => handleAddressChange('area', e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
              placeholder="Area"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={editedProfile.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
                placeholder="City"
              />
              <input
                type="text"
                value={editedProfile.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
                placeholder="State"
              />
            </div>
            <input
              type="text"
              value={editedProfile.address?.pincode || ''}
              onChange={(e) => handleAddressChange('pincode', e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
              placeholder="Pincode"
            />
          </div>
        ) : (
          <div className="text-xs text-amber-900 space-y-1">
            {customerProfile?.address?.line1 && <div>{customerProfile.address.line1}</div>}
            {customerProfile?.address?.line2 && <div>{customerProfile.address.line2}</div>}
            {customerProfile?.address?.area && <div>{customerProfile.address.area}</div>}
            {customerProfile?.address?.city && <div>{customerProfile.address.city}</div>}
            {customerProfile?.address?.state && <div>{customerProfile.address.state}</div>}
            {customerProfile?.address?.pincode && <div className="font-bold">Pincode: {customerProfile.address.pincode}</div>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100 mt-6">
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <p className="text-lg font-black text-amber-900">{customerProfile?.totalBookings ?? 0}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total Bookings</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-xl border-l border-gray-100">
          <p className="text-lg font-black text-orange-600">{typeof customerProfile?.rating === 'number' ? customerProfile.rating.toFixed(1) : '0.0'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Rating</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center opacity-30 grayscale">
        <User className="text-green-600 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-tighter">Verified Customer</p>
      </div>
    </div>
  );
};

export default CustomerProfileEdit;