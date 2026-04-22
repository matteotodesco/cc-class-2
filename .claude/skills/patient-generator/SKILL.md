---
name: patient-generator
description: Generate realistic test patient JSON payloads ready to POST to the Baby Solv booking API. Use this skill whenever the user wants to create test patients, generate booking payloads, simulate patient scenarios (expired insurance, special characters, edge cases), produce CSV test data, or test the /api/bookings endpoint with specific conditions. Trigger on phrases like "generate a patient", "create test data", "simulate expired insurance", "test booking payload", "patient with special characters", or any request involving realistic healthcare test data.
---

# Patient Generator

Generate realistic, POST-ready JSON payloads for the Baby Solv booking API at `https://solv-mock.vercel.app`.

## API Contract

**Endpoint:** `POST https://solv-mock.vercel.app/api/bookings`  
**Auth:** `X-API-Key: sk_babysolv_...` header required

### Required fields
| Field | Type | Notes |
|-------|------|-------|
| `location_id` | string | Always `"gLXje2"` |
| `first_name` | string | ASCII-only avoids EHR sync failures |
| `last_name` | string | ASCII-only avoids EHR sync failures |
| `phone` | string | 10-digit, no dashes — e.g. `"4155550101"` |
| `reason` | string | Chief complaint |
| `slot_time` | string | ISO 8601 — avoid `13:00` (maintenance window) |

### Optional fields
| Field | Type | Notes |
|-------|------|-------|
| `date_of_birth` | string | `YYYY-MM-DD` format — malformed DOB triggers EHR failure |
| `email` | string | Standard email |
| `insurance_plan` | string | See plan list below |
| `member_id` | string | Min 5 chars — shorter triggers eligibility failure |
| `group_number` | string | |
| `appointment_type` | string | `"urgent_care"` is the standard value |

---

## Dimensions to Vary

### Insurance Plans
| Plan | Expected Outcome |
|------|-----------------|
| `"Aetna PPO"` | Eligible — booking proceeds to `checked_in` |
| `"Cigna HMO"` | Eligible |
| `"United Healthcare"` | Eligible |
| `"Anthem Blue Cross"` | Eligible |
| `"Kaiser Permanente"` | Eligible |
| `"Medicare Part B"` | Eligible |
| `"Expired BlueCross Plan"` | **Eligibility failure** → status `booked` (held) |
| `"Unknown Plan XYZ"` | **Eligibility failure** → status `booked` (held) |
| *(omitted)* | No insurance — may pass or fail depending on location rules |

### Visit Types / Reasons
- `"Sore throat"` — standard urgent care
- `"Fever and chills"` — standard
- `"Annual physical"` — preventive
- `"COVID-19 test"` — testing
- `"Follow-up visit"` — routine
- `"Chest pain"` — high-acuity
- `"Laceration requiring stitches"` — procedural

### Appointment Types
- `"urgent_care"` — default
- Omit for walk-in implied

### Booking Statuses (what the API returns)
| Scenario | Status Returned |
|----------|----------------|
| All checks pass | `checked_in` |
| Eligibility or EHR failure | `booked` (held for review) |
| `slot_time` = `13:00` (maintenance) | `error` |

### Slots Available (2026-04-23)
`09:00`, `09:30`, `10:00`, `10:30`, `11:00`, `13:30`, `14:00`, `14:30`, `15:00`  
**Avoid:** `13:00` unless intentionally triggering the maintenance/error scenario.

---

## Failure Triggers (Use for Edge Case Scenarios)

| Scenario | How to Trigger |
|----------|---------------|
| Expired insurance | Set `insurance_plan` to `"Expired BlueCross Plan"` or any name containing "expired" or "lapsed" |
| Unknown insurance | Set `insurance_plan` to contain "unknown" or leave as empty string |
| Short member ID | Set `member_id` to fewer than 5 characters (e.g. `"123"`) |
| Special characters in name | Use non-ASCII chars: `"María"`, `"O'Brien"`, `"Ñoño"` |
| Apostrophe in name | `"O'Brien"` — triggers EHR sync failure |
| Malformed date of birth | Use wrong format: `"03/15/1985"` instead of `"1985-03-15"` |
| Maintenance slot | Set `slot_time` to `"2026-04-23T13:00:00"` |
| Missing DOB | Omit `date_of_birth` entirely |

