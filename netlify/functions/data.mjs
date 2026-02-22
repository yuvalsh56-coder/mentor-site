import { getStore } from "@netlify/blobs";

const PEOPLE = [
  {
    "id": "adam",
    "name": "אדם לרנר"
  },
  {
    "id": "osher",
    "name": "אושר קריספל"
  },
  {
    "id": "eliyahu",
    "name": "אליהו דבקרוב"
  },
  {
    "id": "binyahu",
    "name": "בניהו שמואליאן"
  },
  {
    "id": "harel",
    "name": "הראל רחימי"
  },
  {
    "id": "yaniv",
    "name": "יניב לוריה"
  },
  {
    "id": "liad",
    "name": "ליעד לביא"
  },
  {
    "id": "noya",
    "name": "נויה קלדרון"
  },
  {
    "id": "ido",
    "name": "עידו גרשום"
  },
  {
    "id": "idan",
    "name": "עידן זוראל"
  },
  {
    "id": "sharel",
    "name": "שראל אלסיט"
  },
  {
    "id": "michal",
    "name": "מיכל פיגרין"
  }
];

export default async (req) => {
  try {
    const url = new URL(req.url);

    // GET בלי פרמטרים -> רשימת צוערים
    const personId = url.searchParams.get("personId");
    if (req.method === "GET" && !personId) {
      return new Response(JSON.stringify({ ok:true, people: PEOPLE }), {
        status: 200,
        headers: { "Content-Type":"application/json", "Cache-Control":"no-store" }
      });
    }

    const week = url.searchParams.get("week");
    const doc = url.searchParams.get("doc");
    if (!personId || !week || !doc) {
      return new Response(JSON.stringify({ ok:false, error:"חסרים פרמטרים" }), {
        status: 400,
        headers: { "Content-Type":"application/json" }
      });
    }

    const store = getStore("mentor-data");
    const key = `shared/person-${personId}/week-${week}/${doc}.json`;

    if (req.method === "GET") {
      const val = await store.get(key, { type:"json" });
      return new Response(JSON.stringify({ ok:true, data: val || null }), {
        status: 200,
        headers: { "Content-Type":"application/json", "Cache-Control":"no-store" }
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      await store.setJSON(key, body);
      return new Response(JSON.stringify({ ok:true }), {
        status: 200,
        headers: { "Content-Type":"application/json" }
      });
    }

    return new Response(JSON.stringify({ ok:false, error:"שיטה לא נתמכת" }), {
      status: 405,
      headers: { "Content-Type":"application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type":"application/json" }
    });
  }
};
