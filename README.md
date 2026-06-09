# JDRUS Online Merchandise Shop

UBE Shop is a beginner-friendly merchandise website starter for small creators. If you are a small YouTuber, streamer, artist, or community creator who wants to sell simple merch online, this project gives you a cute store, cart, checkout flow, forum page, and admin dashboard using plain HTML, CSS, and JavaScript.

It is built as a lightweight starter store that can be edited easily, deployed on Vercel, and connected to Google Sheets for order tracking.

## Local Use

Open `index.html` directly to browse the shop. When opened as a local file, orders are saved to `localStorage` only.

## Vercel Deployment

Deploy the folder to Vercel. The static pages will be served normally, and `api/orders.js` will run as the order API.

## Google Sheets Setup

The order API writes to this spreadsheet by default:

```txt
15PMe1oLZkjo7SF2jIUYv6_ldZQWEB4Hl0moKt49znAo
```

1. In Google Cloud, enable the Google Sheets API.
2. Create a service account.
3. Copy the service account email.
4. Open the Google Sheet and share it with that service account email as Editor.
5. In Vercel, add these Environment Variables:

```txt
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_SHEET_ID
GOOGLE_SHEET_TAB
```

Use `Orders` for `GOOGLE_SHEET_TAB` unless you want another tab name. The API creates the tab and header row if they do not exist.

## Order Sync

On Vercel, checkout posts to:

```txt
/api/orders
```

The API appends order details to Google Sheets. When an admin changes an order status, the same API updates the matching status cell by Order ID.
