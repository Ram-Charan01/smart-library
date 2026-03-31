if (localStorage.getItem("role") !== "admin") {
  alert("Access denied!");
  window.location.href = "login.html";
}

// 📊 GET ELEMENTS
const totalBooksEl = document.getElementById("totalBooks");
const totalRequestsEl = document.getElementById("totalRequests");
const approvedRequestsEl = document.getElementById("approvedRequests");


// 🎯 LOAD DASHBOARD DATA
function loadDashboard() {

  // 📚 Total Books
  totalBooksEl.textContent = books.length;

  // 📩 Total Requests
  totalRequestsEl.textContent = reservations.length;

  // ✅ Approved Requests
  let approvedCount = reservations.filter(r => r.status === "approved").length;
  approvedRequestsEl.textContent = approvedCount;
}


// 🚀 INITIAL LOAD
loadDashboard();