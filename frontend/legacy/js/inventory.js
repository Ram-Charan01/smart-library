const inventoryTable = document.getElementById('inventoryTable');
const editSection = document.getElementById('editInventorySection');
const addSection = document.getElementById('addBookSection');
const addBookBtn = document.getElementById('addBookBtn');
const addForm = document.getElementById('addBookForm');
const cancelAdd = document.getElementById('cancelAdd');
const cancelEdit = document.getElementById('cancelEdit');
const editForm = document.getElementById('editInventoryForm');
const editBookId = document.getElementById('editBookId');
const editBookInfo = document.getElementById('editBookInfo');
const editBookImage = document.getElementById('editBookImage');
const editStock = document.getElementById('editStock');
const inventorySearch = document.getElementById('inventorySearch');
const newBookImage = document.getElementById('newBookImage');
const newBookTitle = document.getElementById('newBookTitle');
const newBookAuthor = document.getElementById('newBookAuthor');
const newBookCategory = document.getElementById('newBookCategory');
const newBookStock = document.getElementById('newBookStock');
const bookLookup = document.getElementById('bookLookup');
const searchBookBtn = document.getElementById('searchBookBtn');
const bookResults = document.getElementById('bookResults');
const bookLookupStatus = document.getElementById('bookLookupStatus');
const manualTitleField = document.getElementById('manualTitleField');
const bookCoverPreview = document.getElementById('bookCoverPreview');
let catalogBooks = [];
let lookupController;

function resetBookResults(placeholder) {
  catalogBooks = [];
  bookResults.replaceChildren(new Option(placeholder, ''), new Option('Enter a book manually', 'manual'));
  fillSelectedBook();
}

function fillSelectedBook() {
  const manual = bookResults.value === 'manual';
  const book = catalogBooks[bookResults.value];
  manualTitleField.hidden = !manual;
  newBookTitle.disabled = !manual;
  newBookTitle.required = manual;
  newBookTitle.value = '';
  newBookAuthor.value = book?.author || '';
  newBookImage.value = '';
  bookCoverPreview.hidden = !book?.image;
  if (book?.image) {
    bookCoverPreview.src = book.image;
  } else {
    bookCoverPreview.removeAttribute('src');
  }
}

