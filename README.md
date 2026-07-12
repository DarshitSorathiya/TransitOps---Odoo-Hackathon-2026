# 🚛 TransitOps – Smart Transport Operations Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1-blue?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.8.0-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-blue)

**A modern fleet and transport operations platform built for the Odoo Hackathon.**

</div>

---

## 📖 Overview

TransitOps is a transport operations management platform for fleet, driver, trip, maintenance, fuel, and expense workflows.

This application supports:

- Fleet vehicle registration, status tracking, and availability
- Driver profile management, license validation, and assignment
- Trip planning, dispatch, and lifecycle tracking
- Maintenance requests, service history, and cost tracking
- Fuel log entries with cost reporting
- Expense management, approvals, and reporting
- In-app notifications and audit logging
- Role-based access control with secure authentication

The platform is built with the Next.js App Router, Prisma, PostgreSQL, and modern UX patterns for enterprise readiness.

---

## ✨ Features

### 🔐 Authentication & Authorization

- NextAuth authentication with Prisma adapter
- Email/password login and session management
- Route protection via middleware
- Role-based permissions and access control

### 🚚 Fleet & Vehicle Management

- Vehicle registration with VIN and license plate tracking
- Fuel type, payload capacity, and insurance expiry tracking
- Vehicle status states: available, on trip, in shop, retired
- Vehicle search, filters, and trip assignment

### 👨‍✈️ Driver Management

- Driver profiles and optional user-linked driver accounts
- License class, expiry, and safety score tracking
- Driver status management and assignment workflows

### 🛣️ Trip Management

- Trip lifecycle and dispatch workflows
- Vehicle, driver, and dispatcher assignment
- Planned and actual departure/arrival tracking
- Odometer, cargo weight, route data, and notes

### 🔧 Maintenance Management

- Maintenance requests with priority and type
- Status tracking from pending through completed
- Technician assignment and estimated vs actual cost
- Vehicle maintenance history and driver reports

### ⛽ Fuel & Expense Tracking

- Fuel logs with odometer and cost details
- Expense tracking by vehicle, driver, trip, and category
- Approval workflows and financial reporting

### 📊 Analytics & Reporting

- Dashboard analytics for fleet utilization and costs
- Generated report records for fleet, trips, fuel, expense, and maintenance
- CSV/PDF report support via stored report entries

---

## 🧱 Tech Stack

### Frontend

- Next.js 15.5 with App Router
- React 19.1
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui primitives
- Framer Motion
- TanStack Table
- React Hook Form
- React Query
- Zod
- Recharts
- Zustand

### Backend

- Next.js Route Handlers
- NextAuth
- Prisma ORM
- PostgreSQL (Neon)
- bcryptjs

### Utilities

- ESLint
- Prettier
- Husky
- tsx for scripts

---

## 📁 Project Structure

```text
app/
components/
features/
actions/
hooks/
lib/
prisma/
public/
types/
utils/
```

---

## 🚀 Getting Started

### Clone repository

```bash
git clone <repository-url>
cd TransitOps---Odoo-Hackathon-2026
```

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file with:

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
NEXTAUTH_URL=
```

### Prisma setup

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

### Start development server

```bash
npm run dev
```

---

## 🔧 Available Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production server
- `npm run lint` — run ESLint
- `npm run prepare` — initialize Husky hooks

---

## 📊 Database Model Highlights

The Prisma schema includes models for:

- `User`, `Driver`, `Vehicle`, `Trip`
- `Maintenance`, `FuelLog`, `Expense`
- `Notification`, `Report`, `Role`, `UserRole`
- NextAuth models: `Account`, `Session`, `VerificationToken`

The data model supports soft deletes, status enums, and optimized indexes for fleet operations.

---

## 👥 Team

| Member | Role | Responsibilities |
|---------|------|------------------|
| **Shreyan Varsani** | Frontend Developer | UI/UX, Dashboard, Responsive Design, Components |
| **Darshit Sorathiya** | Repository Manager & Backend Developer | Repository Management, Backend Architecture, Database Design, APIs, Authentication |
| **Mahi Pandey** | Backend Developer | Backend APIs, Business Logic, Validation, Database Integration |

---

## 🎯 Future Improvements

- AI-powered fleet assistant
- Email/SMS notifications
- Predictive maintenance insights
- Mobile companion app
- GPS/telematics integration
- Real-time fleet tracking
- PDF reporting
- Multi-language support

---

## 📄 License

This project is licensed under the MIT License.

---