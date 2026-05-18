# Unity Cricket Academy Management System

## Professional Software Handover Document and User Manual

**Project Name:** `unity-cricket-academy-management`  
**Brand:** Unity Cricket Academy  
**Application Type:** Web-based academy management system  
**Frontend:** Angular 17  
**Backend / Database:** Supabase  
**Hosting:** Vercel  
**Main Users:** Admins and Coaches  
**Document Purpose:** This document explains the full system in simple English for academy staff, project owners, developers, and future maintainers.

---

## 1. Project Overview

Unity Cricket Academy Management System is a complete web application for managing the daily work of a cricket academy.

The system helps the academy manage:

| Area | What It Does |
|---|---|
| Students | Add, edit, deactivate, reactivate, filter, and view student/player records |
| Coaches | Manage coach profiles, roles, designations, salary details, and active status |
| Batches | Manage groups, timings, coach assignments, and batch strength |
| Attendance | Mark student and coach attendance with present/absent tracking |
| Fees | Track paid fees, pending fees, batch-wise fee reports, and PDF reports |
| Salaries | Generate salaries, calculate leave deductions, bonuses, and PDF salary slips |
| Matches | Plan matches, select players, assign roles, track match fees, and manage notes |
| Staff Tasks | Assign tasks to coaches, track progress, comments, and completion status |
| Reports | Download useful PDF reports for fees, salaries, and match planning |

The application is built so that Admin users can manage the full academy, while Coach users can access only the areas allowed for their role.

---

## 2. Purpose of the System

The main purpose of this application is to reduce manual work for the academy.

Before this system, academy work may be handled through registers, Excel sheets, WhatsApp messages, and separate notes. This application brings those workflows into one place.

The system helps with:

- Keeping student and coach records organized
- Tracking attendance properly
- Finding fee pending students quickly
- Generating coach salary details
- Managing matches and match fees
- Assigning daily work to coaches
- Giving Admin better visibility of academy operations
- Helping coaches manage their own batches without seeing unrelated data

---

## 3. Technology Stack

| Technology | Use in This Project | Simple Explanation |
|---|---|---|
| Angular 17 | Frontend application | The web application users see and interact with |
| Angular Standalone Components | App structure | Modern Angular structure without traditional NgModules |
| Angular Router | Page navigation | Opens pages like Dashboard, Students, Fees, Matches, etc. |
| Reactive Forms | Forms and validation | Used for login, student forms, fee forms, salary forms, and other inputs |
| Angular Signals | Local state handling | Used for clean and fast UI state updates |
| TypeScript | Main coding language | Safer JavaScript with better error checking |
| Tailwind CSS | Styling | Used for responsive design, cards, spacing, buttons, and layout |
| Supabase Auth | Login system | Handles user login, session, and user identity |
| Supabase PostgreSQL | Database | Stores students, coaches, fees, attendance, salaries, matches, and tasks |
| Supabase RLS | Security | Protects data based on Admin and Coach permissions |
| Supabase JavaScript SDK | Frontend database connection | Angular talks directly to Supabase using this SDK |
| Vercel | Hosting | Used to deploy the Angular application online |

### Important Architecture Note

This project does **not** use a separate backend server.

There is no:

- .NET backend
- Node backend
- Express backend
- Separate API project

The Angular app connects directly to Supabase using:

- Supabase Auth
- Supabase PostgreSQL
- Supabase RPC functions
- Supabase Row Level Security policies

Only the Supabase public anon/publishable key should be used in the frontend.

---

## 4. Project Structure

The main application code is inside `src/app`.

| Folder | Purpose |
|---|---|
| `auth` | Login screen and authentication UI |
| `components` | Shared reusable UI components |
| `core` | Core application logic if required |
| `guards` | Route protection for logged-in users and Admin-only pages |
| `layout` | Main app shell, sidebar, navbar, and logged-in layout |
| `models` | TypeScript interfaces and app data types |
| `pages` | Main application screens |
| `services` | Supabase connection and data operations |
| `shared` | Shared helpers/components |
| `src/assets` | Logo and static assets |
| `src/environments` | Supabase URL and key configuration |
| `supabase` | Database schema and migration SQL files |

