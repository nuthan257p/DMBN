import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = "force-dynamic";

const PREDEFINED_SITES = {
  'f21': 'Nuthan',
  'e85': 'Bhanu',
  'b30': 'Mujamil',
  '270': 'Deepak'
};

const IS_PROD = !!process.env.KV_REST_API_URL;
const localNotesStore = global.notesStore || (global.notesStore = new Map());

async function saveSiteData(siteId, data) {
  if (IS_PROD) {
    await kv.set(`site:${siteId}`, data);
  } else {
    localNotesStore.set(siteId, data);
  }
}

async function initializeData(siteId) {
  if (PREDEFINED_SITES[siteId]) {
    const initialData = {
      password: PREDEFINED_SITES[siteId],
      tabs: [{ id: Date.now().toString(), content: '' }]
    };
    await saveSiteData(siteId, initialData);
    return initialData;
  }
  return null;
}

async function getSiteData(siteId) {
  if (IS_PROD) {
    try {
      const data = await kv.get(`site:${siteId}`);
      if (!data) return await initializeData(siteId);
      return data;
    } catch (e) {
      console.error("KV Error:", e);
      return null;
    }
  } else {
    const data = localNotesStore.get(siteId);
    if (!data) return await initializeData(siteId);
    return data;
  }
}

// Ensure local dev memory is seeded on spin up
if (!IS_PROD) {
  Object.keys(PREDEFINED_SITES).forEach(siteId => {
    if (!localNotesStore.has(siteId)) {
      localNotesStore.set(siteId, {
        password: PREDEFINED_SITES[siteId],
        tabs: [{ id: Date.now().toString(), content: '' }]
      });
    }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { siteId, password, action, tabs, newPassword } = body;
    
    if (!siteId || !password) {
      return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
    }

    const lowerId = siteId.toLowerCase();
    const siteData = await getSiteData(lowerId);

    if (!siteData) {
      return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
    }
    
    if (password.trim() !== siteData.password.trim()) {
      return NextResponse.json({ error: 'Incorrect password. Try again!' }, { status: 401 });
    }

    if (action === 'read') {
      return NextResponse.json({ tabs: siteData.tabs });
    }
    
    if (action === 'write') {
      await saveSiteData(lowerId, { 
        ...siteData, 
        tabs: tabs || [{ id: Date.now().toString(), content: '' }]
      });
      return NextResponse.json({ success: true });
    }
    
    if (action === 'changePassword') {
      if (!newPassword || newPassword.trim() === '') {
        return NextResponse.json({ error: 'New password cannot be empty.' }, { status: 400 });
      }
      await saveSiteData(lowerId, {
        ...siteData,
        password: newPassword
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
