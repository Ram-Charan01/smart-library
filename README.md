# Smart Library MERN prototype

Smart Library uses React for the browser UI, Express and Node.js for the API, and MongoDB for users, sessions, inventory, and borrowing history.

## Run from the VS Code terminal

Use Node.js 22.13 or newer. Open a fresh terminal after installing Node.js so the terminal picks up the updated PATH. In PowerShell, run the following from the project folder.

```powershell
npm.cmd ci
npm.cmd start
```

Open [the login page](http://127.0.0.1:3000/login.html). Express serves the React build and API on the same port. Leave the terminal running while using the app. Press Ctrl+C to stop it.

The first start downloads a MongoDB server binary and starts a local database. Data lives in `backend/.library-data` and persists across restarts. If you already have MongoDB or use Atlas, copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`. Open Library lookup also requires internet access. Use manual entry for offline catalog additions.

| Role | Username | Demo password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Student | `user` | `user123` |

These credentials are for local demos. Set `ADMIN_PASSWORD` and `STUDENT_PASSWORD` before starting with a fresh database to choose different passwords. The app seeds four sample titles. Existing browser storage from the earlier prototype is separate from the MongoDB data.

## Workflows

- Students search the catalog by title, author, or branch, open book details, request available copies, and track their requests in **My Books**.
- Admins add a title by searching Open Library or entering it manually, select one of the 12 branches, and set initial stock. They can increase stock and replace covers. Uploaded JPEG or PNG covers up to 1 MB are stored with the book in MongoDB.
- Admins see pending requests first, can approve or reject them, and mark approved loans as returned. Approval assigns a due date seven days later. A return frees the copy and preserves the history. The dashboard shows title, request, pending, and approval totals.
- Request operations update the book and its loan history atomically, so approving the last copy or repeating the same return cannot produce extra inventory.

## Project layout

- `frontend/` contains React, styles, images, and the frontend build. The React entry point is `frontend/src/main.jsx`. The original browser-only prototype is kept in `frontend/legacy/`.
- `backend/` contains the Express API, MongoDB configuration and data, shared branch validation, and integration tests. The server entry point is `backend/index.js`.
- The root npm workspace installs dependencies and runs both parts. Use the Express URL for the MERN app.

Run `npm.cmd test` to verify the API against an isolated local MongoDB database.
