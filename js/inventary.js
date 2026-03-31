const inventoryTable = document.getElementById('inventoryTable');
const editSection = document.getElementById('editInventorySection');
const addSection = document.getElementById('addBookSection');
const addBookBtn = document.getElementById('addBookBtn');
const addForm = document.getElementById('addBookForm');
const cancelAdd = document.getElementById('cancelAdd');
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
      <td>${book.title}</td>
      <td>${book.author}</td>
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
  addSection.classList.remove('hidden');
}

function hideAddForm() {
  if (!addSection) return;
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

    const title = newBookTitle.value.trim();
    const author = newBookAuthor.value.trim();
    const category = newBookCategory.value.trim();
    const stock = parseInt(newBookStock.value, 10);

    if (!title || !author || !category || isNaN(stock) || stock < 0) {
      alert('Please fill all fields correctly.');
      return;
    }

    let imageUrl = 'https://via.placeholder.com/300x200?text=No+Image';
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
