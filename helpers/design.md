APP: NNPU — School Management System (PU College)
PLATFORM: Mobile app (iOS + Android), portrait only
DESIGN SYSTEM: Material 3, primary color Blue (M3 baseline blue seed color, tonal surfaces, elevated cards, rounded 12-16dp corners, M3 top app bars and bottom navigation)

CONTEXT
Three user roles share one app, with different navigation/screens per role: Student, Teacher, Admin. Data model: a Student belongs to a Section (a physical classroom/session — can contain a mix of combinations like PCMB/PCMC and languages like Kannada/Hindi) within a Class (1st PU / 2nd PU) and Combination (e.g. PCMB, PCMC, CEBA, SEBA). Login uses a school-issued ID (not email) + password.

===================================================
SCREENS TO GENERATE
===================================================

1. SPLASH / LOADING SCREEN

- App logo centered
- Simple loading spinner/progress indicator
- Footer, bottom of screen: small centered text "Powered by vima-dev's"

2. LOGIN SCREEN

- Fields: "School ID" (text, e.g. placeholder "nnpu1sb26ka1"), "Password" (password field with show/hide toggle)
- "Log in" primary button (M3 filled button)
- Error state: inline helper text under fields for invalid credentials
- No "sign up" — accounts are created by Admin only, so no registration link

3. FORGOT PASSWORD state

- Not self-service (no email reset) — simple screen: "Contact your school administrator to reset your password", with a back-to-login button

4. HOME / DASHBOARD (3 variants — Student, Teacher, Admin)
   4a. Student Home:
   - Greeting card with name, class, section, combination
   - Today's attendance status card (Present/Absent/Late/Not marked)
   - Quick stats: attendance % this month, upcoming assessment (if any)
   - Recent notifications preview (list of 2-3 with unread dot)
   - Bottom nav: Home, Attendance, Marks, Fees, Profile

   4b. Teacher Home:
   - Greeting card with name, subjects taught, class-teacher badge if applicable
   - "Mark attendance" quick action card (shows sections needing attendance marked today)
   - Sections/subjects list they teach
   - Recent notifications preview
   - Bottom nav: Home, Attendance, Marks, Notifications, Profile

   4c. Admin Home:
   - School overview stat cards: total students, total teachers, total sections, fee collection summary
   - Quick actions grid: Create Student, Create Teacher, Create Admin, Create Section, Create Academic Year
   - Recent activity feed
   - Bottom nav: Home, Students, Fees, Reports, Profile

5. ATTENDANCE — STUDENT VIEW

- Monthly calendar view, days color-coded: green (Present), red (Absent), yellow (Late), grey (Not marked/holiday)
- Tapping a day shows detail (marked by, time)
- Top summary card: attendance % this month and this academic year
- Filter: month/year picker

6. ATTENDANCE — TEACHER VIEW (mark attendance)

- Section + date selector at top
- Scrollable roster list: student name, roll/authId, combination badge (since sections can be mixed), status toggle (Present/Absent/Late) per row — quick "Mark all present" bulk action button
- "Save attendance" primary button (sticky at bottom)
- Roster grouped or tagged by combination badge next to each student's name (since a section can mix PCMB/PCMC/etc.)

7. MARKS / ASSESSMENTS — STUDENT VIEW

- List of assessments grouped by category (Unit Test, Mid Term, Final Theory, Final Practical, Internal)
- Each row: subject, max marks, marks obtained, remarks (if any)
- Subject-wise summary chart/bar (marks obtained vs max per subject)

8. MARKS — TEACHER VIEW (enter marks)

- Assessment picker (subject + section + category)
- Roster list with editable marks-obtained field per student (numeric input, inline validation against max marks) + optional remarks field
- "Save marks" primary sticky button
- Note: only students whose combination includes this subject should appear — show combination badge for clarity in mixed sections

9. FEES — STUDENT VIEW

- Fee structure breakdown card: tuition, exam, transport, hostel, other fees
- Invoice list: due date, total amount, paid amount, status badge (Pending/Partial/Paid)
- "Pay now" button opening a payment method sheet (Razorpay / UPI / Cash marked as "pay at office" / Cheque / Bank transfer)
- Payment history list below

10. FEES — ADMIN VIEW

- Section-wise fee structure setup screen (create/edit fee structure per section + academic year)
- Student invoice list with filters (status, section, due date)
- Payment reconciliation list (for manually recording Cash/UPI/Cheque payments)

11. NOTIFICATIONS

- List grouped by date, unread items highlighted with a dot/bold
- Notification types with icons: Attendance Pending, Attendance Updated, Marks Published, New Announcement, Timetable Updated, Fee Due, Payment Successful
- Tap to mark as read / navigate to relevant screen

12. REPORT CARD — STUDENT VIEW

- Academic year selector
- Status card: Pending / Processing / Ready / Failed
- When Ready: "View/Download PDF" button
- Summary of subject-wise marks (reuses marks summary component)

13. PROFILE PAGE (all roles)

- Profile picture (tap to change — opens camera/gallery picker sheet, "Remove photo" option)
- Name (read-only, editable only for Admin-managed fields)
- Role badge (Student/Teacher/Admin)
- For Student: class, section, combination, language shown as read-only info chips
- "Change password" list item → navigates to change password screen (current password, new password, confirm new password fields)
- "Log out" button at the bottom (destructive/outlined style)

14. ACADEMIC CALENDAR (all roles, read view)

- Month calendar with day types color-coded: Working, Holiday, Exam, Event, Weekend
- Legend at bottom
- Admin-only: "Edit calendar" pencil icon to add/edit a day's type + label

15. ADMIN — CREATE FLOWS (forms, each a simple single-column form screen with a sticky "Create" button)

- Create Student: name, profile pic upload, school (preselected), class year, session, combination, language
- Create Teacher: name, profile pic upload, school (preselected)
- Create Admin: name, profile pic upload, school (preselected)
- Create Academic Year: label, start date, end date (date pickers)
- Create Section: class year, session letter, academic year (dropdown)

===================================================
COMPONENTS / STATES TO INCLUDE FOR EACH RELEVANT SCREEN
===================================================

- Empty states (e.g. "No notifications yet", "No assessments yet")
- Loading skeleton state for list-heavy screens (attendance roster, marks list, notifications)
- Error state (generic "Something went wrong, tap to retry")

===================================================
NAVIGATION STRUCTURE
===================================================

- Bottom tab navigation, tabs differ per role as described in Home screens above
- Top app bar on every screen: screen title, back button where applicable, notification bell icon with unread badge (top right, except on the Notifications screen itself)
