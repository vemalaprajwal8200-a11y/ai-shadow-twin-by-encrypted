# Role-Based Access Control (RBAC) Manual Test Checklist

This document provides a step-by-step verification checklist for confirming that role-based access control works reliably across the frontend, FastAPI backend, and Supabase database.

---

## Pre-requisites

1. **Database Migration Applied**:
   Run the SQL statements from [`docs/roles_migration.sql`](./roles_migration.sql) in your **Supabase Dashboard -> SQL Editor**.
   This creates/updates the `public.profiles` table with RLS and attaches the `on_auth_user_created` trigger.
2. **Frontend & Backend Running**:
   - Frontend running on Vite (`http://localhost:5173` or deployed on Vercel)
   - Backend running on FastAPI (`http://localhost:8000` or deployed host)

---

## Verification Test Cases

### Test 1: Register as Faculty -> Lands on Faculty Dashboard
1. Open the application at `/login` and select the **Register** tab.
2. Select **"Faculty member"** from the *"I am registering as"* dropdown.
3. Enter Full Name, Email (e.g. `prof_jane@test.edu`), and a password (8+ characters).
   *(If your institution has set `FACULTY_INVITE_CODE`, enter the code in the invite code box).*
4. Click **Create account**.
5. **Expected Result**:
   - If email confirmation is disabled/auto-confirmed: The user immediately lands on `/faculty/dashboard` (Faculty Dashboard).
   - If email confirmation is enabled: Check inbox, click the confirmation link. Upon sign in at `/login`, the user is automatically redirected to `/faculty/dashboard`.
   - The TopBar displays `faculty` under the profile avatar.
   - The sidebar shows faculty navigation groups (*"Courses & Upload"*, *"Course Content"*, *"Quality Report"*, *"Settings"*).

---

### Test 2: Register as Student -> Lands on Student Dashboard
1. Open `/login` and select **Register**.
2. Select **"Student"** from the *"I am registering as"* dropdown.
3. Enter Name, USN/Student ID (e.g. `CS101-001`), Email, and password.
4. Click **Create account**.
5. **Expected Result**:
   - The user immediately lands on `/student/dashboard` (or `/dashboard` displaying Student details).
   - TopBar displays `student` under the profile avatar.
   - The sidebar shows student navigation groups (*"My units"*, *"Missed items"*, *"Study plan"*).

---

### Test 3: Page Refresh on Each Dashboard
1. Log in as a Faculty user and navigate to `/faculty/dashboard`.
2. Press `F5` / browser Refresh.
3. **Expected Result**:
   - A brief loading state (`"Checking your session..."`) appears while the session and single-source-of-truth profile are fetched from Supabase.
   - The user stays on `/faculty/dashboard`. It **never** renders the student dashboard or default screen.
4. Repeat while logged in as a Student on `/student/dashboard`.
5. **Expected Result**:
   - The student stays on `/student/dashboard`. It **never** renders the faculty dashboard.

---

### Test 4: Logout and Login as the Other Role (No Stale Role)
1. While logged in as Faculty, open the user menu in TopBar and click **Log out**.
2. **Expected Result**:
   - User is redirected to `/login` (or `/`). All cached role and user state is cleared.
3. In the same browser tab, log in using the Student credentials created in Test 2.
4. **Expected Result**:
   - User is redirected to `/student/dashboard`.
   - The interface renders student data with **zero** leftover faculty state or permissions.

---

### Test 5: Open a Faculty URL as a Student (Blocked by RouteGuard)
1. Log in as a Student.
2. Manually enter a faculty-only URL in the browser address bar, for example:
   - `http://localhost:5173/courses`
   - `http://localhost:5173/report`
   - `http://localhost:5173/faculty/dashboard`
3. Press Enter.
4. **Expected Result**:
   - `RoleRoute` intercepts the attempt.
   - The student is immediately redirected back to `/student/dashboard`.
   - A toast message notifies: *"That area is for faculty."*

---

### Test 6: Open a Student URL as Faculty (Blocked by RouteGuard)
1. Log in as Faculty.
2. Manually enter a student-only URL in the browser address bar:
   - `http://localhost:5173/student/dashboard`
   - `http://localhost:5173/topics/dashboard/my-units`
3. Press Enter.
4. **Expected Result**:
   - `RoleRoute` intercepts the attempt.
   - The faculty member is redirected back to `/faculty/dashboard`.
   - A toast message notifies: *"That area is for students."*

---

### Test 7: Confirm a Student Cannot Change Role by Editing Request (RLS Check)
1. Log in as a Student in Chrome/Firefox.
2. Open DevTools -> Console.
3. Attempt to update the role column directly via the Supabase client:
   ```javascript
   const supabase = window.__supabaseClient // or via direct REST fetch
   await fetch('https://<project-ref>.supabase.co/rest/v1/profiles', {
     method: 'PATCH',
     headers: {
       'apikey': '<anon-key>',
       'Authorization': 'Bearer <student-jwt-token>',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ role: 'faculty' })
   })
   ```
4. **Expected Result**:
   - Request fails or does not update the `role` column because RLS policy `profiles_update_own_details` only allows non-role updates, and the Postgres check constraint / trigger enforces the single source of truth.
   - On page refresh, the user remains strictly a `student`.

---

### Test 8: Backend API Enforces Faculty-Only Access (403 Forbidden for Students)
1. Obtain an access token for a student account.
2. Make a request using `curl` or Postman to a faculty endpoint on the FastAPI backend:
   ```bash
   curl -X POST "http://localhost:8000/courses/<course_id>/analyze" \
        -H "Authorization: Bearer <student-jwt-token>"
   ```
3. **Expected Result**:
   - Response status: `403 Forbidden`
   - JSON response:
     ```json
     {
       "detail": "Forbidden: Faculty access required."
     }
     ```
   - Calling `/courses/<course_id>/findings` also returns `403 Forbidden`.

---

### Test 9: Faculty Invite Code Protection (Optional Abuse Prevention)
1. Set the environment variable on the backend host:
   ```env
   FACULTY_INVITE_CODE=CAMPUS_SECRET_2026
   ```
2. In the registration form, select **"Faculty member"**.
3. Attempt to register without entering the invite code or with an incorrect code.
4. **Expected Result**:
   - Registration assigns the safe default `student` role (or displays that code is invalid).
5. Register with the matching code `CAMPUS_SECRET_2026`.
6. **Expected Result**:
   - User successfully receives the `faculty` role and lands on the Faculty Dashboard.
