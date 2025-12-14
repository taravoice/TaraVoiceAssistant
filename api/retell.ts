
// @ts-nocheck
export default async function handler(req, res) {
  // CORS Headers to allow Retell to access this
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // --- SECURITY CHECK ---
    // 1. Get the secret from Vercel Environment Variables
    const mySecret = process.env.RETELL_SECRET_KEY;

    // 2. Only enforce security if the variable is set in Vercel
    if (mySecret) {
        const authHeader = req.headers['authorization']; // Expecting "Bearer <key>"
        const apiKeyHeader = req.headers['x-api-key'];   // Alternative header
        
        // Check provided keys against the stored secret
        const isValidBearer = authHeader && authHeader.split(' ')[1] === mySecret;
        const isValidApiKey = apiKeyHeader === mySecret;

        if (!isValidBearer && !isValidApiKey) {
            return res.status(401).json({ error: "Unauthorized: Invalid or missing Secret Key." });
        }
    }

    // --- DATA FETCHING ---

    // 1. Get Storage Bucket Domain
    let bucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucket) {
        throw new Error("Storage Bucket environment variable missing.");
    }
    // Clean bucket URL
    bucket = bucket.replace(/^gs:\/\//, '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();

    // 2. Fetch the "Current Pointer" to find the latest active configuration
    const pointerUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/config%2Fcurrent.json?alt=media&t=${Date.now()}`;
    const pointerRes = await fetch(pointerUrl);
    
    let configUrl = '';
    
    if (pointerRes.ok) {
        const pointerData = await pointerRes.json();
        if (pointerData.version) {
            // Versioned Config
            configUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/config%2F${pointerData.version}?alt=media`;
        }
    }

    // Fallback to legacy if pointer fails
    if (!configUrl) {
        configUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/config%2Fsite_config.json?alt=media`;
    }

    // 3. Fetch the Actual Site Content
    const configRes = await fetch(configUrl);
    if (!configRes.ok) {
        throw new Error("Could not fetch site configuration from Firebase.");
    }
    const data = await configRes.json();

    // 4. Construct the Agent System Prompt
    // This maps your Website CMS fields into the AI's Brain
    let systemPrompt = `You are ${data.home.heroTitle || 'an AI Assistant'}. `;
    systemPrompt += `Your primary goal is: ${data.home.heroSubtitle || 'To help customers.'}\n\n`;
    
    systemPrompt += `### BUSINESS INFORMATION\n`;
    systemPrompt += `${data.home.aboutTitle}\n${data.home.aboutText}\n\n`;

    if (data.customSections && data.customSections.length > 0) {
        systemPrompt += `### KNOWLEDGE BASE\n`;
        data.customSections.forEach(section => {
            systemPrompt += `[${section.title}]\n${section.content}\n\n`;
        });
    }

    systemPrompt += `### INSTRUCTIONS\n`;
    systemPrompt += `- You are helpful, polite, and efficient.\n`;
    systemPrompt += `- If asked about pricing, refer to the knowledge base.\n`;
    systemPrompt += `- Your role is to set appointments or answer questions based on the info above.\n`;

    // 5. Return JSON Response for Retell
    // Retell "Dynamic Variables" or Custom LLM expects JSON.
    return res.status(200).json({
        agent_name: data.home.heroTitle,
        system_prompt: systemPrompt,
        business_data: data // Sending raw data too if needed for tool calling
    });

  } catch (error) {
    console.error("Retell Endpoint Error:", error);
    return res.status(500).json({ 
        error: "Failed to generate instructions",
        details: error.message 
    });
  }
}