Important files:

| File | Purpose |
|---|---|
| `src/app/app.routes.ts` | Application routes/pages |
| `src/app/services/data.service.ts` | Main data access service for Supabase |
| `src/app/services/supabase.service.ts` | Supabase client setup |
| `src/app/guards/auth.guard.ts` | Login and Admin route protection |
| `src/environments/environment.ts` | Development Supabase settings |
| `src/environments/environment.prod.ts` | Production Supabase settings |
| `supabase/schema.sql` | Full database schema |
| `supabase/migrations/20260512_fix_academy_modules.sql` | Migration updates for existing projects |
| `vercel.json` | Vercel routing support |

---

## 5. User Roles and Permissions

### Admin Role

Admin has full access to the academy system.

Admin can:

| Module | Admin Permission |
|---|---|
| Dashboard | View all academy statistics |
| Students | Add, edit, delete, deactivate, reactivate, and view all students |
| Coaches | Add, edit, delete, deactivate, reactivate, and view all coaches |
| Batches | Create, edit, delete, and assign coaches |
| Attendance | Mark student and coach attendance |
| Fees | Add, edit, delete, and view all fee records |
| Fee Reports | Download combined and batch-wise PDF reports |
| Salaries | Generate salaries, delete generated salaries, and download salary slips |
| Matches | Create, edit, delete, manage players, manage coaches, and track match fees |
| Staff Tasks | Create, assign, edit, delete, comment, approve, and reopen tasks |

### Coach Role

Coach has limited access based on assigned batches/groups.

Coach can:

| Module | Coach Permission |
|---|---|
| Dashboard | View allowed overview data |
| Students | Add and manage students only for assigned batches |
| Attendance | Mark attendance only for assigned batch students |
| Fees | Add and view fees only for assigned batch students |
| Fee Reports | Download fee reports only for own batches |
| Matches | Create and manage matches, select players, and manage match fees |
| Match Player List | View all student names only inside the Match module |
| Staff Tasks | View assigned tasks, add comments, update status, and mark complete |

Coach cannot:

- Access full Admin controls
- Delete fee records unless Admin permission is granted
- View unrelated batch financial data outside the Match module
- Manage salaries
- Delete matches
- Create Admin-level staff tasks

---

## 6. Authentication and Security Flow

### Login Flow

1. User opens the application.
2. User enters email and password.
3. Angular sends login request to Supabase Auth.
4. Supabase verifies credentials.
5. Supabase returns a user session/JWT.
6. The app loads the user's profile from the `profiles` table.
7. The app checks the user role:
   - `Admin`
   - `Coach`
8. Navigation and data access are shown based on the role.

### Security Layers

| Layer | Purpose |
|---|---|
| Supabase Auth | Confirms user identity |
| `profiles.role` | Stores Admin/Coach role |
| Angular Guards | Protect frontend routes |
| Supabase RLS | Protects database rows |
| Supabase RPC Functions | Handles controlled special operations |

### Important Security Rule

The frontend must use only:

- `supabaseUrl`
- `supabaseKey` / anon publishable key

Never place the Supabase service role key inside Angular code.

---

## 7. Application Modules and Workflows

## 7.1 Login Screen

### User View

The login page shows:

- Unity Cricket Academy branding
- Email field
- Password field
- Sign in button
- Validation messages if input is missing or invalid

### Internal Flow

- Uses Supabase Auth password login.
- Keeps session active after refresh.
- Redirects logged-in users to the main dashboard.
- Blocks unauthenticated users from app pages.

---

## 7.2 Dashboard

### User View

Dashboard gives a quick academy overview.

It shows cards like:

- Total students
- Total coaches
- Active batches
- Monthly fees
- Active students

It also shows:

- Recent payments
- Batch strength
- Quick academy statistics

