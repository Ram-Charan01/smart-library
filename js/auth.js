// 🔐 AUTH NAVBAR + PAGE GUARD
function getCurrentRole() {
  return localStorage.getItem("role") || "guest";
}

function pageGuard() {
  const role = getCurrentRole();
  const page = window.location.pathname.split("/").pop();

  const adminOnly = ["admin.html", "requests.html"];
  const userPages = ["index.html", "mybooks.html"];

  if (adminOnly.includes(page) && role !== "admin") {
    showToast("Restricted area: admin login required.", "warning");
    window.location.href = "login.html";
    return;
  }

  if (userPages.includes(page) && !["user", "admin"].includes(role)) {
    showToast("Please log in to continue.", "warning");
    window.location.href = "login.html";
    return;
  }
}

function initAuthNav() {
  const role = getCurrentRole();
  const authBtn = document.getElementById("authBtn");

  if (!authBtn) return;

  if (role && role !== "guest") {
    authBtn.textContent = "Logout";
    authBtn.href = "#";
    authBtn.onclick = event => {
      event.preventDefault();
      localStorage.removeItem("role");
      localStorage.removeItem("currentUser");
      showToast("Logged out successfully.", "info");
      window.location.href = "login.html";
    };
  } else {
    authBtn.textContent = "Login";
    authBtn.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  pageGuard();
  initAuthNav();
});
