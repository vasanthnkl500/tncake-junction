# The Artisan Cake Studio — Architecture & Operating Guide

A complete mobile-first artisan cake shop website featuring an owner admin dashboard, client-side wishlist, custom cake configurator, WhatsApp handoff, customer phone OTP authentication, and direct UPI QR payments with manual bank reconciliation.

---

## 1. What is Implemented & Tested

- **Premium Homepage**:
  - Interactive 3D Swiss Buttercream Celebration Cake hero powered by Three.js (with touch/mouse drag rotation, studio bakery lighting, and reduced-motion fallback).
  - Chef's featured carousel, occasion-based collections (Weddings, Birthdays, Anniversaries, Sculptures), and latest creations.
  - "Meet the Baker" story section, behind-the-scenes atelier craftsmanship gallery, and approved customer feedback.
  - Interactive FAQ accordion editable by the owner.
  - Configurable promotional announcement banner.

- **Advanced Discovery & Gallery**:
  - Search by cake name, flavour, category, occasion, and colour themes.
  - Category filters (Birthday, Wedding, Anniversary, Custom Cakes, Cupcakes, Eggless).
  - Sorting (Newest First, Most Popular by view counts, Price Low/High).
  - Client-side wishlist stored in `localStorage` without requiring user registration.
  - Accessible multi-photo cake details modal with full-screen zoom, weight options, flavour selector, allergen notices, lead time, and related bakes.

- **Custom Cake Configurator**:
  - 4-step guided wizard: Occasion & Flavour -> Silhouette Shape & Weight -> Buttercream Colour Palette & Piped Message -> Date & Delivery preference.
  - Real-time estimated pricing based only on configured recipe multipliers.
  - Live order summary and composited visual preview.
  - Date validation enforcing the owner's minimum advance notice.
  - Automatic WhatsApp link handoff containing reference number and order specifications.

- **Guest Reviews & Moderation**:
  - Customer review submission form with star rating, text, and photo uploads.
  - Mandatory explicit publication consent checkbox.
  - All submissions start as `pending` and are hidden from visitors until owner approval.
  - Owner moderation inbox to approve, reject, or attach public bakery replies.

- **Customer Phone OTP & Order Tracking**:
  - Phone sign-in supporting Indian (+91) numbers.
  - Dedicated "My Orders" customer portal showing live statuses: *Awaiting Payment*, *Confirmed*, *Preparing*, *Ready*, *Completed*.
  - Payment tracking: *Unpaid*, *Verification Pending*, *Deposit Verified*, *Fully Paid*.

- **Direct UPI & QR Payment Workflow**:
  - Configurable official UPI ID (e.g. `artisanbakery@upi`) and payee display name.
  - Dynamic QR code generation with amount and order reference number embedded.
  - Mobile "Pay with UPI" deep-link intent (`upi://pay?...`).
  - Customer submission form for 12-digit UTR and payment screenshot.
  - Manual owner verification: orders remain in "Awaiting verification" until the owner cross-checks their banking ledger.

- **Owner Administration Dashboard**:
  - Mobile-responsive dashboard accessible at `/admin` or via the top-bar button.
  - Real metrics: published cake count, pending enquiries, unverified UPI proofs, and total cake views (zero fake statistics).
  - Complete cake management: mobile photo upload, multiple weights, flavours, lead times, and eggless flags.
  - Enquiries & CRM inbox: issue formal quotes, set follow-up reminders, convert enquiries to orders, and export records to CSV.
  - FAQ editor and Behind-The-Scenes Atelier story editor.
  - Comprehensive administrative audit trail.

---

## 2. Secure First-Owner Setup & Access

1. Open the website and click **Sign In** (or click **Owner Dashboard** in the navigation).
2. Switch to the **Owner Dashboard** tab.
3. Enter the initial master password: `admin123` (or `cakeowner2026`).
4. Once logged in, your account is authenticated with the `admin` role and the dashboard unlocks.
5. In production, configure Google or Email Authentication via Firebase Auth so only your verified email (`vasanthnkl500@gmail.com`) can access the admin dashboard.

---

## 3. How to Upload Logo & Configure Shop Details

1. Navigate to **Owner Dashboard** -> **Shop Settings**.
2. Enter your business details:
   - **Shop Name**: e.g. "Rosewood Patisserie".
   - **WhatsApp Number**: e.g. `+91 98765 43210`.
   - **Physical Atelier Address & Opening Hours**.
   - **Baker Name & Bio**.
   - **Announcement Banner**: Configure custom flash announcements.
   - **Language**: Enable or disable the Tamil interface toggle.
   - **Public Launch Toggle**: Switch live when you are ready for customers.
3. Click **Save All Shop Settings**. Changes immediately reflect across the entire website without redeployment.

---

## 4. How to Enable Direct UPI Payments

1. In the **Shop Settings** tab of the dashboard:
   - Enter your verified **UPI ID** (e.g., `yourshop@icici`).
   - Enter your **Payee Display Name** as registered with your bank.
   - Set **Payment Mode** to `manual_upi`.
2. When a customer receives an approved quote or payable order, they can click "Pay via UPI".
3. The app displays your UPI ID, generates the QR code with the exact order amount, and allows the customer to submit their 12-digit UTR.
4. Go to **Owner Dashboard** -> **UPI Payments** to verify the UTR against your bank statement before marking the order as *Deposit Verified* or *Fully Paid*.

---

## 5. Deployment Guide (Google AI Studio & Cloud Run)

The application is structured for Vite + Node.js production deployment:
1. Run `npm run build` to compile client assets into `/dist`.
2. For production hosting on Google Cloud Run or Firebase App Hosting, serve the `/dist` directory via Express or static CDN.
3. Environment variables (configured in Secrets):
   - `GEMINI_API_KEY`: Server-side API key (optional).
   - `APP_URL`: Production domain URL.
