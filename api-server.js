import express from 'express';
import cors from 'cors';

const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API Routes
app.post('/sendPush', async (req, res) => {
  try {
    const { token, title, body, pincode, service } = req.body;
    console.log('📨 Mock sendPush called with:', { token, title, body, pincode, service });

    // ===== MODE 1: DIRECT TOKEN TEST =====
    if (token) {
      console.log('✅ Mock: Sending direct notification to token');
      return res.json({ success: true, mode: "single-token", mock: true });
    }

    // ===== MODE 2: BOOKING BASED PUSH =====
    if (!pincode || !service) {
      return res.status(400).json({
        error: "Missing pincode or service",
      });
    }

    console.log(`✅ Mock: Would send notifications for ${service} jobs in pincode ${pincode}`);
    return res.json({ 
      success: true, 
      sent: 3, 
      mode: "multicast", 
      mock: true,
      message: "Mock notification sent - in production this would send real push notifications"
    });
  } catch (err) {
    console.error("❌ Mock PUSH ERROR:", err);
    return res.status(500).json({
      error: "Push failed",
      message: err?.message || null,
      code: err?.code || null,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mock: true });
});

app.listen(port, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${port}`);
  console.log(`📡 Proxy configured: http://localhost:3000/api -> http://localhost:${port}`);
  console.log('⚠️  This is a MOCK server for development - no real push notifications will be sent');
});