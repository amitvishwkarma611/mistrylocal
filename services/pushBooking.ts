export async function triggerBookingPush(
  pincode: string, 
  service: string, 
  bookingId?: string,
  customerName?: string,
  address?: string
) {
  try {
    const payload: Record<string, any> = { 
      pincode, 
      service,
      timestamp: new Date().toISOString()
    };
    
    // Add booking details if available
    if (bookingId) {
      payload.bookingId = bookingId;
      payload.action = 'view_job';
      payload.tab = 'jobs';
    }
    
    if (customerName) {
      payload.customerName = customerName;
    }
    
    if (address) {
      payload.address = address;
    }
    
    const response = await fetch("/api/sendPush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Push notification sent: ${result.sent} workers notified for ${service} in ${pincode}`);
    } else {
      console.warn(`⚠️ Push notification failed: ${result.message}`);
    }
    
    return result;
  } catch (err) {
    console.error("❌ Push trigger failed:", err);
    return { success: false, error: err };
  }
}