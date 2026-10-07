// netlify/functions/update-scripts.js
import { getStore } from "@netlify/blobs";

async function fetchRScripts(page) {
  try {
    const res = await fetch(`https://rscripts.net/api/v2/scripts?page=${page}&orderBy=date&sort=desc`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });
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

export default async () => {
  console.log('Mulai update...');
  let rs = [];

  for (let i = 1; i <= 10; i++) {
    console.log(`--- RScripts page ${i} ---`);
    const data = await fetchRScripts(i);
    if (!data.length) break;
    rs = rs.concat(data);
    await new Promise(r => setTimeout(r, 500));
  }

  const seen = new Set();
  const unique = rs.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  unique.sort((a, b) => b.views - a.views);

  const store = getStore("scripts-store");
  await store.setJSON("data", {
    scripts: unique,
    updatedAt: new Date().toISOString(),
    total: unique.length
  });

  console.log(`Total: ${unique.length} script disimpan`);

  return new Response(JSON.stringify({ total: unique.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const config = { schedule: "0 */6 * * *" };