export default async function handler(req: any, res: any) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

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
    const url = `https://api.vercel.com/v1/analytics/stats?projectId=${projectId}&from=30d`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vercel API Error:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch from Vercel API' });
    }

    const data = await response.json();
    
    // Return the raw data. The frontend will map it to the dashboard widgets.
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
