const crypto = require("crypto");

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "15PMe1oLZkjo7SF2jIUYv6_ldZQWEB4Hl0moKt49znAo";
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Orders";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const SHEET_HEADERS = [
  "Order ID",
  "Status",
  "Date Created",
  "Customer Name",
  "Phone",
  "Email",
  "Delivery Region",
  "Delivery Address",
  "Notes",
  "Items",
  "Quantities",
  "Unit Prices",
  "Line Totals",
  "Subtotal",
  "Subtotal Breakdown",
  "Raw Order JSON"
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!["POST", "PATCH"].includes(req.method)) {
    return res.status(405).json({ error: "Only POST and PATCH requests are allowed." });
  }

  try {
    const token = await getGoogleAccessToken();
    await ensureSheetReady(token);

    if (req.method === "PATCH") {
      const body = readBodyFromRequest(req);
      const updateResult = await updateOrderStatusRow(token, body.orderId, body.status);
      return res.status(200).json({
        ok: true,
        sheetStatus: "Synced",
        updatedRange: updateResult.updatedRange || null
      });
    }

    const order = readOrderFromRequest(req);
    validateOrder(order);

    const appendResult = await appendOrderRow(token, order);
    return res.status(200).json({
      ok: true,
      sheetStatus: "Synced",
      updatedRange: appendResult.updates ? appendResult.updates.updatedRange : null
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "Unable to save order to Google Sheets."
    });
  }
};

function readOrderFromRequest(req) {
  const body = readBodyFromRequest(req);
  return body.order || body;
}

function readBodyFromRequest(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
}

function validateOrder(order) {
  if (!order || typeof order !== "object") {
    throw new Error("Missing order payload.");
  }

  if (!order.id || !order.customerName || !order.email) {
    throw new Error("Order payload is missing required customer details.");
  }

  if (!Array.isArray(order.products) || order.products.length === 0) {
    throw new Error("Order payload must include at least one product.");
  }
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets credentials are not configured in Vercel environment variables.");
  }

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = {
    alg: "RS256",
    typ: "JWT"
  };
  const jwtPayload = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const unsignedJwt = `${base64Url(JSON.stringify(jwtHeader))}.${base64Url(JSON.stringify(jwtPayload))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google authentication failed.");
  }

  return data.access_token;
}

async function ensureSheetReady(token) {
  const spreadsheet = await sheetsRequest(token, `/${SHEET_ID}?fields=sheets.properties.title`);
  const titles = (spreadsheet.sheets || []).map(sheet => sheet.properties.title);

  if (!titles.includes(SHEET_TAB)) {
    await sheetsRequest(token, `/${SHEET_ID}:batchUpdate`, {
      method: "POST",
      body: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_TAB
              }
            }
          }
        ]
      }
    });
  }

  const headerRange = `${quoteSheetName(SHEET_TAB)}!A1:P1`;
  const headerData = await sheetsRequest(token, `/${SHEET_ID}/values/${encodeURIComponent(headerRange)}`);
  const hasHeaders = Array.isArray(headerData.values) && headerData.values.length > 0;

  if (!hasHeaders) {
    await sheetsRequest(token, `/${SHEET_ID}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`, {
      method: "PUT",
      body: {
        values: [SHEET_HEADERS]
      }
    });
  }
}

async function appendOrderRow(token, order) {
  const range = `${quoteSheetName(SHEET_TAB)}!A:P`;
  return sheetsRequest(
    token,
    `/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: {
        values: [buildOrderRow(order)]
      }
    }
  );
}

async function updateOrderStatusRow(token, orderId, status) {
  if (!orderId || !status) {
    throw new Error("Missing orderId or status for status update.");
  }

  const range = `${quoteSheetName(SHEET_TAB)}!A:P`;
  const data = await sheetsRequest(token, `/${SHEET_ID}/values/${encodeURIComponent(range)}`);
  const rows = data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === orderId);

  if (rowIndex === -1) {
    throw new Error(`Order ${orderId} was not found in Google Sheets.`);
  }

  const sheetRowNumber = rowIndex + 1;
  const statusRange = `${quoteSheetName(SHEET_TAB)}!B${sheetRowNumber}`;
  const result = await sheetsRequest(token, `/${SHEET_ID}/values/${encodeURIComponent(statusRange)}?valueInputOption=RAW`, {
    method: "PUT",
    body: {
      values: [[status]]
    }
  });

  return result;
}

async function sheetsRequest(token, path, options = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data.error && data.error.message ? data.error.message : "Google Sheets request failed.";
    throw new Error(message);
  }

  return data;
}

function buildOrderRow(order) {
  const products = Array.isArray(order.products) ? order.products : [];
  return [
    order.id,
    order.status || "Pending",
    order.createdAt || new Date().toISOString(),
    order.customerName || "",
    order.phone || "",
    order.email || "",
    order.deliveryRegionLabel || order.deliveryRegion || "",
    order.deliveryAddress || "",
    order.notes || "",
    products.map(product => product.name).join(", "),
    products.map(product => product.quantity).join(", "),
    products.map(product => formatMoney(product.unitPrice ?? product.price, product.currency)).join(", "),
    products.map(product => formatMoney(product.total, product.currency)).join(", "),
    order.subtotalText || formatSubtotal(order.subtotalBreakdown || order.subtotal),
    JSON.stringify(order.subtotalBreakdown || order.subtotal || {}),
    JSON.stringify(order)
  ];
}

function formatSubtotal(subtotal) {
  if (!subtotal) {
    return "";
  }

  if (typeof subtotal === "number") {
    return formatMoney(subtotal, "PHP");
  }

  return Object.keys(subtotal)
    .map(currency => formatMoney(subtotal[currency], currency))
    .join(" + ");
}

function formatMoney(amount, currency = "PHP") {
  return `${currency || "PHP"} ${Number(amount || 0).toFixed(2)}`;
}

function normalizePrivateKey(privateKey) {
  return privateKey ? privateKey.replace(/\\n/g, "\n") : "";
}

function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
