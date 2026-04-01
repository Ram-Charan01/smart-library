# Smart Library Management (FSD Lab Project)

## Overview
A lightweight client-side library management system built with HTML/CSS/JavaScript and `localStorage` persistence. Supports:
- Admin dashboard with inventory and request tracking
- User homepage with book catalog and search
- Login/auth toggling (admin vs user)
- Book CRUD (add/edit/delete) from inventory page
- Request/reservation workflow (pending/approved/rejected/returned)

## File Structure
- `index.html` – user home page (catalog, search, request library books)
- `admin.html` – admin dashboard (stats cards, quick operation links)
- `inventory.html` – inventory management (list, add/search/edit/delete books)
- `requests.html` – request management (pending/resolved requests, approval/return handling)
- `login.html` – authentication form with roles
- `book.html`, `mybooks.html` – secondary views
- `css/style.css` – app styles
- `js/data.js` – shared data model (`books`, `reservations`, persistence helpers)
- `js/auth.js` – login/logout and role gating
- `js/app.js` – user home initialization
- `js/admin.js` – admin dashboard counters
- `js/inventory.js` – inventory page logic
- `js/requests.js` – request page logic
- `assets/images` – placeholder images

## New Features Implemented
1. Inventory dashboard now has a board button: **Add New Book**
2. Add book modal:
   - Upload cover image (`jpg/jpeg/png`)
   - Title, author, category, stock
   - Adds a book to inventory table and `localStorage`
3. Search bar styling harmonized across:
   - `index.html`, `inventory.html`, `requests.html`
4. Request sorting in `requests.html`:
   - Pending requests first
   - Approved-but-not-returned next
   - Returned or rejected last
5. Admin dashboard panel now includes **Pending Requests** count.
6. Renamed `inventary` to `inventory` in files and references.

## Usage
1. Open `login.html` in browser.
2. Login as admin (use hardcoded admin credentials in `js/auth.js` if present) or as user.
3. Admin flows:
   - Go to `Inventory` to add/edit/delete books.
   - Go to `Requests` to approve/reject return flows.
   - Dashboard displays counts and status.
4. User flows:
   - Browse books on `index.html`, search and request reservation.
   - View own reservations in `mybooks.html`.

## Important Notes
- Data is stored in browser `localStorage`; clearing storage resets app state.
- File uploads are handled with `URL.createObjectURL()` only for the session and not persisted as physical files.

## Developer
- Author: FSD Lab Student
- Date: 2026-03-31

## Test Checklist
- [x] Login role checks work (admin/regular user)
- [x] Inventory add modal shows in center and adds a row
- [x] Search bars share consistent styling
- [x] Requests page prioritizes pending and return-needed
- [x] Admin dashboard counts (`total`, `pending`, `approved`) update

## Next Improvements
- Add server-side API + database for persistence
- File upload as real stored image URLs
- History logging for admin actions
- UI polish with responsive layout and animations
