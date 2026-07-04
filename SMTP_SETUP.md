# SMTP Setup

The contact and careers forms submit to `/api/send-email`. Email is sent by `server.js` using SMTP settings from `.env`.

## 1. Install dependencies

```bash
npm install
```

## 2. Create `.env`

Copy `.env.example` to `.env`, then fill your real SMTP details:

```env
PORT=3000
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465 
SMTP_SECURE=true
SMTP_USER=yashwanth@baselayersstudio.in
SMTP_PASS=rinx-mc9k-2cg9-m6sj
MAIL_FROM="BaseLayers Studio <hello@baselayersstudio.in>"
BUSINESS_TO=yashwanth@baselayersstudio.in
HR_TO=hr@baselayerssstudio.in
```

Use `SMTP_SECURE=true` only when your provider uses port `465`. For port `587`, keep it `false`.

## 3. Run the website

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Notes

- Do not put SMTP passwords in `script.js` or any HTML file.
- `.env` is ignored by Git so credentials stay private.
- Project inquiry forms send to `BUSINESS_TO`.
- Career forms send to `HR_TO`.
