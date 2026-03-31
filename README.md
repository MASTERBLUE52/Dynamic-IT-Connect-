# Dynamic IT Services Website

Responsive full-stack website using plain Node.js and vanilla frontend assets.

## Run

```bash
npm start
```

Open: `http://localhost:3000`
Or use: `npm run start:3001`

## Email Delivery (Contact Form -> Your Inbox)

Contact messages are sent to: `khambhatiburhanuddin72@gmail.com`

This project uses Resend API. You can either set PowerShell vars each run:

```powershell
$env:RESEND_API_KEY="re_xxxxxxxxx"
$env:RESEND_FROM_EMAIL="Dynamic IT Services <noreply@yourdomain.com>"
```

Or create `.env` file from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Important:
- `RESEND_FROM_EMAIL` must be a sender verified in your Resend account.
- Sender email from form is added as `reply_to`, so you can reply directly.
- If email does not send, the contact form now shows the reason (`missing_email_config` or `email_api_error:...`).

## OTP For All Users Without Buying Domain (Use Gmail SMTP)

For internship/demo projects, use Gmail SMTP so OTP can be sent to any user email:

1. Turn on 2-step verification in your Gmail account.
2. Create an App Password in Google account security.
3. Set these in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM_EMAIL=Dynamic IT Services <yourgmail@gmail.com>
```

Then install dependency and restart:

```bash
npm install
npm run dev
```

When SMTP is set, app uses SMTP first. Resend is fallback.

## API Endpoints

- `GET /api/health`
- `GET /api/services`
- `POST /api/contact`
- `GET /api/payments/config`
- `POST /api/payments/checkout` (demo if Razorpay keys missing, real if keys configured)
- `POST /api/payments/razorpay/verify`
- `POST /api/payments/razorpay/webhook`
- `GET /api/client/orders` (logged-in client's order history)
- `GET /api/admin/contacts` (admin only, client contact messages)

Example contact payload:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Need a business website and maintenance."
}
```

## Real Payments (Razorpay)

Set in `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxx
```

Then restart server. Payment page automatically switches to Razorpay Checkout when keys are present.

Webhook URL to configure in Razorpay dashboard:

`https://your-domain.com/api/payments/razorpay/webhook`

## MongoDB Order Storage

Set in `.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/dynamicitservices?retryWrites=true&w=majority
MONGODB_DB_NAME=dynamicitservices
AUTO_START_LOCAL_MONGODB=true
```

Then install dependencies and restart:

```bash
npm install
npm run dev
```

When MongoDB is configured, orders/payments are stored in MongoDB collections:
- `payments`
- `service_orders`
- `users`
- `user_logins`

Client can view their own placed orders at:

`/my-orders.html`

New user registration also sends a welcome email to the registered address when SMTP or Resend is configured.

### Local MongoDB On Windows

If you use a local URI such as `mongodb://localhost:27017/dynamicitservices`, the server will try to auto-start `mongod` using [`data/mongodb/mongod-local.cfg`](/c:/dynamicitservices/data/mongodb/mongod-local.cfg) when MongoDB Community Server is installed in the default `C:\Program Files\MongoDB\Server\...` path.

Set `AUTO_START_LOCAL_MONGODB=false` if you want to skip that and use the JSON fallback store instead.
