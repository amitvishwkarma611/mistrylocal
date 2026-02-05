import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Phone, User, ShieldCheck, IndianRupee, Edit3, Save, X } from 'lucide-react';
import { Carpenter, Address, AddressProof } from '../types';

interface CarpenterProfileEditProps {
  carpenterProfile: Carpenter | null;
  user: { role: any; name: string; phone: string; uid: string } | null;
  onSaveProfile: (profile: Partial<Carpenter>) => Promise<void>;
  onCancel: () => void;
  t: (key: string) => string;
}

const CarpenterProfileEdit: React.FC<CarpenterProfileEditProps> = ({ 
  carpenterProfile, 
  user, 
  onSaveProfile, 
  onCancel,
  t 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Carpenter>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (carpenterProfile) {
      setEditedProfile({
        ...carpenterProfile,
        address: { ...carpenterProfile.address },
        addressProof: { ...carpenterProfile.addressProof }
      });
    }
  }, [carpenterProfile]);

  // Clean up profile data to remove undefined values before saving
  const cleanProfileData = (profile: Partial<Carpenter>): Partial<Carpenter> => {
    const cleaned: any = {};
    
    Object.keys(profile).forEach(key => {
      const value = (profile as any)[key];
      if (value !== undefined) {
        // For nested objects like address and addressProof, clean them recursively
        if (key === 'address' && value) {
          const cleanedAddress: any = {};
          Object.keys(value).forEach(addrKey => {
            const addrValue = (value as any)[addrKey];
            if (addrValue !== undefined) {
              cleanedAddress[addrKey] = addrValue;
            }
          });
          cleaned[key] = cleanedAddress;
        } else if (key === 'addressProof' && value) {
          const cleanedProof: any = {};
          Object.keys(value).forEach(proofKey => {
            const proofValue = (value as any)[proofKey];
            if (proofValue !== undefined) {
              cleanedProof[proofKey] = proofValue;
            }
          });
          cleaned[key] = cleanedProof;
        } else {
          // Only add the field if it's not undefined (empty strings are valid)
          cleaned[key] = value;
        }
      }
    });
    
    return cleaned;
  };

  const handleInputChange = (field: keyof Carpenter, value: any) => {
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

  const handleAddressProofChange = (field: keyof AddressProof, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      addressProof: {
        ...(prev.addressProof || {}),
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
              src={editedProfile.profilePhotoUrl ?? "https://picsum.photos/seed/carp3/200/200"} 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-100" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://picsum.photos/seed/carp3/200/200";
              }}
            />
            <button className="absolute -bottom-2 -right-2 bg-orange-500 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-600 transition-colors">
              <Camera size={16} />
            </button>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{t('carpenter_mode')}</p>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-2xl font-black text-amber-900 leading-tight bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none"
              />
            ) : (
              <p className="text-2xl font-black text-amber-900 leading-tight">
                {carpenterProfile?.name ?? user?.name ?? 'Carpenter Profile'}
              </p>
            )}
            <p className="text-sm font-bold text-gray-400">ID: ML-{(carpenterProfile?.id ?? '').substring(0, 4).toUpperCase() || 'XXXX'}</p>
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
                  placeholder="Primary Phone"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-gray-500" />
                <input
                  type="tel"
                  value={editedProfile.alternateMobileNumber || ''}
                  onChange={(e) => handleInputChange('alternateMobileNumber', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none w-full"
                  placeholder="Alternate Phone"
                />
              </div>
            </>
          ) : (
            <>
              {carpenterProfile?.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-gray-500" />
                  <span className="font-bold">{carpenterProfile.phone}</span>
                </div>
              )}
              {carpenterProfile?.alternateMobileNumber && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-gray-500" />
                  <span className="font-bold">{carpenterProfile.alternateMobileNumber}</span>
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
            {carpenterProfile?.address?.line1 && <div>{carpenterProfile.address.line1}</div>}
            {carpenterProfile?.address?.line2 && <div>{carpenterProfile.address.line2}</div>}
            {carpenterProfile?.address?.area && <div>{carpenterProfile.address.area}</div>}
            {carpenterProfile?.address?.city && <div>{carpenterProfile.address.city}</div>}
            {carpenterProfile?.address?.state && <div>{carpenterProfile.address.state}</div>}
            {carpenterProfile?.address?.pincode && <div className="font-bold">Pincode: {carpenterProfile.address.pincode}</div>}
          </div>
        )}
      </div>

      {/* Address Proof */}
      <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 mb-4">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ShieldCheck size={14} />
          Address Proof
        </p>
        {isEditing ? (
          <div className="space-y-3">
            <select
              value={editedProfile.addressProof?.type || ''}
              onChange={(e) => handleAddressProofChange('type', e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
            >
              <option value="">Select Document Type</option>
              <option value="Aadhar">Aadhar Card</option>
              <option value="VoterID">Voter ID</option>
              <option value="DrivingLicense">Driving License</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="text"
              value={editedProfile.addressProof?.documentNumber || ''}
              onChange={(e) => handleAddressProofChange('documentNumber', e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs"
              placeholder="Document Number"
            />
            <div className="mt-2">
              <label className="block text-xs font-medium text-blue-800 mb-1">Upload Document Photo</label>
              <button className="w-full p-3 bg-white rounded-xl border-2 border-dashed border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors">
                <Camera size={16} className="mx-auto mb-1" />
                Upload Document
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-blue-900 space-y-2">
            {carpenterProfile?.addressProof?.type && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Type:</span>
                <span className="font-bold bg-blue-100 px-2 py-1 rounded-md">{carpenterProfile.addressProof.type}</span>
              </div>
            )}
            {carpenterProfile?.addressProof?.documentNumber && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Document:</span>
                <span className="font-bold">
                  {'*' + '*'.repeat(Math.max(0, (carpenterProfile.addressProof.documentNumber?.length || 0) - 4)) + 
                  (carpenterProfile.addressProof.documentNumber?.slice(-4) || '')}
                </span>
              </div>
            )}
            {carpenterProfile?.addressProof?.photoUrl && (
              <div className="mt-2">
                <span className="font-medium">Proof Photo:</span>
                <div className="mt-1 w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={carpenterProfile.addressProof.photoUrl} 
                    alt="Address Proof" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
            {carpenterProfile?.addressProof?.verified && (
              <div className="flex items-center gap-1 mt-2">
                <ShieldCheck size={14} className="text-green-600" />
                <span className="text-green-700 font-bold text-xs">Verified</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Earnings & Wallet */}
      <div className="space-y-4">
        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <IndianRupee size={14} />
            Earnings & Wallet
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-amber-900 font-bold text-sm">
              <span>Weekly Earnings</span>
              <span className="text-green-600">₹{(carpenterProfile?.weeklyEarnings ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-amber-900 font-bold text-sm">
              <span>Current Balance</span>
              <span className="text-amber-900">₹{(carpenterProfile?.walletBalance ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100 mt-6">
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <p className="text-lg font-black text-amber-900">{carpenterProfile?.jobsCompleted ?? 0}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Jobs Completed</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-xl border-l border-gray-100">
          <p className="text-lg font-black text-orange-600">{typeof carpenterProfile?.rating === 'number' ? carpenterProfile.rating.toFixed(1) : '0.0'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Rating</p>
        </div>
      </div>
      
      {/* Trust Score */}
      {carpenterProfile?.trustScore && carpenterProfile.trustScore > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Trust Score</span>
            <span className="text-sm font-black text-green-600">{carpenterProfile.trustScore}%</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${carpenterProfile.trustScore}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center opacity-30 grayscale">
        <ShieldCheck className="text-green-600 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-tighter">Verified by MistryLocal Trust</p>
      </div>
    </div>
  );
};

export default CarpenterProfileEdit;