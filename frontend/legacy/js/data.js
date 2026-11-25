// 📚 BOOK DATA
const defaultBooks = [
  {
    id: 1,
    title: "Data Structures",
    author: "Seymour Lipschutz",
    category: "CSE",
    stock: 5,
    image: "https://via.placeholder.com/300x200?text=Data+Structures"
  },
  {
    id: 2,
    title: "Operating Systems",
    author: "Galvin",
    category: "CSE",
    stock: 3,
    image: "https://via.placeholder.com/300x200?text=Operating+Systems"
  },
  {
    id: 3,
    title: "Computer Networks",
    author: "Andrew Tanenbaum",
    category: "CSE",
    stock: 4,
    image: "https://via.placeholder.com/300x200?text=Networks"
  },
  {
    id: 4,
    title: "Digital Electronics",
    author: "Morris Mano",
    category: "ECE",
    stock: 2,
    image: "https://via.placeholder.com/300x200?text=Electronics"
  }
];

let books = JSON.parse(localStorage.getItem("books")) || defaultBooks;

function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books));
}

// 📩 RESERVATION DATA
let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

// Normalize return status for legacy data
reservations = reservations.map(r => ({
  ...r,
  returnStatus: r.returnStatus || "not-returned"
}));

// 👤 LOGGED-IN USER STATE
function getCurrentUser() {
  let user = JSON.parse(localStorage.getItem("currentUser"));
  if (user && user.id && user.role) {
    return user;
  }
  return { id: null, name: "Guest", role: "guest" };
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("role");
}

// 🔄 SAVE TO LOCAL STORAGE
function saveReservations() {
  localStorage.setItem("reservations", JSON.stringify(reservations));
}

// 🔍 GET BOOK BY ID
function escapeBookText(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

function getBookById(id) {
  return books.find(book => book.id === id);
}

function getReservedCount(bookId) {
  return reservations.filter(r => r.bookId === bookId && r.status === "approved").length;
}

function getStatusInfo(status) {
  switch (status) {
    case "approved": return { color: "green", label: "Approved" };
    case "pending": return { color: "orange", label: "Pending" };
    case "rejected": return { color: "red", label: "Rejected" };
    default: return { color: "black", label: status };
  }
}

// 🔔 Toast
function showToast(message, type = "info") {
  let toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 20);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2600);
}

// 📌 RESERVE BOOK (USER SIDE)
function reserveBook(bookId) {
  let currentUser = getCurrentUser();

  if (!currentUser || !currentUser.id || currentUser.role === "guest") {
    showToast("Please login to reserve books.", "warning");
    window.location.href = "login.html";
    return;
  }

  let book = getBookById(bookId);
  if (!book) {
    showToast("Book not found.", "error");
    return;
  }

  if (book.stock - getReservedCount(bookId) <= 0) {
    showToast("Book not available.", "error");
    return;
  }

  let alreadyReserved = reservations.some(
    r => r.bookId === bookId && r.userId === currentUser.id && r.status !== "rejected"
  );

  if (alreadyReserved) {
    showToast("You already requested or have this book.", "warning");
    return;
  }

  let newRequest = {
    id: Date.now(),
    userId: currentUser.id,
    bookId: bookId,
    status: "pending",
    returnStatus: "not-returned",
    reservedDate: new Date().toISOString().split("T")[0],
    dueDate: null
  };

  reservations.push(newRequest);
  saveReservations();

  showToast("Reservation request sent.", "success");
}

// ✅ APPROVE REQUEST (ADMIN)
function approveRequest(requestId) {
  let request = reservations.find(r => r.id === requestId);
  if (!request || request.status !== "pending") return;

  let book = getBookById(request.bookId);
  if (!book || book.stock - getReservedCount(book.id) <= 0) {
    showToast("No stock available to approve.", "error");
    return;
  }

  request.status = "approved";
  request.returnStatus = request.returnStatus || "not-returned";

  let due = new Date();
  due.setDate(due.getDate() + 7);
  request.dueDate = due.toISOString().split("T")[0];

  saveReservations();
  showToast("Request approved.", "success");
}

// ❌ REJECT REQUEST (ADMIN)
function rejectRequest(requestId) {
  let request = reservations.find(r => r.id === requestId);
  if (!request || request.status !== "pending") return;

  request.status = "rejected";
  request.returnStatus = "-";
  saveReservations();
  showToast("Request rejected.", "info");
}

function returnRequest(requestId) {
  let request = reservations.find(r => r.id === requestId);
  if (!request || request.status !== "approved") return;

  request.returnStatus = "returned";
  saveReservations();
  showToast("Book marked as returned.", "success");
}
