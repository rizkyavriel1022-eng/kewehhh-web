// netlify/functions/get-scripts.js
import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("scripts-store");
  const data = await store.get("data", { type: "json" });

  if (!data) {
    return new Response(JSON.stringify({ scripts: [], total: 0 }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
};
