const tableBody = document.getElementById("myBooksTable");

function displayMyBooks() {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  const currentUser = getCurrentUser();
  let userReservations = reservations.filter(r => r.userId === currentUser.id);

  if (userReservations.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='5'>No reservations found</td></tr>";
    return;
  }

  let fragment = document.createDocumentFragment();

  userReservations.forEach(r => {
    let book = getBookById(r.bookId);
    let statusInfo = getStatusInfo(r.status);

    let submissionStatus = r.status === "approved" ? "Submitted" : r.status === "rejected" ? "Not Submitted" : "Pending Submission";

    let returnStatus = "";
    if (r.status === "rejected") {
      returnStatus = "-";
    } else if (r.status === "pending") {
      returnStatus = "Waiting Approval";
    } else if (r.status === "approved") {
      returnStatus = r.returnStatus === "returned" ? "Returned" : "Not Returned";
    }

    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeBookText(book?.title || "Unknown")}</td>
      <td style="color:${statusInfo.color}; font-weight:bold;">${statusInfo.label}</td>
      <td>${r.reservedDate}</td>
      <td>${r.dueDate ? r.dueDate : "-"}</td>
      <td>${returnStatus}</td>
    `;

    fragment.appendChild(tr);
  });

  tableBody.appendChild(fragment);
}

function checkDueDates() {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) return;

  let today = new Date();

  reservations.forEach(r => {
    if (r.userId === currentUser.id && r.status === "approved" && r.dueDate) {
      let due = new Date(r.dueDate);
      let diff = (due - today) / (1000 * 60 * 60 * 24);

      if (diff <= 1 && diff > 0) {
        showToast(`Reminder: "${getBookById(r.bookId).title}" is due tomorrow!`, "warning");
      }

      if (diff < 0) {
        showToast(`⚠️ Overdue: "${getBookById(r.bookId).title}"`, "error");
      }
    }
  });
}

displayMyBooks();
checkDueDates();
