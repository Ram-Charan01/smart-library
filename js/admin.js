if (localStorage.getItem("role") !== "admin") {
  alert("Access denied!");
  window.location.href = "login.html";
}

// 📊 GET ELEMENTS
const totalBooksEl = document.getElementById("totalBooks");
const totalRequestsEl = document.getElementById("totalRequests");
const pendingRequestsEl = document.getElementById("pendingRequests");
const approvedRequestsEl = document.getElementById("approvedRequests");


// 🎯 LOAD DASHBOARD DATA
function loadDashboard() {

  // 📚 Total Books
  totalBooksEl.textContent = books.length;

  // 📩 Total Requests
  totalRequestsEl.textContent = reservations.length;

  // ⏳ Pending Requests
  let pendingCount = reservations.filter(r => r.status === "pending").length;
  pendingRequestsEl.textContent = pendingCount;

  // ✅ Approved Requests
  let approvedCount = reservations.filter(r => r.status === "approved").length;
  approvedRequestsEl.textContent = approvedCount;
}


// 🚀 INITIAL LOAD
loadDashboard();