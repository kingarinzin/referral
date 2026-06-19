// lib/token.ts
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Debug: log cache status
  console.log('[token] Cache valid?', cachedToken && cachedToken.expiresAt > Date.now() + 60000);

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    console.log('[token] Returning cached token');
    return cachedToken.token;
  }

  console.log('[token] Fetching new token from SSO');

  const tokenUrl = process.env.SSO_TOKEN_URL;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  // 🔍 Critical debug logs – check exact values
  console.log('[token] SSO_TOKEN_URL:', tokenUrl);
  console.log('[token] CLIENT_ID:', clientId);
  console.log('[token] CLIENT_SECRET (last 4 chars):', clientSecret ? '...' + clientSecret.slice(-4) : 'undefined');
  console.log('[token] CLIENT_SECRET length:', clientSecret ? clientSecret.length : 0);

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error(`Missing env vars: tokenUrl=${!!tokenUrl}, clientId=${!!clientId}, clientSecret=${!!clientSecret}`);
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const responseText = await response.text();
  console.log('[token] Response status:', response.status);
  console.log('[token] Response body preview:', responseText.substring(0, 200));

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} - ${responseText}`);
  }

  const data = JSON.parse(responseText);
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;

  cachedToken = {
    token: accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  console.log('[token] New token obtained, expires in', expiresIn, 'seconds');
  return accessToken;
}