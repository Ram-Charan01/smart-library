const table = document.getElementById("requestsTable");
const searchInput = document.getElementById("requestSearch");

function displayRequests() {
  if (!table) return;
  table.innerHTML = "";

  let filtered = [...reservations];
  let query = "";

  if (searchInput && searchInput.value.trim() !== "") {
    query = searchInput.value.trim().toLowerCase();
    filtered = filtered.filter(r => String(r.userId).toLowerCase().includes(query));
  }

  filtered.sort((a, b) => {
    const priority = r => {
      if (r.status === "pending") return 1;
      if (r.status === "approved" && r.returnStatus !== "returned") return 2;
      if (r.status === "approved" && r.returnStatus === "returned") return 3;
      if (r.status === "rejected") return 4;
      return 5;
    };

    let pa = priority(a);
    let pb = priority(b);
    if (pa !== pb) return pa - pb;

    // Newer reservations first for same priority
    if (a.reservedDate && b.reservedDate) {
      return new Date(b.reservedDate) - new Date(a.reservedDate);
    }
    return b.id - a.id;
  });

  if (filtered.length === 0) {
    table.innerHTML = "<tr><td colspan='7'>No requests found</td></tr>";
    return;
  }

  let fragment = document.createDocumentFragment();

  filtered.forEach(r => {
    let book = getBookById(r.bookId);
    let statusInfo = getStatusInfo(r.status);

    let returnStatus = "";
    if (r.status === "rejected") {
      returnStatus = "-";
    } else if (r.status === "pending") {
      returnStatus = "Waiting Approval";
    } else if (r.status === "approved") {
      returnStatus = r.returnStatus === "returned" ? "Returned" : "Not Returned";
    }

    let actionButtons = "-";
    if (r.status === "pending") {
      actionButtons = `
        <button class="approve-btn" data-id="${r.id}" type="button">Approve</button>
        <button class="reject-btn" data-id="${r.id}" type="button">Reject</button>
      `;
    } else if (r.status === "approved" && r.returnStatus !== "returned") {
      actionButtons = `<button class="action-btn" data-return="${r.id}" type="button">Mark Returned</button>`;
    }

    let tr = document.createElement("tr");
    const isMatch = query !== "" && String(r.userId).toLowerCase().includes(query);
    if (isMatch) {
      tr.classList.add("highlight-row");
    }

    tr.innerHTML = `
      <td>${escapeBookText(book?.title || "Unknown")}</td>
      <td>${r.userId}</td>
      <td style="color:${statusInfo.color}; font-weight:bold;">${statusInfo.label}</td>
      <td>${r.reservedDate}</td>
      <td>${r.dueDate ? r.dueDate : "-"}</td>
      <td>${returnStatus}</td>
      <td>${actionButtons}</td>
    `;

    fragment.appendChild(tr);
  });

  table.appendChild(fragment);

  const selectedRow = table.querySelector("tr.highlight-row");
  if (selectedRow) {
    selectedRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

if (table) {
  table.addEventListener("click", event => {
    const target = event.target;
    if (target.classList.contains("approve-btn")) {
      let requestId = parseInt(target.dataset.id, 10);
      approveRequest(requestId);
      displayRequests();
      return;
    }
    if (target.classList.contains("reject-btn")) {
      let requestId = parseInt(target.dataset.id, 10);
      rejectRequest(requestId);
      displayRequests();
      return;
    }
    if (target.classList.contains("action-btn") && target.dataset.return) {
      let requestId = parseInt(target.dataset.return, 10);
      returnRequest(requestId);
      displayRequests();
      return;
    }
  });
}

if (searchInput) {
  searchInput.addEventListener("input", displayRequests);
}

displayRequests();