### Workflow

- Clicking Students card opens the Students page.
- Clicking Coaches card opens the Coaches page.
- Clicking Batches card opens the Batches page.
- Clicking Fees card opens the Fees page.

### Internal Flow

The dashboard loads live data from Supabase and calculates totals from students, coaches, batches, attendance, and fees.

---

## 7.3 Student Management

### User View

The Students page allows users to:

- View student list
- Search students
- Filter by batch
- Filter by age
- Filter by fee plan/package
- Add new student
- Edit student
- Open student details
- Deactivate student
- Reactivate deactivated student

### Student Form Fields

| Field | Purpose |
|---|---|
| Name | Student/player name |
| Date of Birth | Student DOB |
| Age | Auto-calculated from DOB |
| Admission Date | Joining date |
| Address | Student address |
| Phone Number | Parent/student contact |
| Fee Package | Selected fee package |
| Fee Plan Name | Display fee plan |
| Fee Plan Amount | Expected fee amount |
| School Name | School details |
| Age Group | Cricket age group |
| Batch | Assigned batch |
| Active Status | Whether student is active |

### Age Calculation

Age is calculated automatically from DOB.

Example:

| DOB | Current Date | Age |
|---|---|---|
| 2010-05-20 | 2026-05-16 | 15 |

The system checks month and day, so it does not incorrectly increase age before the birthday.

### Deactivated Students

When a student is deactivated:

- Student is not deleted from database.
- Student is hidden from active student lists.
- Student is hidden from attendance.
- Student is hidden from fee generation.
- Admin can reactivate the student later.

### Internal Flow

- Student data is stored in the `students` table.
- Coach can add students only to their assigned batches.
- Admin can manage all students.
- Duplicate checks prevent repeated names in the same batch and repeated phone numbers.

---

## 7.4 Student Details

### User View

Student detail page shows:

- Student profile information
- Batch details
- Attendance history
- Fee history
- Total paid
- Pending amount

### Internal Flow

The page loads student information from:

- `students`
- `batches`
- `student_attendance`
- `fees`

---

## 7.5 Coach Management

### User View

The Coaches page allows Admin to:

- View all coaches/staff
- Add coach
- Edit coach
- Assign designation
- Set salary per month
- Set Admin access if needed
- Deactivate/reactivate coach
- Delete coach when allowed

### Flexible Designation

Admin can enter custom designations such as:

- Head Coach
- Senior Coach
- Marker
- Assistant Level 4
- Assistant Level 5
- Any other custom staff title

### Internal Flow

- Coach login account is created through Supabase Auth.
- Profile is stored in `profiles`.
- Coach details are stored in `coaches`.
- A coach can be assigned to batches through the `batches.coach_id` field.

---

## 7.6 Coach Details

### User View

Coach detail page shows:

- Coach profile
- Assigned batches
- Assigned students
- Salary history
- Coach attendance history
- Present/Absent records
- Monthly attendance summary

### Internal Flow

Data comes from:

- `coaches`
- `profiles`
- `batches`
- `students`
- `coach_attendance`
- `salaries`

---

## 7.7 Batch Management

### User View

The Batches page allows users to:

- View batch cards
- See timing
- See assigned coach
- See student strength
- Open batch details

Admin can:

- Add batch
- Edit batch
- Delete batch

### Internal Flow

Batch records are stored in the `batches` table.

Each batch can have one assigned coach.

Students are linked to batches using `students.batch_id`.

---

## 7.8 Attendance Management

### User View

Attendance page allows:

- Select date
- Select batch
- Mark students as Present or Absent
- Save/update attendance
- View selected status clearly
- View summary of Present, Absent, and Total

Admin can also manage coach attendance.

### Coach Access

Coach can mark attendance only for assigned batch students.

### 3-Day Absence Alert

After saving attendance, the system checks if any student is absent for 3 consecutive days.

Example:

- 12 June 2026: Absent
- 13 June 2026: Absent
- 14 June 2026: Absent

