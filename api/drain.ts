
// @ts-nocheck
import { storage, ensureAuth } from '../firebase';
import { ref, uploadString } from 'firebase/storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Ensure we are authenticated to write to storage
    await ensureAuth();

    if (!storage) {
        throw new Error("Firebase Storage not initialized");
    }

    // 2. Get the analytics payload
    const payload = req.body;
    
    // 3. Generate a unique filename based on time
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    // CRITICAL: Must be in analytics/logs/ for Dashboard to list it
    const filename = `analytics/logs/${timestamp}_${randomId}.json`;

    // 4. Create a reference
    const storageRef = ref(storage, filename);

    // 5. Upload the raw JSON data as a file
    // We treat it as a log entry
    const dataString = JSON.stringify(payload);
    
    await uploadString(storageRef, dataString, 'raw', {
        contentType: 'application/json'
    });

    console.log(`Analytics Log Saved: ${filename}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Drain Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