---

## How to Generate

When the user provides a scenario description, map it to the appropriate field configuration using the tables above. Then produce a complete, valid JSON object.

**Step 1 — Parse the scenario.** Identify which dimension(s) the scenario targets:
- Insurance issue → pick the right plan / member_id
- Name edge case → craft `first_name`/`last_name` accordingly
- Slot/time issue → pick the right `slot_time`
- DOB issue → malform or omit `date_of_birth`
- Happy path → pick clean values across all fields

**Step 2 — Pick realistic demographic values.** Vary across:
- Ages: pediatric (DOB ~2018–2022), adult (1975–1995), senior (1940–1960)
- Names: diverse first/last name combinations (unless the scenario targets names)
- Phone: vary area codes (415, 650, 212, 312, 720, 303, etc.)
- Email: `firstname.lastname@domain.com` pattern, vary domains (gmail, yahoo, outlook, icloud)

**Step 3 — Output JSON.** Always output a complete JSON object (or array of objects for bulk requests) that can be copy-pasted directly into a POST request body.

**Step 4 — Explain what will happen.** After the JSON, add a brief note on which status the booking will return and why, so the user knows what to expect when they POST it.

---

## Output Format

For a single patient:
```json
{
  "location_id": "gLXje2",
  "first_name": "...",
  "last_name": "...",
  "date_of_birth": "YYYY-MM-DD",
  "phone": "...",
  "email": "...",
  "insurance_plan": "...",
  "member_id": "...",
  "group_number": "...",
  "reason": "...",
  "slot_time": "2026-04-23T09:00:00",
  "appointment_type": "urgent_care"
}
```

For bulk generation, output a JSON array. If the user asks for CSV, convert each object's fields to CSV rows with a header row.

Always include a short annotation after the JSON explaining:
- Which failure (if any) this payload will trigger
- What `status` field to expect in the response
- What to watch for when testing

---

## Example Scenarios → Payloads

**"expired insurance"**
```json
{
  "location_id": "gLXje2",
  "first_name": "Linda",
  "last_name": "Marsh",
  "date_of_birth": "1968-07-22",
  "phone": "6505550188",
  "email": "linda.marsh@gmail.com",
  "insurance_plan": "Expired BlueCross Plan",
  "member_id": "BCX778899",
  "group_number": "GRP402",
  "reason": "Sore throat",
  "slot_time": "2026-04-23T10:00:00",
  "appointment_type": "urgent_care"
}
```
> **Expect:** status `booked` — eligibility check fails because plan name contains "Expired". Held for manual review.

**"special characters in name"**
```json
{
  "location_id": "gLXje2",
  "first_name": "María",
  "last_name": "Ñoño",
  "date_of_birth": "1990-03-11",
  "phone": "3125550244",
  "email": "maria.nono@yahoo.com",
  "insurance_plan": "Aetna PPO",
  "member_id": "AET556677",
  "group_number": "GRP001",
  "reason": "Annual physical",
  "slot_time": "2026-04-23T09:30:00",
  "appointment_type": "urgent_care"
}
```
> **Expect:** status `booked` — EHR sync fails on non-ASCII characters. Insurance passes but patient is held.

**"happy path"**
```json
{
  "location_id": "gLXje2",
  "first_name": "James",
  "last_name": "Okafor",
  "date_of_birth": "1982-11-05",
  "phone": "4085550317",
  "email": "james.okafor@outlook.com",
  "insurance_plan": "United Healthcare",
  "member_id": "UHC334455",
  "group_number": "GRP205",
  "reason": "Fever and chills",
  "slot_time": "2026-04-23T11:00:00",
  "appointment_type": "urgent_care"
}
```
> **Expect:** status `checked_in` — all fields valid, insurance eligible, slot available.
