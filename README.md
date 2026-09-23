# Pharmacy Guard: Role-Based POS & Inventory Audit System

A full-stack pharmaceutical inventory and POS system built with **Node.js, Express, MySQL, and vanilla JavaScript**.

The system implements role-based access control, JWT authentication, POS stock management, and an audit system for identifying inventory discrepancies.

---

## Architecture

```text id="1x9qks"
[ Browser / Vanilla JS ]
          │
          ▼
[ Express API ]
    │     │     │
    ▼     ▼     ▼
 Login   POS   Audit
    │     │     │
    └─────┼─────┘
          ▼
     [ MySQL ]
    ┌─────┼─────┐
    ▼     ▼     ▼
  users product sales
```

---

## Features

* Role-based access control (`admin` / `staff`)
* Password hashing with `bcrypt`
* JWT authentication
* Stock sufficiency checks
* POS sales recording
* Automatic stock deduction
* Physical inventory auditing
* Stock leakage/shrinkage detection
* Low-stock alerts
* Dynamic inventory dashboard

### Inventory Audit

The audit system compares the expected inventory with the physical count:

$$
Leakage = Expected\ Stock - Physical\ Count
$$

---

## Database

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') DEFAULT 'staff'
);

CREATE TABLE product (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    current_stock_level INT NOT NULL
);

CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_sold INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sold_by_user_id INT NOT NULL,
    sale_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id),
    FOREIGN KEY (sold_by_user_id) REFERENCES users(id)
);
```

---

## API

### API Endpoints

* `POST /api/register` — Create a new user account
* `POST /api/login` — Authenticate a user and issue a JWT
* `GET /api/products` — View available inventory
* `POST /api/sell` — Record a sale and reduce stock
* `POST /api/audit` — Admin-only stock audit comparing physical and recorded quantities

## Why I Built This

I wanted to build something I could actually sell.

I had heard that pharmacies were losing money through missing and expired inventory, so I looked into the problem and decided to build a system around it.

The original plan was to turn it into a business.

Then I made money from a trade, the financial pressure behind the project disappeared, and I eventually stopped working on it.

The project ended, but the things I learned from building it didn't.

---

## What Surprised Me

How much I had to think **for other people**.

I wasn't just building something that worked for me. I had to think about the admin, the employees, what they might accidentally do, and what should happen when they do it.

That changed how I thought about software.

---

## The Hardest Part

The hardest part was anticipating how the system could break.

Selling more stock than exists was easy to prevent.

Figuring out all the other ways a real person could interact with the system incorrectly was much harder.

I also had to think about the employee experience. If the system wasn't simple enough for someone to use during their normal work, it wouldn't matter how good the backend was.

---

## What I Learned

This was where authentication stopped being just a word to me.

I worked with password hashing, JWTs, authorization, database constraints, and backend validation and started understanding how those pieces actually fit together.

The biggest lesson was simple:

> The frontend can hide a button. The backend has to enforce the rule.

---

## Setup

### Environment

Create a `.env` file:

```env
PORT=5000
SECRET_KEY=your_jwt_secret_key_here
```

### Install

```bash
npm install express mysql2 cors bcrypt jsonwebtoken
```

### Run

```bash
node pharmacy_server.js
```

The server runs at:

```text
http://localhost:5000
```

---

## Project Status

**Archived / Incomplete**

Development was paused after the original commercial motivation disappeared.

The authentication system, POS flow, and audit engine were implemented, while some frontend polish and additional features were left unfinished.

The project remains public as a record of what I built and learned.
