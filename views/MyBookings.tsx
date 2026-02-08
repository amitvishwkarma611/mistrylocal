
import React, { useState, useEffect } from 'react';
import { Booking, JobStatus } from '../types';
import { translations } from '../translations';
import { Calendar, MapPin, Clock, MessageSquare, Phone, CheckCircle2, AlertCircle, Navigation, Star, Heart, Hammer, ShieldCheck, History, IndianRupee as IndianRupeeIcon } from 'lucide-react';

interface MyBookingsProps {
  bookings: Booking[];
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onRateBooking: (id: string, rating: number, tags: string[]) => void;
  t: (key: keyof typeof translations.EN) => string;
  user?: { role: any; name: string; phone: string; uid: string };
}

const MyBookings: React.FC<MyBookingsProps> = ({ bookings, onUpdateStatus, onRateBooking, t, user }) => {
  const [ratingDraft, setRatingDraft] = useState<{ [key: string]: { value: number, tags: string[] } }>({});

  const handleStarClick = (bookingId: string, value: number) => {
    setRatingDraft(prev => ({ ...prev, [bookingId]: { ...prev[bookingId], value } }));
  };

  const handleRatingSubmit = (bookingId: string) => {
    const draft = ratingDraft[bookingId];
    if (draft && draft.value > 0) {
      onRateBooking(bookingId, draft.value, draft.tags || []);
      // Clear the rating draft after submission
      setRatingDraft(prev => {
        const newDraft = {...prev};
        delete newDraft[bookingId];
        return newDraft;
      });
    }
  };

  const openWhatsApp = (booking: Booking) => {
    const phone = booking.mistryPhone || booking.mistryId || ""; // Use the actual carpenter's phone number
    const message = encodeURIComponent(`Hello, I have a booking for ${booking.service} at ${booking.address}. Status: ${booking.status}.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const makeCall = (booking: Booking) => {
    const phone = booking.mistryPhone || booking.mistryId || ""; // Use the actual carpenter's phone number
    window.open(`tel:${phone}`);
  };

  const activeBookings = bookings.filter(b => 
    b.status !== JobStatus.COMPLETED && 
    b.status !== JobStatus.CANCELLED && 
    b.status !== JobStatus.SEARCHING &&
    b.status !== JobStatus.ACCEPT_TIMEOUT
  );
  
  // Recently accepted jobs - REMOVED AS PER USER REQUEST
  // const acceptedBookings = bookings.filter(b => 
  //   b.status === JobStatus.ACCEPTED
  // );

  const pendingRating = bookings.filter(b => 
    b.status === JobStatus.COMPLETED && (b.ratingSubmitted === false || b.ratingSubmitted === undefined)
  );

  const historyBookings = bookings.filter(b => 
    b.status === JobStatus.COMPLETED && b.ratingSubmitted === true
  ).sort((a, b) => b.createdAt - a.createdAt);

  // Filter timeout bookings for history
  const timeoutBookings = bookings.filter(b => 
    b.status === JobStatus.ACCEPT_TIMEOUT
  ).sort((a, b) => b.createdAt - a.createdAt);

  // Effect to trigger UI refresh after rating submission
  useEffect(() => {
    // This will cause a re-render when bookings change
  }, [bookings]);
  
  return (
    <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-amber-900">{t('my_fixes')}</h2>
      </div>

      <div className="flex flex-col gap-8">
        {/* NEWLY ACCEPTED JOBS - REMOVED AS PER USER REQUEST */}
        {/* {acceptedBookings.length > 0 && (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-3 flex items-center gap-2">
              <CheckCircle2 size={12} /> Job Accepted!
            </h3>
            {acceptedBookings.map(booking => (
              <div key={booking.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-3xl p-6 shadow-lg relative overflow-hidden mb-4 animate-in zoom-in-95 duration-700">
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl tracking-widest uppercase">
                  ACCEPTED
                </div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-amber-900 text-xl leading-tight mb-1">{booking.service}</h4>
                    <p className="text-sm text-gray-600 font-medium">Your job has been accepted!</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Assigned Mistry</span>
                    <span className="text-sm font-bold text-amber-900">{booking.mistry}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 font-medium mb-2">
                    <MapPin size={14} className="text-orange-600 shrink-0" />
                    <span className="truncate">{booking.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-900 font-black">
                    <IndianRupee size={14} className="text-orange-600" />
                    <span>{booking.price}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => openWhatsApp(booking)}
                    className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-green-600"
                  >
                    <MessageSquare size={14} /> Message Mistry
                  </button>
                  <button className="flex-1 py-3 border border-gray-200 text-amber-900 rounded-2xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-50">
                    <Phone size={14} className="inline mr-1" /> Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        )} */}
        
        {/* ACTIVE PROGRESS - HIDDEN FOR CARPENTERS */}
        {user?.role !== 'CARPENTER' && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-2">
            <Clock size={12} /> {t('live_progress')}
          </h3>
          <div className="flex flex-col gap-4">
            {activeBookings.length > 0 ? activeBookings.map(booking => (
                <div key={booking.id} className={`bg-white border-2 rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all duration-500 ${
                  booking.status === JobStatus.ON_THE_WAY ? 'border-orange-600 bg-orange-50/20' : 
                  booking.status === JobStatus.ARRIVED ? 'border-green-600 bg-green-50/20' : 
                  booking.status === JobStatus.WORK_IN_PROGRESS ? 'border-amber-600 bg-amber-50/20' : 
                  'border-orange-100'
                }`}>
                  <div className={`absolute top-0 right-0 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl tracking-widest uppercase ${
                    booking.status === JobStatus.ON_THE_WAY ? 'bg-orange-600' : 
                    booking.status === JobStatus.ARRIVED ? 'bg-green-600' : 
                    booking.status === JobStatus.WORK_IN_PROGRESS ? 'bg-amber-600' : 
                    'bg-amber-800'
                  }`}>
                    {booking.status}
                  </div>
                  <h4 className="font-bold text-amber-900 text-lg leading-tight pr-12">{booking.service}</h4>
                  
                  {booking.status === JobStatus.ON_THE_WAY && (
                    <div className="my-4 bg-orange-600 rounded-2xl p-4 text-white shadow-lg animate-in zoom-in-95 flex items-center gap-3">
                       <Navigation size={20} className="animate-pulse" />
                       <div className="flex-1">
                          <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Mistry On Way</p>
                          <p className="text-xl font-black">{booking.eta || '12 mins'}</p>
                       </div>
                    </div>
                  )}
                  
                  {booking.status === JobStatus.ARRIVED && (
                    <div className="my-4 bg-green-600 rounded-2xl p-4 text-white shadow-lg animate-in zoom-in-95">
                       <div className="flex items-center gap-3 mb-3">
                          <MapPin size={20} className="text-white" />
                          <div className="flex-1">
                             <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Mistry Arrived</p>
                             <p className="text-lg font-black">{booking.mistry} has reached your location</p>
                          </div>
                       </div>
                       <div className="bg-white/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Waiting for work to start</p>
                          <p className="text-sm font-medium">Your mistry will begin work shortly</p>
                       </div>
                    </div>
                  )}
                  
                  {booking.status === JobStatus.WORK_IN_PROGRESS && (
                    <div className="my-4 bg-amber-600 rounded-2xl p-4 text-white shadow-lg">
                       <div className="flex items-center gap-3 mb-3">
                          <Hammer size={20} className="animate-bounce" />
                          <div className="flex-1">
                             <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Work in Progress</p>
                             <p className="text-lg font-black">{booking.mistry} is working on your job</p>
                          </div>
                       </div>
                       <div className="bg-white/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Work Started</p>
                          <p className="text-sm font-medium">Your mistry has begun working on {booking.service.toLowerCase()}</p>
                       </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-6 mt-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                      <MapPin size={14} className="text-orange-600 shrink-0" />
                      <span className="truncate">{booking.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-900 font-black">
                      <IndianRupee size={14} className="text-orange-600" />
                      <span>{booking.price}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openWhatsApp(booking)}
                      className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <MessageSquare size={14} /> WhatsApp
                    </button>
                    <button 
                      onClick={() => makeCall(booking)}
                      className="flex-1 py-3 border border-gray-100 text-amber-900 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                    >
                      <Phone size={14} className="inline mr-1" /> Call
                    </button>
                  </div>
                </div>
              )) : (
              <div className="bg-gray-50 rounded-3xl p-8 text-center border-2 border-dashed border-gray-200 text-gray-400 font-bold italic">No active fixes.</div>
            )}
          </div>
        </div>
        )}

        {/* PENDING RATINGS - HIDDEN FOR CARPENTERS */}
        {user?.role !== 'CARPENTER' && pendingRating.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-3 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-500" /> Work Completed - Please Rate
            </h3>
            {pendingRating.map(booking => (
              <div key={booking.id} className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3 animate-in slide-in-from-left-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg tracking-widest uppercase">
                  COMPLETED
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center text-white mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-amber-900 text-lg">{booking.service}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-600 font-medium">Work has been completed!</p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-600 font-medium">Completed by <span className="font-bold text-amber-900">{booking.mistry}</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1.5 mb-4 justify-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => handleStarClick(booking.id, star)} className="active:scale-110 transition-transform">
                      <Star size={28} fill={star <= (ratingDraft[booking.id]?.value || 0) ? "#10B981" : "transparent"} className={star <= (ratingDraft[booking.id]?.value || 0) ? "text-green-500" : "text-gray-200"} />
                    </button>
                  ))}
                </div>
                <button onClick={() => handleRatingSubmit(booking.id)} disabled={!(ratingDraft[booking.id]?.value)} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-black text-sm shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} /> Submit Rating
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TIMEOUT JOBS SECTION */}
        {timeoutBookings.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3 flex items-center gap-2">
              <AlertCircle size={12} className="text-red-500" /> Timeout Jobs
            </h3>
            <div className="flex flex-col gap-2 mb-6">
              {timeoutBookings.map(job => (
                <div key={job.id} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between shadow-xs group hover:border-red-300 transition-all">
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 shrink-0">
                      <AlertCircle size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-amber-900 leading-tight truncate">{job.service}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-red-600 font-medium">Timeout - No response from mistry</p>
                        <span className="text-[10px] text-gray-300">•</span>
                        <p className="text-[10px] text-gray-400 font-medium">{job.time}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-black text-red-600 flex items-center justify-end gap-0.5">
                      {job.price}
                    </p>
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter mt-0.5">No Charge</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY SECTION */}
        <div>
           <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-900 mb-3 flex items-center gap-2">
            <History size={12} className="text-gray-400" /> {t('past_fixes')}
          </h3>
          <div className="flex flex-col gap-2">
            {historyBookings.length > 0 ? historyBookings.map(job => (
              <div key={job.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-xs group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-amber-900 leading-tight truncate">{job.service}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[10px] text-gray-400 font-medium">By {job.mistry}</p>
                       <span className="text-[10px] text-gray-300">•</span>
                       <p className="text-[10px] text-gray-400 font-medium">{job.time}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-black text-amber-900 flex items-center justify-end gap-0.5">
                    {job.price}
                  </p>
                  <div className="flex flex-col items-end gap-0.5 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      <Star size={10} fill="#EA580C" className="text-orange-600" />
                      <span className="text-[10px] font-black text-orange-600">
                        {job.ratingValue ? `${job.ratingValue}.0` : '5.0'}
                      </span>
                    </div>
                    {job.ratingTags && job.ratingTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                        {job.ratingTags.slice(0, 2).map((tag, index) => (
                          <span 
                            key={index}
                            className="text-[8px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[60px]"
                          >
                            {tag}
                          </span>
                        ))}
                        {job.ratingTags.length > 2 && (
                          <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                            +{job.ratingTags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 italic">No past jobs found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 p-5 bg-amber-50 rounded-3xl border border-amber-100 border-dashed">
        <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2 mb-2">
          <AlertCircle size={16} /> {t('secure_tip_title')}
        </h4>
        <p className="text-xs text-amber-800 leading-relaxed">{t('secure_tip_desc')}</p>
      </div>
    </div>
  );
};

const IndianRupee = ({ size, className }: { size: number, className?: string }) => (
  <span className={className} style={{ fontSize: size }}>₹</span>
);

export default MyBookings;
