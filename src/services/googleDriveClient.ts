import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Provider with exact least-privilege Google Drive scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache in memory only — NEVER in localStorage or sessionStorage
let cachedAccessToken: string | null = null;

export async function connectGoogleDriveAccount(adminToken: string): Promise<{ success: boolean; email?: string; message: string }> {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google OAuth succeeded but access token was not returned.');
    }

    cachedAccessToken = credential.accessToken;

    // Send token to backend to store in server session & initialize backup hierarchy
    const res = await fetch('/api/drive/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ accessToken: cachedAccessToken })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Server rejected Google Drive authorization.');
    }

    return {
      success: true,
      email: data.email || result.user.email || 'vasanthnkl500@gmail.com',
      message: data.message || 'Google Drive connected successfully.'
    };
  } catch (err: any) {
    console.error('Google Drive sign-in error:', err);
    return {
      success: false,
      message: err.message || 'Failed to authenticate with Google.'
    };
  }
}

export async function getDriveStatusFromServer(adminToken: string) {
  const res = await fetch('/api/drive/status', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return res.json();
}

export async function testDriveConnectionApi(adminToken: string) {
  const res = await fetch('/api/drive/test-connection', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return res.json();
}

export async function triggerDriveBackupNowApi(adminToken: string) {
  const res = await fetch('/api/drive/backup-now', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return res.json();
}

export async function fetchDriveHistoryApi(adminToken: string) {
  const res = await fetch('/api/drive/history', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return res.json();
}

export async function disconnectDriveSession() {
  cachedAccessToken = null;
  try {
    await signOut(auth);
  } catch {}
}
