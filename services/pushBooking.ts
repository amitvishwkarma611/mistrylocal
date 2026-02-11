export async function triggerBookingPush(pincode: string, service: string) {
  try {
    await fetch("/api/sendPush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pincode, service }),
    });
  } catch (err) {
    console.error("Push trigger failed:", err);
  }
}