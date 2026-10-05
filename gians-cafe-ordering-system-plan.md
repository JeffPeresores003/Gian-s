# System Improvement & Development Implementation Plan — Gian's Cafe Ordering System

## Overview
This plan extends the existing Gian's Cafe platform from a customer-facing **directory-only menu** into a full **online ordering system** with three user roles: **Customer**, **Cashier**, and **Rider**. Orders flow from placement → cashier approval → rider delivery, with status tracked at every stage.

---

## 1. Customer Side

### 1.1 Browse & Select Product/Menu
- Customer browses the product directory and selects items to order.

### 1.2 Place Order — Left Panel (Order/Product)
- Displays selected products/order summary.
- **Add-ons button** — for upselling additional/complementary products per item.
- **Auto-compute total cost** of the order (updates live as items/add-ons change).

### 1.3 Fill In Information — Right Panel (Customer Info)
- Fields: Full Name, Address, Contact Number.
- **Pin exact location** feature (map-based location pin for delivery accuracy).
- **Auto-generate Order Tracking Number (OTN)** upon submission.

### 1.4 Order Confirmation
- Displays the **unique OTN**.
- **Copy OTN** button.
- **Download as PNG** button — generates an image containing:
  - The OTN.
  - A **QR code** encoding the customer's information and ordered products.

### 1.5 Order Approval
- Placed orders are **not final** — they require **cashier approval** before being confirmed.

---

## 2. Cashier Side (Additional Features)

### 2.1 Online Orders (Two Sub-Tabs)

#### Sub-tab 1: Pending Orders
- Lists all pending orders with:
  - Complete customer information.
  - Ordered products.
- **Actions column:**
  | Action | Function |
  |---|---|
  | Confirm Order | Approves the order (moves it to Confirmed) |
  | Cancel Order | Cancels the order |
  | Add-ons | Cashier can add upsell/additional products to the order |
  | Receipt | View/print the overall order receipt |

#### Sub-tab 2: Online Order History
- Shows **confirmed orders only**.
- Same UI design and logic as the existing Order History feature.

---

## 3. Rider Side (New Role: `rider`)

### 3.1 List of Confirmed Orders (Table Format)
- Displays all confirmed orders assigned for delivery.
- **Actions column:**
  | Action | Function |
  |---|---|
  | Deliver Order | Marks the order status as **"To Deliver"** |
  | Cancel Order | Marks the order status as **"Cancelled Order"** |
  | Scan | Scans the customer's QR code upon drop-off |

### 3.2 QR Code Scan Logic
- Rider scans the customer's QR code at the point of delivery.
- **Before confirming delivery, the system must check whether the order has any add-ons** attached (added by customer or cashier) — this must be accounted for/verified as part of the delivered order.
- Outcomes:
  - If confirmed as successfully delivered → order status marked **"Delivered"**.
  - If cancelled on the spot by the rider → order status marked **"Cancelled Order"**.

---

## 4. System Notes

### 4.1 Order Status Lifecycle
1. **Placed Order** — customer has submitted the order.
2. **Pending Order** — awaiting cashier action.
3. **Confirmed Order** — approved by cashier, ready for rider assignment/delivery.
4. **Cancelled Order** — cancelled by cashier or rider.
5. **To Deliver** — rider has taken the order out for delivery.
6. **Delivered** — rider confirmed successful delivery via QR scan.

```
Placed Order → Pending Order → Confirmed Order → To Deliver → Delivered
                     │                                   │
                     └────────────► Cancelled Order ◄────┘
```

---

## 5. Roles Summary
| Role | Access |
|---|---|
| Customer | Browse menu, place orders, track order via OTN/QR |
| Cashier | Manage pending/online orders, confirm/cancel, add-ons, receipts, order history |
| Rider | View confirmed orders, mark deliveries, scan QR to complete/cancel on-site |
| Admin | (Existing) Inventory management, product availability control |

---

## 6. Notes for the Build
- All order status transitions should be enforced **server-side** (not just UI state) to prevent invalid status jumps (e.g., a rider cannot mark "Delivered" without a valid QR scan).
- QR code payload should be validated/decoded server-side when scanned — do not trust client-decoded data alone for status updates.
- Add-ons added at any stage (customer, cashier, or pending scan-time check) must be reflected in the final receipt and total cost.
- Continue to follow the existing backend security requirements from the base project (Stored Procedures only, hashed passwords, server-side admin/role checks on protected routes, generic error messages with server-side detailed logging, CORS allowlist, redirect URL allowlist).
