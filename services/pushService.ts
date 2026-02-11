export async function sendPush(token: string, title: string, body: string) {
  try {
    await fetch('/api/sendPush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, title, body }),
    })
  } catch (err) {
    console.error('Push send failed:', err)
  }
}