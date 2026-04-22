require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SOLV_BASE = 'https://partner-api.solvhealth.com';
const LOCATION_ID = process.env.SOLV_PROD_LOCATION_ID;
const CLIENT_ID = process.env.SOLV_PROD_CLIENT_ID;
const CLIENT_SECRET = process.env.SOLV_PROD_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${SOLV_BASE}/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLIENT_ID,
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'service_api',
      scope: 'write:bookings',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

app.get('/api/slots', async (req, res) => {
  try {
    const token = await getToken();
    const solvRes = await fetch(
      `${SOLV_BASE}/v1/partner/locations/${LOCATION_ID}/slots?number_of_days_worth=7&return_walkin_slots=false`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': CLIENT_ID,
        },
      }
    );
    const data = await solvRes.json();
    res.status(solvRes.status).json(data);
  } catch (err) {
    console.error('Slots error:', err);
    res.status(500).json({ error: err.message, cause: err.cause?.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const token = await getToken();

    const { member_id, group_number, insurance_plan, ...bookingFields } = req.body;

    const payload = {
      ...bookingFields,
      location_id: LOCATION_ID,
    };

    const solvRes = await fetch(`${SOLV_BASE}/v1/partner/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-api-key': CLIENT_ID,
      },
      body: JSON.stringify(payload),
    });

    const data = await solvRes.json();
    res.status(solvRes.status).json(data);
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: err.message, cause: err.cause?.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Booking server running at http://localhost:${PORT}`));
