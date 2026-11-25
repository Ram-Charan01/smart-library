function login() {
  let username = document.getElementById("username").value.trim();
  let password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  if (username === "admin" && password === "admin123") {
    localStorage.setItem("role", "admin");
    localStorage.setItem("currentUser", JSON.stringify({ id: 1, name: "Admin", role: "admin" }));
    window.location.href = "admin.html";
    return;
  }

  if (username === "user" && password === "user123") {
    localStorage.setItem("role", "user");
    localStorage.setItem("currentUser", JSON.stringify({ id: 101, name: "Student", role: "user" }));
    window.location.href = "index.html";
    return;
  }

  alert("Invalid credentials!");
}

function initLogin() {
  const role = localStorage.getItem("role");
  if (role && role !== "guest") {
    window.location.href = role === "admin" ? "admin.html" : "index.html";
    return;
  }

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";
}

window.addEventListener("load", initLogin);
