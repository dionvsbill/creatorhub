# CreatorHub

CreatorHub is a production-oriented creator and advertising platform built for campaign management, creator partnerships, rewards, referrals, advertiser funding, and creator earnings.

## Product

CreatorHub provides dedicated experiences for:

- Creators — discover campaigns, apply for opportunities, manage creator work, track earnings, and access the Creator Program.
- Advertisers — create and fund campaigns, manage applications, monitor campaign activity, and connect Google Ads accounts.
- Administrators — manage users, campaigns, creators, transactions, platform activity, and operational settings.
- Platform operations — referrals, notifications, transactions, audit activity, account controls, and campaign lifecycle management.

## Core Capabilities

- Secure authentication with Supabase Auth
- Role-based user and administrator access
- Creator and advertiser account management
- Campaign creation, review, approval, pausing, resuming, and rejection
- Campaign applications and creator participation
- Advertiser campaign funding through Paystack
- GHS wallet and withdrawal workflows
- Referral tracking and rewards
- Creator Program management
- Transaction and earnings history
- Notifications and account activity
- Administrative user suspension and role management
- Administrative finance and transaction resolution
- Audit logging for sensitive administrative actions
- Google Ads OAuth account connection
- Google Ads account discovery and campaign performance reporting
- Responsive web application for desktop and mobile

## Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- PostgreSQL
- Paystack
- Google Ads API
- Lucide icons

## Security

Sensitive credentials and privileged operations are kept server-side. Supabase Row Level Security protects user-owned and administrator-controlled data, while service-role access is restricted to server-side operations.

Google Ads refresh tokens are encrypted before storage. Administrative actions are protected by server-side role checks and recorded through audit activity.

## Environment

The application uses environment variables for Supabase, Paystack, Google Ads, site configuration, and application encryption.

Required configuration includes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `PAYSTACK_SECRET_KEY`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `APP_ENCRYPTION_KEY`

## Development

Install dependencies and start the Next.js development server:

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
npm start
```

## Deployment

CreatorHub is designed to run as a Node.js web application on platforms such as Render.

The production environment must provide the required environment variables and a configured Supabase project. Google Ads and Paystack integrations require their respective credentials and approved account configuration.

## Data and Payments

CreatorHub uses Supabase PostgreSQL as its application data layer. Payment transactions are initialized and verified server-side through Paystack before application-side fulfillment.

CreatorHub separates platform rewards and creator earnings from payment processing and maintains transaction records for financial operations.

## Project Structure

```
app/            Application routes and pages
app/api/        Server-side API routes
components/     Shared UI components
lib/            Server/client utilities and integrations
public/         Static assets
middleware.ts   Authentication and route protection
```

## Status

CreatorHub is an actively developed platform. Production credentials, payment configuration, Google Ads access, database policies, and deployment configuration must be supplied by the deployment environment.
