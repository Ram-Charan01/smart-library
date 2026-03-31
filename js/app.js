const bookContainer = document.getElementById("bookContainer");
const searchInput = document.getElementById("searchInput");

function createBookCard(book) {
  let isAvailable = book.stock - getReservedCount(book.id) > 0;
  let availableText = isAvailable ? "Available" : "Not Available";
  let availableClass = isAvailable ? "available" : "not-available";

  let card = document.createElement("div");
  card.className = "book-card";
  card.innerHTML = `
    <img src="${book.image}" alt="${book.title}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=No+Image';" />
    <h3>${book.title}</h3>
    <p>Author: ${book.author}</p>
    <p>Category: ${book.category}</p>
    <p class="status ${availableClass}">${availableText} (Stock: ${book.stock - getReservedCount(book.id)})</p>
    <button type="button" data-id="${book.id}" ${!isAvailable ? "disabled" : ""}>Reserve Book</button>
    <button type="button" class="detail-btn" data-id="${book.id}">View Details</button>
  `;

  return card;
}

function displayBooks(bookList) {
  if (!bookContainer) return;
  bookContainer.innerHTML = "";

  if (bookList.length === 0) {
    bookContainer.innerHTML = "<h2>No books found</h2>";
    return;
  }

  let fragment = document.createDocumentFragment();

  bookList.forEach(book => {
    fragment.appendChild(createBookCard(book));
  });

  bookContainer.appendChild(fragment);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

if (searchInput) {
  searchInput.addEventListener("input", debounce(function() {
    let searchText = searchInput.value.toLowerCase();
    displayBooks(
      books.filter(book =>
        book.title.toLowerCase().includes(searchText) ||
        book.author.toLowerCase().includes(searchText) ||
        book.category.toLowerCase().includes(searchText)
      )
    );
  }, 180));
}

if (bookContainer) {
  bookContainer.addEventListener("click", event => {
    if (event.target.tagName === "BUTTON") {
      let bookId = parseInt(event.target.dataset.id, 10);
      if (event.target.classList.contains("detail-btn")) {
        window.location.href = `book.html?id=${bookId}`;
      } else {
        reserveBook(bookId);
        displayBooks(books);
      }
    }
  });
}

displayBooks(books);