If this happens, a popup shows:

- Student name
- Absent dates
- Message to call or contact parents
- Actions like Call Parent, Send Message, Remind Me Later, and Close

### Internal Flow

Attendance is stored in:

- `student_attendance`
- `coach_attendance`

Student attendance uses a unique key:

`student_id + batch_id + date`

This prevents duplicate attendance records for the same student on the same date.

---

## 7.9 Fee Management

### User View

The Fees page has clear sections:

- Paid Fees
- Pending Fees
- Payment records
- Monthly PDF reports

Fee records show:

| Column | Meaning |
|---|---|
| Student Name | Student who paid or has pending fee |
| Batch | Student batch |
| Fee Amount | Expected fee |
| Paid Amount | Paid amount |
| Pending Amount | Remaining amount |
| Payment Date | Paid date |
| Payment Status | Paid or Pending |

### Coach Access

Coach can:

- View paid fees for own batch students
- View pending fees for own batch students
- Add fee entries for own batch students
- Download reports for own batches

Coach cannot:

- See all academy financial data
- Delete fee records
- Manage other batch fees

### Admin Access

Admin can:

- View all fee records
- Filter fees batch-wise
- Add/edit/delete fee records
- Download combined all-batch reports
- Download selected batch reports

### Fee Report PDFs

Admin can download:

- Combined monthly fee report for all batches
- Batch-wise monthly fee report

Coach can download:

- Fee report only for assigned batches

PDF report includes:

- Batch-wise sections
- Paid students table
- Pending students table
- Summary totals
- Signature:
  - Rohit S. Khedekar
  - Head Coach

### Internal Flow

Fee data is stored in the `fees` table.

Pending fee calculation works by:

1. Load active students.
2. Load fee records for selected month/batch.
3. Compare student expected fee with paid amount.
4. Show students with pending amount in Pending Fees.
5. Show completed payments in Paid Fees.

---

## 7.10 Salary Management

### User View

Admin can generate coach salary with:

- Base salary
- Working days
- Leave taken
- Paid leaves
- Leave deduction
- Personal coaching count
- Personal coaching amount
- Bonus
- Penalty
- Advance taken
- Grand total salary
- Remarks or details when available

Admin can also:

- View salary history
- Delete generated salary records
- Download individual salary slip PDF
- Download monthly salary distribution PDF

### Salary Calculation Rules

Working days are calculated as:

`Total days in month - Sundays`

Paid leave rule:

- 2 paid leaves are allowed per month.
- Extra leaves are deducted.

Formula:

```text
Per Day Salary = Monthly Salary / Working Days
Extra Leaves = Leave Taken - Paid Leaves
Leave Deduction = Extra Leaves x Per Day Salary
Base Salary = Monthly Salary - Leave Deduction
Grand Total = Base Salary + Personal Coaching Amount + Bonus - Penalty - Advance Taken
```

Example:

| Item | Value |
|---|---|
| Monthly Salary | Rs. 30,000 |
| Working Days | 30 |
| Per Day Salary | Rs. 1,000 |
| Leaves Taken | 5 |
| Paid Leaves | 2 |
| Extra Leaves | 3 |
| Deduction | Rs. 3,000 |
| Final Salary | Rs. 27,000 |

### Internal Flow

Salary records are stored in `salaries`.

The salary function uses:

- Coach salary from `coaches`
- Coach attendance from `coach_attendance`
- Bonus/penalty/advance entered by Admin

---

## 7.11 Match Management

### User View

The Match Management section helps Admins and Coaches plan cricket matches.

Users can create matches with:

- Opponent team
- Venue
- Match date and time
- Match fees
- Age group/category
- Match status
- Notes and instructions
- Players
- Coaches

### Player Selection

Players can be selected batch-wise.

When creating a match:

1. Select a batch.
2. View students from that batch.
3. Add players to the match.
4. Assign player role.

Player roles include:

- Captain
- Wicket Keeper
- Batsman
- Bowler
- All-rounder

