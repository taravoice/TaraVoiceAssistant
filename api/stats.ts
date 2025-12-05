export default async function handler(req: any, res: any) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID; // Optional: Required if project is in a team

  // If keys are missing, return a specific status that the frontend can detect to show mock data
  if (!token || !projectId) {
    return res.status(401).json({ 
      error: 'Missing Vercel Configuration', 
      message: 'Please add VERCEL_API_TOKEN and VERCEL_PROJECT_ID to Environment Variables.' 
    });
  }

  try {
    // Construct the Vercel API URL
    // We request data for the last 30 days
    let url = `https://api.vercel.com/v1/analytics/stats?projectId=${projectId}&from=30d`;
    
    // If a Team ID is present, it MUST be appended for the request to work
    if (teamId) {
      url += `&teamId=${teamId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vercel API Error:', errorText);
      
      // Try to parse JSON error from Vercel to give a better message
      try {
        const errorJson = JSON.parse(errorText);
        return res.status(response.status).json({ 
          error: errorJson.error?.code || 'Vercel API Error',
          message: errorJson.error?.message || 'Failed to fetch from Vercel API' 
        });
      } catch (e) {
        return res.status(response.status).json({ error: 'Failed to fetch from Vercel API', details: errorText });
      }
    }

    const data = await response.json();
    
    // Return the raw data. The frontend will map it to the dashboard widgets.
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
