// Poll Worker for dannynissani.com
// Single-blob KV design → exactly 1 write per vote.
// Hard cap: 500 votes/day → friendly "Vote Tomorrow" message when reached.

const DAILY_CAP = 500;
const BLOB_KEY = "poll_ai_2026";
const CORS = {
  "Access-Control-Allow-Origin": "https://dannynissani.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const VALID_OPTIONS = ["agents", "crm", "voice", "content", "data"];

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function emptyBlob() {
  return {
    date: todayUTC(),
    total_today: 0,
    totals: { agents: 0, crm: 0, voice: 0, content: 0, data: 0 },
  };
}

async function loadBlob(env) {
  const raw = await env.POLL.get(BLOB_KEY);
  if (!raw) return emptyBlob();
  const b = JSON.parse(raw);
  // Daily reset
  if (b.date !== todayUTC()) {
    b.date = todayUTC();
    b.total_today = 0;
  }
  return b;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname !== "/poll") {
      return json({ error: "not_found" }, 404);
    }

    // GET /poll → current tallies (no write)
    if (request.method === "GET") {
      const b = await loadBlob(env);
      return json({
        totals: b.totals,
        total_today: b.total_today,
        capped: b.total_today >= DAILY_CAP,
        cap: DAILY_CAP,
      });
    }

    // POST /poll?option=agents
    if (request.method === "POST") {
      const opt = url.searchParams.get("option");
      if (!VALID_OPTIONS.includes(opt)) {
        return json({ error: "invalid_option" }, 400);
      }

      const b = await loadBlob(env);

      if (b.total_today >= DAILY_CAP) {
        return json(
          {
            error: "daily_cap_reached",
            message: "Vote Tomorrow",
            totals: b.totals,
            total_today: b.total_today,
            capped: true,
            cap: DAILY_CAP,
          },
          429
        );
      }

      b.totals[opt] = (b.totals[opt] || 0) + 1;
      b.total_today += 1;

      await env.POLL.put(BLOB_KEY, JSON.stringify(b));

      return json({
        ok: true,
        totals: b.totals,
        total_today: b.total_today,
        capped: b.total_today >= DAILY_CAP,
        cap: DAILY_CAP,
      });
    }

    return json({ error: "method_not_allowed" }, 405);
  },
};