### Coach as Player

For Senior or Intrasquad matches, coaches can also be added as players.

### Match Fee Tracking

Each match has its own fee tracking.

The system tracks:

- Fees paid
- Fees pending
- Player-wise payment status
- Total collected
- Total pending

Match fee data is managed only for the selected match, not all matches together.

### Match Notes

Admins and coaches can add shared notes.

Notes are visible to everyone associated with the match.

### Permissions

| Action | Admin | Coach |
|---|---|---|
| Create match | Yes | Yes |
| Edit match | Yes | Yes |
| Delete match | Yes | No |
| Add players | Yes | Yes |
| Add coaches | Yes | Yes |
| Add notes | Yes | Yes |
| Track match fees | Yes | Yes |

### Important Security Note

In the Match module only, coaches can view all player names to build teams properly.

This does not change other sections. In Students, Fees, and Attendance, coaches still see only their assigned batch/group data.

### Internal Flow

Match data is stored in:

- `matches`
- `match_players`
- `match_coaches`
- `match_notes`

Special Supabase RPC functions are used for match-only visibility:

- `list_match_students`
- `list_match_batches`

---

## 7.12 Staff Task Management

### User View

Staff Task Management helps Admin assign daily work to coaches.

Admin can create tasks with:

- Task title
- Description
- Assigned coach/coaches
- Priority
- Deadline
- Category
- Notes/instructions

Task priorities:

- High
- Medium
- Low

Task categories:

- Training
- Match Management
- Fees Collection
- Attendance
- Equipment
- Social Media
- Other

Task statuses:

- Pending
- In Progress
- Completed
- Overdue

### Admin Workflow

1. Admin opens Tasks.
2. Admin creates a task.
3. Admin assigns one or more coaches.
4. Coach sees assigned task.
5. Coach updates progress and comments.
6. Coach marks completed.
7. Admin approves or reopens the task.

### Coach Workflow

Coach can:

- View assigned tasks
- Add progress comments
- Change status
- Mark task completed
- View pending and completed tasks

Coach cannot:

- Create Admin tasks
- Delete tasks
- Edit Admin-created task details

### Task Reminder

When a coach logs in, the system can show a simple popup/reminder for pending assigned tasks.

No email, SMS, or push notification system is included.

### Internal Flow

Task data is stored in:

- `staff_tasks`
- `staff_task_assignments`
- `staff_task_comments`
- `staff_task_logs`

Activity logs store important task actions like creation, assignment, status change, comment, completion, approval, and reopening.

---

## 8. Step-by-Step Application Workflow

### Admin Daily Workflow

1. Login as Admin.
2. Check Dashboard statistics.
3. Add or update students if required.
4. Add or update coaches and batches.
5. Mark coach attendance if needed.
6. Review student attendance.
7. Check paid and pending fees.
8. Download fee reports.
9. Generate salaries at month end.
10. Create matches and select players.
11. Assign daily tasks to coaches.
12. Review completed tasks and reports.

### Coach Daily Workflow

1. Login as Coach.
2. Check assigned tasks popup.
3. Open Attendance.
4. Select assigned batch.
5. Mark student attendance.
6. Save attendance.
7. Follow up if 3-day absence alert appears.
8. Add new students for assigned batch if needed.
9. Add fees for assigned batch students.
10. Open Matches and manage match-related players/fees.
11. Update assigned tasks and add comments.

---

## 9. Database Structure

### Main Tables

| Table | Purpose |
|---|---|
| `profiles` | Stores user profile and role |
| `coaches` | Stores coach/staff information |
| `students` | Stores student/player information |
| `batches` | Stores training batch details |
| `student_attendance` | Stores student attendance |
| `coach_attendance` | Stores coach attendance |
| `fees` | Stores student fee payments |
| `salaries` | Stores generated salary records |
| `matches` | Stores match information |
| `match_players` | Stores selected players for a match |
| `match_coaches` | Stores coaches assigned to a match |
| `match_notes` | Stores shared match notes |
| `staff_tasks` | Stores task details |
| `staff_task_assignments` | Stores assigned coaches for tasks |
| `staff_task_comments` | Stores task discussion comments |
| `staff_task_logs` | Stores task activity logs |

