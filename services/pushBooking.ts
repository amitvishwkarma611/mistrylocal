export async function triggerBookingPush(pincode: string, service: string, bookingId?: string) {
  try {
    const payload: any = { pincode, service };
    
    // Add booking details if available
    if (bookingId) {
      payload.bookingId = bookingId;
      payload.action = 'view_jobs';
      payload.tab = 'jobs';
    }
    
    await fetch("/api/sendPush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Push trigger failed:", err);
  }
}