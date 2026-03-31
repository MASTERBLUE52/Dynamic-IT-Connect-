# Dynamic IT Connect

A full-stack web platform for Dynamic IT Connect featuring service discovery, user authentication, online payments, contact management, and client order tracking.

## Features

- Service browsing and detailed service ordering flow
- User registration, login, OTP, and session handling
- Payment flow with demo mode and Razorpay integration
- Contact form with email notifications
- Client order history and invoice view
- MongoDB support with JSON fallback storage

## Tech Stack

- Node.js
- Vanilla HTML, CSS, and JavaScript
- MongoDB
- Nodemailer / Resend
- Razorpay

## Getting Started

Install dependencies:

```bash
npm install
```

Run the project:

```bash
npm start
```

For port `3001`:

```bash
npm run start:3001
```

Open `http://localhost:3000` or `http://localhost:3001` depending on the script used.

## Environment Setup

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Update the values in `.env` before running the project.

## Email Configuration

The project supports Resend and Gmail SMTP for email delivery.

Example Resend configuration:

```powershell
$env:RESEND_API_KEY="re_xxxxxxxxx"
$env:RESEND_FROM_EMAIL="Dynamic IT Connect <noreply@yourdomain.com>"
```

Example SMTP configuration:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM_EMAIL=Dynamic IT Connect <yourgmail@gmail.com>
```

Notes:

- `RESEND_FROM_EMAIL` must be a verified sender in your Resend account.
- Contact form replies use the sender email as `reply_to`.
- The UI shows email delivery errors when configuration is missing or invalid.

## Payments

To enable Razorpay payments, set the following in `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxx
```

Webhook URL:

`https://your-domain.com/api/payments/razorpay/webhook`

## Data Storage

To enable MongoDB, set:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/dynamicitservices?retryWrites=true&w=majority
MONGODB_DB_NAME=dynamicitservices
AUTO_START_LOCAL_MONGODB=true
```

When MongoDB is configured, the project stores records in:

- `payments`
- `service_orders`
- `users`
- `user_logins`

Client order history is available at `/my-orders.html`.

## API Endpoints

- `GET /api/health`
- `GET /api/services`
- `POST /api/contact`
- `GET /api/payments/config`
- `POST /api/payments/checkout`
- `POST /api/payments/razorpay/verify`
- `POST /api/payments/razorpay/webhook`
- `GET /api/client/orders`
- `GET /api/admin/contacts`

## Local MongoDB on Windows

If you use a local URI such as `mongodb://localhost:27017/dynamicitservices`, the server can auto-start `mongod` using [`data/mongodb/mongod-local.cfg`](/c:/dynamicitservices/data/mongodb/mongod-local.cfg) when MongoDB Community Server is installed in the default Windows path.

Set `AUTO_START_LOCAL_MONGODB=false` if you want to skip that behavior and use the JSON fallback store instead.