### Table Relationships

| Relationship | Meaning |
|---|---|
| `profiles.id -> auth.users.id` | Each app user is linked to Supabase Auth |
| `coaches.user_id -> profiles.id` | Coach login profile is linked to coach record |
| `batches.coach_id -> coaches.id` | Batch is assigned to a coach |
| `students.batch_id -> batches.id` | Student belongs to a batch |
| `student_attendance.student_id -> students.id` | Attendance belongs to a student |
| `student_attendance.batch_id -> batches.id` | Attendance belongs to a batch |
| `coach_attendance.coach_id -> coaches.id` | Attendance belongs to a coach |
| `fees.student_id -> students.id` | Fee belongs to a student |
| `salaries.coach_id -> coaches.id` | Salary belongs to a coach |
| `match_players.match_id -> matches.id` | Player belongs to a match |
| `match_players.student_id -> students.id` | Match player can be a student |
| `match_players.coach_id -> coaches.id` | Match player can be a coach for Senior/Intrasquad |
| `match_coaches.match_id -> matches.id` | Coach is assigned to a match |
| `match_notes.match_id -> matches.id` | Note belongs to a match |
| `staff_task_assignments.task_id -> staff_tasks.id` | Assignment belongs to a task |
| `staff_task_comments.task_id -> staff_tasks.id` | Comment belongs to a task |
| `staff_task_logs.task_id -> staff_tasks.id` | Log belongs to a task |

---

## 10. API Overview

This project does not have a separate REST API server.

The frontend uses Supabase JavaScript SDK directly.

In this project, "API call" means:

- Supabase Auth call
- Supabase table query
- Supabase insert/update/delete
- Supabase RPC function call

### 10.1 Login Example

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'coach@example.com',
  password: 'password'
});
```

Example response:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "coach@example.com"
  },
  "session": {
    "access_token": "jwt-token"
  }
}
```

### 10.2 Load Active Students

```ts
const { data, error } = await supabase
  .from('students')
  .select('*, batch:batches(*)')
  .eq('is_active', true)
  .order('name');
```

Example response:

```json
[
  {
    "id": "student-uuid",
    "name": "Aarav Sharma",
    "age": 14,
    "batch_id": "batch-uuid",
    "is_active": true
  }
]
```

### 10.3 Add Student for Assigned Batch

```ts
const { data, error } = await supabase.rpc('create_assigned_batch_student', {
  p_name: 'Aarav Sharma',
  p_age: 14,
  p_dob: '2012-04-10',
  p_date_of_birth: '2012-04-10',
  p_admission_date: '2026-05-01',
  p_address: 'Nagpur',
  p_phone_number: '9876543210',
  p_fee_package: 'Monthly1800',
  p_fee_plan_name: 'Monthly',
  p_fee_plan_amount: 1800,
  p_school_name: 'ABC School',
  p_age_group: 'U-14',
  p_batch_id: 'batch-uuid',
  p_is_active: true
});
```

### 10.4 Save Attendance with Upsert

```ts
const { data, error } = await supabase
  .from('student_attendance')
  .upsert(records, {
    onConflict: 'student_id,batch_id,date'
  });
```

This updates existing attendance if it already exists for the same student, batch, and date.

### 10.5 Add Fee Record

```ts
const { data, error } = await supabase
  .from('fees')
  .insert({
    student_id: 'student-uuid',
    amount: 1800,
    fee_package: 'Monthly1800',
    fee_plan_name: 'Monthly',
    fee_plan_amount: 1800,
    month: '2026-05',
    paid_date: '2026-05-18'
  })
  .select()
  .single();
```

### 10.6 Generate Salary

