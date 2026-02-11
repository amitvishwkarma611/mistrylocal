// Requires Vercel ENV:
// FIREBASE_PROJECT_ID
// FIREBASE_CLIENT_EMAIL
// FIREBASE_PRIVATE_KEY

import type { VercelRequest, VercelResponse } from '@vercel/node'
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { token, title, body } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token required' })
    }

    await admin.messaging().send({
      token,
      notification: { title, body },
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Push error:', error)
    return res.status(500).json({ error: 'Push failed' })
  }
}