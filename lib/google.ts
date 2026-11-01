import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
  'profile',
];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );
}

export function getAuthUrl(state?: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export async function getTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function listAccounts(accessToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });

  try {
    const res = await client.request({
      url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      method: 'GET',
    });
    return { data: res.data, error: null, source: 'official_api' as const };
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 403 || status === 401) {
      return {
        data: null,
        error: 'API access not approved or insufficient permissions. Request access at https://developers.google.com/my-business/content/prereqs',
        source: 'official_api' as const,
        requiresApproval: true,
      };
    }
    return { data: null, error: err.message, source: 'official_api' as const };
  }
}

export async function listLocations(accessToken: string, accountName: string) {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });

  try {
    const res = await client.request({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
      method: 'GET',
      params: { readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,metadata' },
    });
    return { data: res.data, error: null, source: 'official_api' as const };
  } catch (err: any) {
    return { data: null, error: err.message, source: 'official_api' as const };
  }
}