```ts
const { data, error } = await supabase.rpc('generate_salary', {
  p_coach_id: 'coach-uuid',
  p_month: '2026-05',
  p_personal_coaching_count: 2,
  p_personal_coaching_amount: 2000,
  p_bonus: 1000,
  p_penalty_amount: 0,
  p_advance_taken: 0,
  p_paid_leave: 2
});
```

### 10.7 Load Match Students

```ts
const { data, error } = await supabase.rpc('list_match_students');
```

This RPC is used only for the Match module so coaches can see all player names while creating teams.

### 10.8 Add Task Comment

```ts
const { data, error } = await supabase
  .from('staff_task_comments')
  .insert({
    task_id: 'task-uuid',
    comment: 'Attendance report updated for U-14 batch.'
  });
```

---

## 11. Row Level Security Overview

Supabase RLS protects data directly inside the database.

Common rules:

| Data | Admin Access | Coach Access |
|---|---|---|
| Students | All students | Assigned batch students only |
| Fees | All fees | Assigned batch students only |
| Attendance | All attendance | Assigned batch students only |
| Coaches | All coaches | Limited/self data where allowed |
| Salaries | Admin only | No access |
| Matches | Allowed to create/manage | Allowed to create/manage with limited delete |
| Tasks | All tasks | Assigned tasks only |

Special functions help with secure checks:

- `is_admin()`
- `is_assigned_coach_for_batch(batch_id)`
- `create_assigned_batch_student(...)`
- `generate_salary(...)`
- `list_match_students()`
- `list_match_batches()`

---

## 12. Deployment and Hosting

### Local Setup

1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in Supabase SQL Editor.
3. If this is an existing project, also run migration SQL from `supabase/migrations`.
4. Update environment files:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY'
};
```

For production:

```ts
export const environment = {
  production: true,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY'
};
```

5. Install packages:

```bash
npm install
```

6. Run locally:

```bash
npm start
```

7. Build production:

```bash
npm run build
```

### Vercel Settings

Use these settings in Vercel:

| Setting | Value |
|---|---|
| Framework Preset | Angular |
| Build Command | `npm run build` |
| Output Directory | `dist/unity-cricket-academy-management` |
| Install Command | `npm install` |

The project includes `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This makes page refresh work on routes like:

- `/dashboard`
- `/students`
- `/fees`
- `/matches`
- `/tasks`
- `/salaries`

### Supabase Auth URL Settings

In Supabase Dashboard, add these URLs:

| Setting | Example |
|---|---|
| Site URL | `https://your-vercel-domain.vercel.app` |
| Redirect URL | `https://your-vercel-domain.vercel.app/*` |
| Local Development URL | `http://localhost:4200/*` |

---

## 13. Screen-by-Screen User Guide

### Login

1. Open app URL.
2. Enter email.
3. Enter password.
4. Click Sign in.
5. Dashboard opens after successful login.

### Dashboard

1. Review summary cards.
2. Click Students, Coaches, Batches, or Fees card to open that page.
3. Check recent fee payments and batch strength.

### Students

1. Open Students from sidebar.
2. Use search or filters.
3. Click Add Student to create a student.
4. Select DOB and age will appear automatically.
5. Save student.
6. Click a student to open details.
7. Admin can deactivate/reactivate or delete if needed.

### Coaches

1. Open Coaches from sidebar.
2. Add or edit coach details.
3. Enter designation.
4. Assign salary.
5. Save.
6. Open coach profile to view assigned batches, salary history, and attendance history.

### Batches

1. Open Batches.
2. Add batch name and timing.
3. Assign coach.
4. Save.
5. Admin can delete a batch if required.

### Attendance

1. Open Attendance.
2. Select date.
3. Select batch.
4. Mark Present or Absent.
5. Click Save Attendance.
6. If any student is absent for 3 days continuously, follow-up alert appears.

### Fees

1. Open Fees.
2. Select batch.
3. Select student.
4. Add fee amount and month.
5. Save fee.
6. Use Paid Fees and Pending Fees sections.
7. Download monthly PDF report when needed.

### Salaries

