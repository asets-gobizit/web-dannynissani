# Poll Worker — `dannynissani-poll`

Cloudflare Worker that powers the AI poll on `dannynissani.com`.

- **Route:** `api.dannynissani.com/*`
- **KV namespace binding:** `POLL` → namespace `dannynissani_poll` (id `52b6e93b4eff48fcb31e4f359487ac44`)
- **Daily cap:** 500 votes (safety buffer under Cloudflare free-tier 1,000 writes/day)
- **Endpoints:**
  - `GET  /poll` → current tallies (no write)
  - `POST /poll?option=<agents|crm|voice|content|data>` → vote
  - When daily cap hit, returns `429` with `{"error":"daily_cap_reached","message":"Vote Tomorrow", ...}`

## Deploy / redeploy

Use a Cloudflare API token with `Workers Scripts: Edit` + `Workers KV: Edit`:

```bash
TOKEN="<your token>"
ACCT="d06b42a2d55da7921f49af9e4195011f"
SCRIPT="dannynissani-poll"

cat > /tmp/metadata.json <<EOF
{
  "main_module": "worker.js",
  "bindings": [
    {"type": "kv_namespace", "name": "POLL", "namespace_id": "52b6e93b4eff48fcb31e4f359487ac44"}
  ],
  "compatibility_date": "2025-01-01"
}
EOF

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/$SCRIPT" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'metadata=@/tmp/metadata.json;type=application/json' \
  -F 'worker.js=@poll.js;type=application/javascript+module'
```
