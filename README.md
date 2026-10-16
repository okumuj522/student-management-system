# 🎓 EduPulse - Full-Stack Student Management System (SMS)

A complete, production-grade Student Management System built with a **Node.js/Express** backend, **SQLite** database, **JWT-based authentication with Role-Based Access Control (RBAC)**, and a modern, responsive **Frontend Single Page Application (SPA)**.

---

## 🚀 Quick Start

### 1. Start the Server
From the project folder, run:
```bash
npm start
```
*(or `node server.js`)*

### 2. Open in Your Browser
Navigate to:
```
http://localhost:5000
```

---

## 🔑 Pre-Seeded Demo Accounts

You can log in immediately using the **1-click quick-fill buttons** on the login page, or manually enter these credentials:

| Role | Username / Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sms.edu` | `Ocholla@` | Full system control: Students, Faculty, Courses, Attendance, Grades, Fees, Notices, Analytics |
| **Teacher** | `teacher@sms.edu` | `teacher123` | Class management: View students, Mark attendance roll calls, Enter & update grades |
| **Student** | `student@sms.edu` | `student123` | Student portal: View enrolled courses, Pay fees via M-Pesa to `+254 746 942 848`, Official receipt |

---

## ✨ Features & Modules

### 1. 🔐 Authentication & Authorization
- **JWT (JSON Web Token)** secure session handling.
- **Bcrypt password hashing** with salted rounds.
- **Role-Based Access Control (RBAC)** for `admin`, `teacher`, and `student`.
- User registration and account switching.

### 2. 📊 Interactive Analytics Dashboard
- Real-time KPI summary cards: Total Students, Total Faculty, Active Courses, School-wide Attendance %, Total Fees Collected.
- Interactive charts powered by **Chart.js**:
  - Student Distribution by Department (Bar Chart).
  - Overall Academic Grade Distribution (Doughnut Chart).
- Live feed of recent student admissions and campus announcements.

### 3. 🧑‍🎓 Student Directory & Profile Viewer
- Comprehensive student directory with search (by Name, ID Code, Email) and filtering (by Department, Status).
- Add and Edit Student Modal with automatic ID code generation (`STU-YYYY-XXX`).
- **Comprehensive Profile Modal**:
  - Contact information & Guardian/Emergency details.
  - Enrolled courses with real-time academic scores.
  - Attendance rates and session breakdowns.
  - Outstanding and paid fee ledger.

### 4. 👨‍🏫 Faculty & Teachers Management
- Faculty directory cards with designation, qualification, department, and contact info.
- Tracking of assigned courses and enrolled student counts.
- Add / Edit faculty members.

### 5. 📚 Courses & Class Rosters
- Course catalog with credits, description, department, and assigned instructor.
- Add and Edit Course modals.
- **Interactive Class Roster**: View all enrolled students in a course, enroll new students, or drop students.

### 6. 📅 Daily Class Attendance Register
- Class roll call sheet generation by Course and Date.
- One-click batch marking (`Present`, `Absent`, `Late`, `Excused`).
- "Mark All Present" shortcut.
- Notes and remarks per student session.

### 7. 🏆 Grades & Official Transcripts
- Grade entry modal for assignments (20%), midterm (30%), and final exams (50%).
- Automatic total score and letter grade (A, B, C, D, F) calculation.
- **Official Academic Transcript / Report Card**:
  - GPA calculation (4.00 scale) based on credit weights.
  - Clean, professional printable format (`window.print()` ready) with official seal and registrar signature block.

### 8. 💳 Fees, Invoices & M-Pesa Mobile Payments
- Student tuition and fee invoices (Tuition, Lab Fee, Library, Examination).
- Invoices filtered by status (`Paid`, `Partial`, `Unpaid`).
- **Student M-Pesa Payment SDK Integration**:
  - Designated collection phone number: **`+254 746 942 848`**.
  - **Instant STK Push**: Prompts student mobile phone for their M-Pesa PIN, automatically reconciles funds, and updates invoice to `Paid` or `Partial`.
  - **Manual M-Pesa SMS Code Verification**: Allows students who sent money directly to `+254 746 942 848` to submit their transaction reference code (e.g., `RK92XM48PQ`) for instant clearance.
- **Official Printable Payment Receipt**: Generates verified payment acknowledgment with receipt number, student details, amount, receiver phone `+254 746 942 848`, transaction code, and bursar signature block.

### 9. 📢 Campus Notice Board
- Campus-wide announcements categorized by General, Academic, Exam, Holiday, and Event.
- Admin and teachers can publish new circulars.

---

## 🛠️ Tech Stack Architecture

- **Backend**: Node.js, Express.js, CORS, Morgan, Dotenv
- **Security**: JWT (`jsonwebtoken`), `bcryptjs`
- **Database**: SQLite3 via `better-sqlite3` (WAL mode enabled, persistent at `database/sms.db`)
- **Frontend**: Responsive Single Page Application (HTML5, Vanilla ES6+ JavaScript, CSS3 Design Tokens, FontAwesome 6, Chart.js)

---

## 📁 Project Structure

```
student management system/
├── database/
│   └── sms.db                  # SQLite database file (created automatically)
├── public/                     # Frontend Single Page Application
│   ├── css/
│   │   └── styles.css          # Modern responsive styling & print layout
│   ├── js/
│   │   ├── api.js              # Fetch client, JWT token storage & toast engine
│   │   ├── auth.js             # Authentication, session & RBAC UI control
│   │   ├── dashboard.js        # KPI cards & Chart.js visualizations
│   │   ├── students.js         # Student directory, CRUD & profile viewer
│   │   ├── teachers.js         # Faculty directory & course assignments
│   │   ├── courses.js          # Course catalog & enrollment roster
│   │   ├── attendance.js       # Daily class roll call register
│   │   ├── grades.js           # Gradebook & printable GPA transcripts
│   │   ├── fees.js             # Invoices, billing & payment recording
│   │   ├── announcements.js    # Campus notice board
│   │   └── app.js              # Master router & page navigation
│   └── index.html              # Main HTML5 application shell
├── src/
│   ├── config/
│   │   └── db.js               # SQLite connection, schema & rich demo seed data
│   ├── controllers/            # Controller business logic
│   │   ├── announcement.controller.js
│   │   ├── attendance.controller.js
│   │   ├── auth.controller.js
│   │   ├── course.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── fee.controller.js
│   │   ├── grade.controller.js
│   │   ├── student.controller.js
│   │   └── teacher.controller.js
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication & role authorization
│   │   └── errorHandler.js     # Centralized error handler
│   └── routes/                 # RESTful API Route declarations
│       ├── announcement.routes.js
│       ├── attendance.routes.js
│       ├── auth.routes.js
│       ├── course.routes.js
│       ├── dashboard.routes.js
│       ├── fee.routes.js
│       ├── grade.routes.js
│       ├── student.routes.js
│       └── teacher.routes.js
├── .env                        # Environment variables (PORT, JWT_SECRET)
├── package.json
└── server.js                   # Application entry point
```
