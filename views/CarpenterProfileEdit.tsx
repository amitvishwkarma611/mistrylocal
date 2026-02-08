import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Phone, User, ShieldCheck, IndianRupee, Edit3, Save, X, Star, LogOut } from 'lucide-react';
import { Carpenter, Address, AddressProof } from '../types';
import { getWalletBalance, rechargeWallet } from '../services/walletService';
import { auth, signOut } from '../firebase';
import { useWallet } from '../contexts/WalletContext';

// Declare Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  const { walletBalance, refreshWalletBalance } = useWallet(); // Wallet balance from context
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Payment processing state

  useEffect(() => {
    if (carpenterProfile) {
      setEditedProfile({
        ...carpenterProfile,
        address: { ...carpenterProfile.address },
        addressProof: { ...carpenterProfile.addressProof }
      });
    }
  }, [carpenterProfile]);

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Optionally redirect or update UI after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCancel = () => {
    // Reset the edited profile to original values
    if (carpenterProfile) {
      setEditedProfile({
        ...carpenterProfile,
        address: { ...carpenterProfile.address },
        addressProof: { ...carpenterProfile.addressProof }
      });
    }
    // Exit edit mode
    setIsEditing(false);
    // Call the parent's onCancel if provided
    if (onCancel) {
      onCancel();
    }
  };

  // Wallet balance is managed by context, no need to fetch here

  // Handle ESC key to cancel editing
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEditing) {
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isEditing, carpenterProfile, onCancel]);

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

  // Razorpay payment integration
  const handleWalletRecharge = async () => {
    if (!user?.uid) {
      alert('Please login to recharge wallet');
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      if (!window.Razorpay) {
        alert('Payment gateway not loaded. Please refresh the page and try again.');
        setIsProcessingPayment(false);
        return;
      }
      
      // Get the profession for this worker to recharge the correct wallet
      const { getWorkerProfessionSafe } = await import('../services/professionService');
      const profession = await getWorkerProfessionSafe(user.uid);
      
      // Amount in paisa (500 INR = 50000 paisa)
      const amount = 50000;
      const currency = 'INR';
      const receipt = `receipt_${user.uid}_${Date.now()}`;

      // Create Razorpay order (this would typically be done on backend)
      // For demo purposes, we'll simulate order creation
      const orderData = {
        amount: amount,
        currency: currency,
        receipt: receipt
      };

      console.log('Creating Razorpay order:', orderData);

      // Initialize Razorpay checkout
      const options = {
        key: 'rzp_test_YOUR_KEY_ID', // Replace with your Razorpay test key
        amount: amount,
        currency: currency,
        name: 'MistryLocal',
        description: 'Wallet Recharge',
        image: '/icons/icon-512x512.png',
        order_id: '', // Will be generated by backend in real implementation
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          
          try {
            // In a real implementation, verify payment on backend first
            // Then update wallet balance
            await rechargeWallet(user.uid, 500, profession);
            
            // Refresh wallet balance from context
            await refreshWalletBalance(true); // Force refresh to bypass rate limiting
            
            alert('Payment successful! ₹500 added to your wallet.');
          } catch (error) {
            console.error('Error updating wallet:', error);
            alert('Payment successful but wallet update failed. Please contact support.');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: user.name || '',
          email: '', // Add email if available
          contact: user.phone || ''
        },
        notes: {
          userId: user.uid,
          purpose: 'wallet_recharge'
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment dialog closed');
            setIsProcessingPayment(false);
          }
        }
      };

      // @ts-ignore - Razorpay is loaded via script tag
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        alert('Payment failed. Please try again.');
        setIsProcessingPayment(false);
      });

      rzp.open();
      
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const cleanedProfile = cleanProfileData(editedProfile);
      await onSaveProfile(cleanedProfile);
      // Update local editedProfile state with saved data
      setEditedProfile(prev => ({ ...prev, ...cleanedProfile }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-orange-50 rounded-[2.5rem] p-8 mb-8 shadow-lg">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-3 border-white shadow-lg">
              <img 
                src={editedProfile.profilePhotoUrl ?? carpenterProfile?.profilePhotoUrl ?? "https://picsum.photos/seed/carp3/200/200"} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/seed/carp3/200/200";
                }}
              />
            </div>
            <button className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-orange-500 to-amber-600 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110">
              <Camera size={14} />
            </button>
            <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full">
              <User size={12} className="text-orange-600" />
              <span className="text-[9px] font-black text-orange-700 uppercase tracking-widest">{t('carpenter_mode')}</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-2xl font-black text-amber-900 leading-tight bg-transparent border-b-2 border-gray-300 focus:border-orange-500 outline-none w-full"
              />
            ) : (
              <h1 className="text-2xl font-black text-amber-900 leading-tight">
                {editedProfile.name ?? carpenterProfile?.name ?? user?.name ?? 'Carpenter Profile'}
              </h1>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">ID: ML-{(carpenterProfile?.id ?? '').substring(0, 4).toUpperCase() || 'XXXX'}</span>
              {carpenterProfile?.verified && (
                <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded-full">
                  <ShieldCheck size={12} className="text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-700">Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <Edit3 size={14} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleCancel}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-2 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors shadow-sm"
            >
              <X size={14} />
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Phone size={16} className="text-gray-600" />
          <h3 className="text-[12px] font-black uppercase text-gray-700 tracking-widest">Contact Information</h3>
        </div>
        <div className="space-y-3 text-sm text-amber-900">
          {isEditing ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200">
                <Phone size={16} className="text-gray-500 flex-shrink-0" />
                <input
                  type="tel"
                  value={editedProfile.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none w-full py-1"
                  placeholder="Primary Phone Number"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200">
                <Phone size={16} className="text-gray-500 flex-shrink-0" />
                <input
                  type="tel"
                  value={editedProfile.alternateMobileNumber || ''}
                  onChange={(e) => handleInputChange('alternateMobileNumber', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none w-full py-1"
                  placeholder="Alternate Phone Number"
                />
              </div>
            </>
          ) : (
            <>
              {(editedProfile.phone ?? carpenterProfile?.phone) && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <Phone size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="font-bold">{editedProfile.phone ?? carpenterProfile?.phone}</span>
                </div>
              )}
              {(editedProfile.alternateMobileNumber ?? carpenterProfile?.alternateMobileNumber) && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <Phone size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="font-bold">{editedProfile.alternateMobileNumber ?? carpenterProfile?.alternateMobileNumber}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 my-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <MapPin size={18} className="text-gray-700" />
          <h3 className="text-[12px] font-black text-gray-700 uppercase tracking-widest">Address Information</h3>
        </div>
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editedProfile.address?.line1 || ''}
              onChange={(e) => handleAddressChange('line1', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm shadow-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
              placeholder="Address Line 1"
            />
            <input
              type="text"
              value={editedProfile.address?.line2 || ''}
              onChange={(e) => handleAddressChange('line2', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm shadow-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
              placeholder="Address Line 2"
            />
            <input
              type="text"
              value={editedProfile.address?.area || ''}
              onChange={(e) => handleAddressChange('area', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm shadow-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
              placeholder="Area/Locality"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={editedProfile.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm shadow-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
                placeholder="City"
              />
              <input
                type="text"
                value={editedProfile.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm shadow-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
                placeholder="State"
              />
            </div>
            <input
              type="text"
              value={editedProfile.address?.pincode || ''}
              onChange={(e) => handleAddressChange('pincode', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-gray-200 text-sm shadow-xs focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
              placeholder="Postal Code"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {(editedProfile.address?.line1 ?? carpenterProfile?.address?.line1) && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm shadow-xs">
                {editedProfile.address?.line1 ?? carpenterProfile?.address?.line1}
              </div>
            )}
            {(editedProfile.address?.line2 ?? carpenterProfile?.address?.line2) && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm shadow-xs">
                {editedProfile.address?.line2 ?? carpenterProfile?.address?.line2}
              </div>
            )}
            {(editedProfile.address?.area ?? carpenterProfile?.address?.area) && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm shadow-xs">
                {editedProfile.address?.area ?? carpenterProfile?.address?.area}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(editedProfile.address?.city ?? carpenterProfile?.address?.city) && (
                <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm shadow-xs">
                  <span className="font-medium text-gray-600">City:</span> {editedProfile.address?.city ?? carpenterProfile?.address?.city}
                </div>
              )}
              {(editedProfile.address?.state ?? carpenterProfile?.address?.state) && (
                <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm shadow-xs">
                  <span className="font-medium text-gray-600">State:</span> {editedProfile.address?.state ?? carpenterProfile?.address?.state}
                </div>
              )}
            </div>
            {(editedProfile.address?.pincode ?? carpenterProfile?.address?.pincode) && (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 text-sm shadow-xs">
                <span className="font-medium text-gray-600">Pincode:</span> 
                <span className="font-bold ml-2">{editedProfile.address?.pincode ?? carpenterProfile?.address?.pincode}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address Proof */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl border border-blue-200 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck size={18} className="text-blue-700" />
          <h3 className="text-[12px] font-black text-blue-700 uppercase tracking-widest">Address Proof</h3>
        </div>
        {isEditing ? (
          <div className="space-y-4">
            <select
              value={editedProfile.addressProof?.type || ''}
              onChange={(e) => handleAddressProofChange('type', e.target.value)}
              className="w-full p-3 bg-white rounded-2xl border border-blue-200 text-sm shadow-xs focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
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
              className="w-full p-3 bg-white rounded-2xl border border-blue-200 text-sm shadow-xs focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
              placeholder="Document Number"
            />
            <div className="mt-2">
              <label className="block text-sm font-medium text-blue-800 mb-2">Upload Document Photo</label>
              <button className="w-full p-4 bg-white rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 text-sm font-bold hover:bg-blue-50 transition-colors shadow-xs">
                <Camera size={20} className="mx-auto mb-2" />
                Upload Document
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(editedProfile.addressProof?.type ?? carpenterProfile?.addressProof?.type) && (
              <div className="p-3 bg-white rounded-2xl border border-blue-100 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-800">Document Type:</span>
                  <span className="font-bold bg-blue-100 px-3 py-1 rounded-full text-blue-700">{editedProfile.addressProof?.type ?? carpenterProfile?.addressProof?.type}</span>
                </div>
              </div>
            )}
            {(editedProfile.addressProof?.documentNumber ?? carpenterProfile?.addressProof?.documentNumber) && (
              <div className="p-3 bg-white rounded-2xl border border-blue-100 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-800">Document Number:</span>
                  <span className="font-bold">
                    {'*' + '*'.repeat(Math.max(0, ((editedProfile.addressProof?.documentNumber ?? carpenterProfile?.addressProof?.documentNumber)?.length || 0) - 4)) + 
                    ((editedProfile.addressProof?.documentNumber ?? carpenterProfile?.addressProof?.documentNumber)?.slice(-4) || '')}
                  </span>
                </div>
              </div>
            )}
            {(editedProfile.addressProof?.photoUrl ?? carpenterProfile?.addressProof?.photoUrl) && (
              <div className="mt-2">
                <span className="font-medium text-blue-800">Proof Photo:</span>
                <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-200 shadow-sm">
                  <img 
                    src={editedProfile.addressProof?.photoUrl ?? carpenterProfile?.addressProof?.photoUrl} 
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
            {(editedProfile.addressProof?.verified ?? carpenterProfile?.addressProof?.verified) && (
              <div className="p-3 bg-green-50 rounded-2xl border border-green-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-green-600" />
                  <span className="text-green-700 font-bold text-sm">Verified by MistryLocal Trust</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wallet Management */}
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-100 rounded-xl">
              <IndianRupee size={20} className="text-amber-700" />
            </div>
            <h3 className="text-[12px] font-black text-amber-700 uppercase tracking-widest">Wallet Management</h3>
          </div>
          <div className="space-y-5">
            <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-gray-500 tracking-widest mb-1">Current Balance</p>
                  <p className="text-2xl font-black text-amber-900">₹{walletBalance.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl">
                  <ShieldCheck size={20} className="text-green-600" />
                </div>
              </div>
            </div>
            <button
              onClick={handleWalletRecharge}
              disabled={isProcessingPayment}
              className={`w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 hover:from-amber-700 hover:to-orange-700 flex items-center justify-center gap-3 ${
                isProcessingPayment 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:shadow-2xl'
              }`}
            >
              <IndianRupee size={20} />
              <span>
                {isProcessingPayment ? 'Processing...' : 'Add ₹500 to Wallet'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Services Display - Plain text only */}
      {carpenterProfile?.services && carpenterProfile.services.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
          <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest mb-2">Services</p>
          <p className="text-sm font-bold text-amber-900">
            {carpenterProfile.services.map(service => 
              service.charAt(0).toUpperCase() + service.slice(1)
            ).join(', ')}
          </p>
        </div>
      )}

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-5 pt-8 border-t border-gray-200 mt-8">
        <div className="text-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-black text-amber-700">✓</span>
          </div>
          <p className="text-2xl font-black text-amber-900 mb-1">{carpenterProfile?.jobsCompleted ?? 0}</p>
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Jobs Completed</p>
        </div>
        <div className="text-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Star size={20} className="text-blue-600 fill-current" />
          </div>
          <p className="text-2xl font-black text-orange-600 mb-1">{typeof carpenterProfile?.rating === 'number' ? carpenterProfile.rating.toFixed(1) : '0.0'}</p>
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Average Rating</p>
        </div>
      </div>
      
      {/* Trust Score */}
      {carpenterProfile?.trustScore && carpenterProfile.trustScore > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-600" />
              <span className="text-[12px] font-black uppercase text-gray-700 tracking-widest">Trust Score</span>
            </div>
            <span className="text-lg font-black text-green-600 bg-green-50 px-3 py-1 rounded-full">{carpenterProfile.trustScore}%</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out shadow-md"
              style={{ width: `${carpenterProfile.trustScore}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Verified by MistryLocal Trust System</p>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center">
        <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3 rounded-2xl border border-green-200 shadow-sm">
          <ShieldCheck className="text-green-600" size={24} />
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-tight text-green-700">Verified by MistryLocal Trust</p>
            <p className="text-xs font-medium text-green-600">Professional Carpenter Profile</p>
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-6 w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <LogOut size={18} />
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

export default CarpenterProfileEdit;