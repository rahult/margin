# Ingestion API specification

## Authentication

All requests require a bearer token scoped to the producing team. Tokens rotate every 90 days via the platform console.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /v1/events | Publish a batch of events |
| GET | /v1/streams/{id} | Describe a stream |
| POST | /v1/streams/{id}/replay | Request a replay window |

## Publishing events

```json
{
  "stream": "orders",
  "events": [
    {"id": "evt_123", "type": "order.created", "payload": {"total": 4200}}
  ]
}
```

The API is idempotent on `id`. Duplicate IDs within a stream are acknowledged but dropped.

```sh
curl -X POST https://api.example.com/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -d @batch.json
```

## Rate limits

Default limit is 600 requests per minute per token. Responses include `X-RateLimit-Remaining`. Sustained overage returns `429` with a `Retry-After` header; clients must back off exponentially rather than retry immediately.

## Errors

Errors follow RFC 9457 problem details. The `type` field is a stable identifier suitable for programmatic handling; `title` is for humans and may change.