async function searchCatalog() {
  const title = bookLookup.value.trim();
  if (title.length < 3) {
    bookLookupStatus.textContent = 'Enter at least 3 characters to search.';
    return;
  }

  lookupController?.abort();
  const controller = new AbortController();
  lookupController = controller;
  searchBookBtn.disabled = true;
  bookLookupStatus.textContent = 'Searching Open Library…';
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const url = new URL('https://openlibrary.org/search.json');
    url.search = new URLSearchParams({ title, fields: 'title,author_name,cover_i,first_publish_year', limit: '15' });
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Book lookup failed');
    const { docs } = await response.json();
    if (lookupController !== controller) return;

    resetBookResults('Select a book');
    catalogBooks = docs.filter(book => typeof book.title === 'string' && book.title.trim()).map(book => ({
      title: book.title,
      author: book.author_name?.join(', ') || '',
      year: book.first_publish_year,
      image: Number.isInteger(book.cover_i)
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg?default=false`
        : ''
    }));
    catalogBooks.forEach((book, index) => {
      const label = [book.title, book.author, book.year].filter(Boolean).join(' · ');
      bookResults.add(new Option(label, String(index)), bookResults.options[bookResults.options.length - 1]);
    });
    bookLookupStatus.textContent = catalogBooks.length
      ? 'Choose a book from the title dropdown.'
      : 'No books found. Try another title or enter the book manually.';
  } catch {
    if (lookupController === controller) {
      bookLookupStatus.textContent = 'Open Library could not load. Try again or enter the book manually.';
    }
  } finally {
    clearTimeout(timeout);
    if (lookupController === controller) {
      lookupController = undefined;
      searchBookBtn.disabled = false;
    }
  }
}

searchBookBtn.addEventListener('click', searchCatalog);
bookLookup.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (!searchBookBtn.disabled) searchCatalog();
  }
});
bookResults.addEventListener('change', fillSelectedBook);
bookCoverPreview.addEventListener('error', () => { bookCoverPreview.hidden = true; });

function renderInventory() {
  if (!inventoryTable) return;
  const query = (inventorySearch && inventorySearch.value.trim().toLowerCase()) || '';
  inventoryTable.innerHTML = '';

  const filteredBooks = query
    ? books.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
    : [...books];

  filteredBooks.forEach((book, index) => {
    const row = document.createElement('tr');
    if (query && (book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query))) {
      row.classList.add('highlight-row');
    }
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeBookText(book.title)}</td>
      <td>${escapeBookText(book.author)}</td>
      <td>${book.stock}</td>
      <td><button class="action-btn" data-id="${book.id}" type="button">Edit</button></td>
    `;
    inventoryTable.appendChild(row);
  });

  if (query) {
    const firstMatch = inventoryTable.querySelector('tr.highlight-row');
    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function showEditForm(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  editBookId.value = book.id;
  editBookInfo.textContent = `${book.title} by ${book.author}`;
  editStock.value = 0;
  editBookImage.value = '';
  editSection.classList.remove('hidden');
  editStock.focus();
}

function hideEditForm() {
  editSection.classList.add('hidden');
}

function showAddForm() {
  if (!addSection) return;
  addForm.reset();
  resetBookResults('Search to find a book');
  bookLookupStatus.textContent = '';
  addSection.classList.remove('hidden');
  bookLookup.focus();
}

function hideAddForm() {
  if (!addSection) return;
  lookupController?.abort();
  lookupController = undefined;
  searchBookBtn.disabled = false;
  addSection.classList.add('hidden');
}

if (addBookBtn) {
  addBookBtn.addEventListener('click', showAddForm);
}

if (cancelAdd) {
  cancelAdd.addEventListener('click', hideAddForm);
}

if (inventoryTable) {
  inventoryTable.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = parseInt(button.dataset.id, 10);
    if (!isNaN(id)) {
      showEditForm(id);
    }
  });
}

if (editForm) {
  editForm.addEventListener('submit', event => {
    event.preventDefault();

    const bookId = parseInt(editBookId.value, 10);
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const stockVal = parseInt(editStock.value, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      alert('Please enter a valid stock value.');
      return;
    }

    if (editBookImage.files && editBookImage.files[0]) {
      const file = editBookImage.files[0];
      const fileURL = URL.createObjectURL(file);
      book.image = fileURL;
    }

    book.stock += stockVal;
    saveBooks();
    renderInventory();
    hideEditForm();
    showToast('Inventory updated successfully.', 'success');
  });
}

if (addForm) {
  addForm.addEventListener('submit', event => {
    event.preventDefault();

    const selectedBook = catalogBooks[bookResults.value];
    const title = (selectedBook?.title || newBookTitle.value).trim();
    const author = newBookAuthor.value.trim();
    const category = newBookCategory.value.trim();
    const stock = newBookStock.valueAsNumber;

    if (!title || !author || !category || !Number.isSafeInteger(stock) || stock < 0) {
      alert('Please fill all fields correctly.');
      return;
    }

    let imageUrl = selectedBook?.image || 'https://via.placeholder.com/300x200?text=No+Image';
    if (newBookImage.files && newBookImage.files[0]) {
      const file = newBookImage.files[0];
      imageUrl = URL.createObjectURL(file);
    }

    const newId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;

    const newBook = {
      id: newId,
      title,
      author,
      category,
      stock,
      image: imageUrl
    };

    books.push(newBook);
    saveBooks();

    renderInventory();
    hideAddForm();
    showToast('New book added to inventory and home page.', 'success');
  });
}

if (cancelEdit) {
  cancelEdit.addEventListener('click', hideEditForm);
}

if (inventorySearch) {
  inventorySearch.addEventListener('input', renderInventory);
}

renderInventory();