1. Open Salaries.
2. Select coach.
3. Select month.
4. Enter bonus, penalty, advance, and coaching amount if needed.
5. Review auto-calculated salary.
6. Generate salary.
7. Download salary slip or monthly salary report.

### Matches

1. Open Matches.
2. Create match.
3. Enter opponent, venue, date, fee, category, and notes.
4. Select batch to load players.
5. Add players and assign roles.
6. Add coaches.
7. Track match fee status player-wise.
8. Download match report if needed.

### Staff Tasks

1. Admin opens Tasks.
2. Create task and assign coach.
3. Coach opens Tasks and checks assigned work.
4. Coach adds comments or progress updates.
5. Coach marks task completed.
6. Admin approves or reopens the task.

---

## 14. Common Issues and Troubleshooting

| Issue | Reason | Fix |
|---|---|---|
| Login says email not confirmed | Supabase email confirmation is enabled | Confirm user email in Supabase or disable confirmation for internal academy use |
| Database error querying schema | Schema cache or missing table | Run required SQL and execute `notify pgrst, 'reload schema';` |
| Table not found | Migration not run | Run `supabase/schema.sql` or migration SQL |
| RLS policy error | User role or batch assignment is missing | Check `profiles.role`, `coaches.user_id`, and `batches.coach_id` |
| Coach cannot add student | Coach is not assigned to selected batch | Assign coach to the batch |
| Coach sees limited data | This is expected outside Match module | Coaches are restricted by RLS |
| Match module does not show all players | RPC functions missing | Run migration that creates `list_match_students` and `list_match_batches` |
| Logo not visible | Asset missing or path wrong | Confirm `src/assets/logo.png` exists |
| Vercel shows old version | Latest code not pushed or deployment not updated | Push to correct GitHub repo and redeploy |
| Page refresh gives 404 on Vercel | Rewrite missing | Check `vercel.json` |
| NPM Invalid Version error | Corrupted package lock/cache or invalid package metadata | Delete `node_modules` and lock file, then run `npm install` again |
| Build warning about `??` | TypeScript warning, not fatal | Build still succeeds; can be cleaned later |

---

## 15. Future Enhancement Suggestions

Possible future improvements:

| Enhancement | Benefit |
|---|---|
| WhatsApp integration | Send absence or fee reminders to parents |
| Online payment gateway | Collect fees online |
| Parent login portal | Parents can view attendance and payments |
| PWA/mobile app | Better mobile experience |
| Advanced analytics | More detailed fee, attendance, and performance reports |
| External file storage | Store documents/images safely outside database |
| Automated backups | Improve data safety |
| Export to Excel | Easier offline reporting |
| Player performance tracking | Track batting, bowling, fitness, and match stats |
| Notification center | In-app reminders for tasks and follow-ups |

---

## 16. Final Project Summary

Unity Cricket Academy Management System is a complete Angular 17 and Supabase-based academy management application.

It covers the main operational needs of a cricket academy:

- Students
- Coaches
- Batches
- Attendance
- Fees
- Salaries
- Matches
- Staff tasks
- PDF reports
- Role-based access
- Secure Supabase database policies

The system is designed to be simple for academy staff and maintainable for developers.

Admins can control the complete academy, while coaches can safely manage their own assigned work without seeing unrelated private data.

The application is ready for local use and Vercel deployment after configuring Supabase URL and key in the Angular environment files.

---

## 17. Quick Handover Checklist

Before handing over the project, confirm:

| Item | Status |
|---|---|
| Supabase project created | To be checked |
| SQL schema executed | To be checked |
| Migration SQL executed | To be checked |
| Admin user created and linked to profile | To be checked |
| `environment.ts` updated | To be checked |
| `environment.prod.ts` updated | To be checked |
| `npm install` completed | To be checked |
| `npm run build` completed | To be checked |
| Vercel project connected to GitHub | To be checked |
| Supabase Auth redirect URLs added | To be checked |
| Final deployed app tested | To be checked |

