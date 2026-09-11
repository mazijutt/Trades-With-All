# Fixed Deposit / Savings Plans

Added a backend-controlled savings-plan module.

## User side
- `/dashboard/fixed-deposits` page
- Fixed Deposits item in the logged-in sidebar
- Active FD plans also appear on the logged-in Dashboard
- Active FD plans also appear on the public Home page

## Admin side
- `FD Plans` tab in Admin Panel
- Create, edit, hide/show and delete plans
- Controls: name, short name, interest rate, tenure, minimum/maximum amount, payout, description and sort order

## Backend
- MongoDB model: `server/models/FixedDeposit.js`
- API: `server/routes/fixedDeposits.js`
- Active plans: `GET /api/fixed-deposits/public`
- Admin list: `GET /api/fixed-deposits`
- Admin create: `POST /api/fixed-deposits`
- Admin update: `PUT /api/fixed-deposits/:id`
- Admin delete: `DELETE /api/fixed-deposits/:id`

The server creates the five requested plans automatically if they do not already exist. Existing plans are not overwritten, so admin changes remain intact.

The initial rates/limits are example configurable values. They are not presented as a guarantee or official government rate; update them from Admin Panel before using the app publicly.
