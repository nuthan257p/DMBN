import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = "force-dynamic";

const PREDEFINED_SITES = {
  'f21': 'Nuthan',
  'e85': 'Bhanu',
  'b30': 'Mujamil',
  '270': 'Deepak',
  '257': 'teja' // Admin
};

const IS_PROD = !!process.env.KV_REST_API_URL;
const localNotesStore = global.notesStore || (global.notesStore = new Map());
const localIndexStore = global.indexStore || (global.indexStore = new Set());

async function getSitesIndex() {
  if (IS_PROD) {
    try {
      const index = await kv.get('sites_index');
      return Array.isArray(index) ? index : Object.keys(PREDEFINED_SITES);
    } catch (e) {
      return Object.keys(PREDEFINED_SITES);
    }
  } else {
    if (localIndexStore.size === 0) {
      Object.keys(PREDEFINED_SITES).forEach(k => localIndexStore.add(k));
    }
    return Array.from(localIndexStore);
  }
}

async function addSiteToIndex(siteId) {
  if (IS_PROD) {
    const index = await getSitesIndex();
    if (!index.includes(siteId)) {
      index.push(siteId);
      await kv.set('sites_index', index);
    }
  } else {
    localIndexStore.add(siteId);
  }
}

async function saveSiteData(siteId, data) {
  if (IS_PROD) {
    await kv.set(`site:${siteId}`, data);
  } else {
    localNotesStore.set(siteId, data);
  }
  await addSiteToIndex(siteId);
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
      localIndexStore.add(siteId);
    }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { siteId, password, action, tabs, newPassword, newSiteId, newSitePassword } = body;
    
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

    // Admin Actions (Assuming '257' is admin)
    if (lowerId === '257') {
      if (action === 'admin_getAllSites') {
        const index = await getSitesIndex();
        const allSites = [];
        for (const id of index) {
          const sData = await getSiteData(id);
          if (sData) {
            allSites.push({ siteId: id, password: sData.password });
          }
        }
        return NextResponse.json({ sites: allSites });
      }

      if (action === 'admin_createSite') {
        if (!newSiteId || !newSitePassword) {
          return NextResponse.json({ error: 'Missing new site details.' }, { status: 400 });
        }
        const newLowerId = newSiteId.toLowerCase();
        const existingData = await getSiteData(newLowerId);
        if (existingData) {
          return NextResponse.json({ error: 'Site already exists.' }, { status: 400 });
        }
        
        await saveSiteData(newLowerId, {
          password: newSitePassword,
          tabs: [{ id: Date.now().toString(), content: '' }]
        });
        return NextResponse.json({ success: true });
      }
    }

    // Standard User Actions
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
