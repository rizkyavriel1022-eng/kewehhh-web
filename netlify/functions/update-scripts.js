// netlify/functions/update-scripts.js
import { getStore } from "@netlify/blobs";

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============ SCRIPTBLOX ============ */
async function fetchFromScriptBlox(page) {
  try {
    const res = await fetch(`https://scriptblox.com/api/script/fetch?page=${page}&max=20`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data?.result?.scripts || [];
    console.log(`ScriptBlox page ${page}: ${list.length} script`);
    return list.map(s => ({
      id: 'sb-' + s._id,
      title: s.title || 'Untitled',
      game: s.game?.name || 'Universal',
      image: s.image ? (s.image.startsWith('http') ? s.image : 'https://scriptblox.com' + s.image) : '',
      views: s.views || 0,
      likeCount: s.likeCount || 0,
      keyless: s.key !== true,
      isPatched: !!s.isPatched,
      verified: !!s.verified,
      features: s.features || '',
      script: s.script || ''
    }));
  } catch (e) {
    console.log(`ScriptBlox page ${page} error:`, e.message);
    return [];
  }
}

/* ============ RSCRIPTS ============ */
async function fetchFromRScripts(page) {
  try {
    const res = await fetch(`https://rscripts.net/api/v2/scripts?page=${page}&orderBy=date&sort=desc`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data.scripts || [];
    console.log(`RScripts page ${page}: ${list.length} script`);
    return list.map(s => ({
      id: 'rs-' + s._id,
      title: s.title || 'Untitled',
      game: s.game?.title || s.game?.name || 'Universal',
      image: s.image || s.game?.imgurl || '',
      views: s.views || 0,
      likeCount: s.likes || 0,
      keyless: s.keySystem !== true,
      isPatched: false,
      verified: !!(s.user?.verified),
      features: s.description || '',
      script: s.rawScript ? `loadstring(game:HttpGet("${s.rawScript}"))()` : ''
    }));
  } catch (e) {
    console.log(`RScripts page ${page} error:`, e.message);
    return [];
  }
}

/* ============ MAIN ============ */
export default async () => {
  console.log('Mulai update...');
  const startTime = Date.now();

  let sb = [], rs = [];

  // --- ScriptBlox: 8 halaman (jeda 1 detik biar gak kena rate limit) ---
  for (let i = 1; i <= 8; i++) {
    console.log(`--- ScriptBlox page ${i} ---`);
    const data = await fetchFromScriptBlox(i);
    if (!data.length) break;
    sb = sb.concat(data);
    await sleep(1000);
  }

  // --- RScripts: 8 halaman ---
  for (let i = 1; i <= 8; i++) {
    console.log(`--- RScripts page ${i} ---`);
    const data = await fetchFromRScripts(i);
    if (!data.length) break;
    rs = rs.concat(data);
    await sleep(500);
  }

  // --- Gabung + hapus duplikat ---
  const all = [...sb, ...rs];
  const seen = new Set();
  const unique = all.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  // Sort by views (terpopuler dulu)
  unique.sort((a, b) => b.views - a.views);

  const output = {
    scripts: unique,
    updatedAt: new Date().toISOString(),
    total: unique.length,
    sources: {
      scriptblox: sb.length,
      rscripts: rs.length
    }
  };

  const store = getStore("scripts-store");
  await store.setJSON("data", output);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Total: ${unique.length} script (SB: ${sb.length}, RS: ${rs.length}), ${duration} detik`);

  return new Response(JSON.stringify({
    total: unique.length,
    scriptblox: sb.length,
    rscripts: rs.length,
    duration: duration + 's'
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const config = { schedule: "0 */6 * * *" };