import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const personId = url.searchParams.get("personId");
    const week = url.searchParams.get("week");
    const docKey = url.searchParams.get("docKey");

    if (!personId || !week || !docKey) {
      return new Response(JSON.stringify({ ok:false, error:"חסרים פרמטרים" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = getStore("mentor-data");
    const key = `shared/person-${personId}/week-${week}/${docKey}.json`;

    if (req.method === "GET") {
      const val = await store.get(key, { type: "json" });
      return new Response(JSON.stringify({ ok:true, data: val || null }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      await store.setJSON(key, body);
      return new Response(JSON.stringify({ ok:true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok:false, error:"שיטה לא נתמכת" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
