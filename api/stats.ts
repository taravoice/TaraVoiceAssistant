// @ts-nocheck
export default async function handler(req, res) {
  // Add CORS headers just in case
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  // Debug info to help user
  const debugInfo = {
    hasToken: !!token,
    projectIdConfigured: projectId || 'MISSING',
    hasTeamId: !!teamId
  };

  console.log("API Invoked. Debug:", debugInfo);

  if (!token || !projectId) {
    return res.status(500).json({ 
      error: 'configuration_error', 
      message: 'Missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID in Environment Variables.',
      debug: debugInfo
    });
  }

  try {
    // We request data for the last 30 days
    let url = `https://api.vercel.com/v1/analytics/stats?projectId=${projectId}&from=30d`;
    
    // Append Team ID if present (Required for Team/Pro accounts)
    if (teamId) {
      url += `&teamId=${teamId}`;
    }
    
    console.log("Fetching from Vercel API...");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vercel API Error Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        // Forward the specific error code from Vercel (e.g., 'forbidden')
        return res.status(response.status).json({ 
          error: errorJson.error?.code || 'vercel_api_error',
          message: errorJson.error?.message || 'Failed to fetch data from Vercel.',
          debug: debugInfo
        });
      } catch (e) {
        return res.status(response.status).json({ 
            error: 'vercel_api_error', 
            details: errorText,
            debug: debugInfo 
        });
      }
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Serverless Execution Error:', error);
    return res.status(500).json({ 
        error: 'internal_server_error', 
        message: error.message,
        debug: debugInfo
    });
  }
}
