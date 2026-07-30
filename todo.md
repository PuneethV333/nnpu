# Todo

## Teacher Screens (need UI)
- [ ] **Mark Attendance** — `Teacher-Attendance.tsx` exists but crashes (uses `useGetAllSections` which imports a non-existent API function). Needs `getAllSections` added to `api/sections.ts`.
- [ ] **Enter Marks** — `mark-page/main/Teacher.tsx` exists, needs verification
- [ ] **Fees** — `fees-page/main/Teacher.tsx` exists but never imported by `fees.tsx`

## Admin Screens (no UI at all)
- [ ] **Enrollment management** — 6 endpoints (create drive, list drives, view submissions, promote, etc.) all have API+hooks but zero admin screens
- [ ] **Onboarding** — 7 endpoints (create school, student, teacher, admin, academic year, section, sections-bulk) — no UI
- [ ] **Fee structure & invoice generation** — create/edit fee structure, generate invoices — no admin UI
- [ ] **Calendar management** — generate calendar, override days — no admin UI
- [ ] **Report cards** — 2 endpoints (generate, check status) — no frontend at all

## Missing Screens (all roles)
- [ ] **Announcement list** — `GET /announcement/all` has API+hook but no screen
- [ ] **Announcement detail** — `GET /announcement/:id` has API+hook but no screen
- [ ] **Full timetable view** — `GET /time-table` has API+hook but no screen (only today's on home)
- [ ] **Report card view** — `GET /marks/report/:studentId/:subjectId` has API+hook but no student-facing screen

## Dummy → Real Data
- [ ] **Fees page** — `USE_DUMMY = true`, swap to real `useGetMyInvoices`
- [ ] **Notifications** — `USE_DUMMY = true`, swap to real `useGetNotifications`

## Library Feature (new)
- [ ] **Prisma models** — `Book` (isbn, title, author, publisher), `BookCopy` (barcode, condition), `BookLoan` (borrower, copy, borrowedAt, dueDate, returnedAt)
- [ ] **Backend module** — `library/` with CRUD for books, borrow/return by barcode scan, overdue tracking
- [ ] **Barcode scanning** — integrate `expo-camera` or `expo-barcode-scanner` for scanning ISBN/barcodes
- [ ] **Teacher screen** — borrow/return UI with camera scan, see borrowed list, due dates
- [ ] **Student screen** — view own borrowed books and return dates

## Bugs
- [ ] **`useGetAllSections`** — hook exists but `getAllSections` is missing from `api/sections.ts`, crashes Teacher attendance screen
