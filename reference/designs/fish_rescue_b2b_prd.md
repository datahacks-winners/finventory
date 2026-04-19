# Fish Rescue Marketplace (B2B) - Product Requirements Document

## Core Concept
"Too Good To Go for fresh fish" — A B2B mobile-first marketplace where seafood sellers list surplus inventory at 50-70% off for restaurants, caterers, and meal prep kitchens.

## Target Users
*   **Sellers:** Fish markets, wholesalers, fishing co-ops, restaurants with surplus.
*   **Buyers:** Restaurants (casual, sushi, ethnic), catering companies, food trucks, meal prep kitchens.

## Key Features & Business Logic
### 1. Grading & Freshness System
*   **Sushi Grade:** Requires flash-frozen (-20°C 7+ days) or lab-tested certification. Auto-downgrades to Grade A after 48 hours.
*   **Grade A:** Restaurant raw-bar quality, day-caught.
*   **Grade B:** Slight imperfections, cooking grade.
*   **Grade C:** Freeze recommended, used for processors/soups.
*   **Freshness Fields:** Catch date, Landing date, Storage method (Ice/Refrigerated/Frozen/Live), Storage Temp.

### 2. Logistics & Delivery
*   **Shipping Option:** Integration with Uber Direct/DoorDash Drive for local refrigerated transport.
*   **Pickup:** QR code-based check-in at the seller's facility.

### 3. Standing Orders
*   **Recurring Criteria:** Buyers set requirements (e.g., "5kg white fish, Grade B, daily").
*   **Matching Engine:** Auto-matches new listings to standing orders every morning with push notifications.

### 4. Revenue Model
*   15% transaction commission (Performance-based).

## Core User Flows
### Seller Flow
1. Create Listing -> Upload Photo -> Species Detection -> Input Catch/Landing Dates -> Select Grade (A/B/C/Sushi) -> Set Price/Quantity -> Publish.
2. Manage Handoff -> Scan Buyer QR Code -> Confirm Quantity -> Payout Released.

### Buyer Flow
1. Browse/Search -> Filter by Species/Grade/Distance -> View Listing Details (with freshness scores) -> Place Order (Pickup or Delivery).
2. Set Standing Order -> Receive Match Notification -> Confirm and Pay.

## Technical Architecture
*   **Frontend:** React Native (Mobile-first).
*   **Backend:** Node.js, PostgreSQL (PostGIS for geo-matching), Redis (for matching engine).
*   **Integrations:** Stripe Connect (Payments), Mapbox (Mapping), Uber Direct (Logistics).