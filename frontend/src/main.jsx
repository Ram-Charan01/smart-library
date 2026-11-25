import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookForm } from './BookForm.jsx';
import { api } from './api.js';
import '../css/style.css';
import './app.css';

const page = window.location.pathname.split('/').at(-1) || 'index.html';
const adminPages = ['admin.html', 'inventory.html', 'requests.html'];
const home = user => user.role === 'admin' ? '/admin.html' : '/index.html';
const dateLabel = value => value?.slice(0, 10) || '—';

function Notice({ message, error = false }) {
  return message && <p className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>;
}

function useData(path) {
  const [state, setState] = useState({ data: null, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api(path, { signal: controller.signal })
      .then(data => setState({ data, error: '' }))
      .catch(error => {
        if (!controller.signal.aborted) setState({ data: null, error: error.message });
      });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}

function useAction(onSuccess) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  async function run(action, message) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      onSuccess?.(result);
      if (message) setNotice({ message });
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setBusy(false);
    }
  }
  return { busy, notice, run };
}

function Login({ onLogin }) {
  const { busy, notice, run } = useAction(onLogin);
  function submit(event) {
    event.preventDefault();
    const { username, password } = Object.fromEntries(new FormData(event.currentTarget));
    run(() => api('/auth/login', { method: 'POST', body: { username, password } }));
  }
  return <main className="login-page">
    <div className="login-box">
      <h2>Smart Library</h2>
      <form onSubmit={submit}>
        <label>Username<input name="username" autoComplete="username" required autoFocus /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
        {notice && <Notice {...notice} />}
      </form>
    </div>
  </main>;
}

function Navigation({ user, onLogout }) {
  const admin = user.role === 'admin';
  const { busy, notice, run } = useAction(onLogout);
  return <>
    <nav className="navbar" aria-label="Main navigation">
      <h1>Smart Library{admin && ' · Admin'}</h1>
      <div>
        <a href={home(user)}>Home</a>
        {admin ? <><a href="/inventory.html">Inventory</a><a href="/requests.html">Requests</a></>
          : <a href="/mybooks.html">My Books</a>}
        <button type="button" className="nav-logout" disabled={busy}
          onClick={() => run(() => api('/auth/logout', { method: 'POST', body: {} }))}>Logout</button>
      </div>
    </nav>
    {notice && <Notice {...notice} />}
  </>;
}

function Cover({ image, title }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return image && !failed
    ? <img src={image} alt={`Cover of ${title}`} onError={() => setFailed(true)} />
    : <div className="cover-placeholder" aria-hidden="true">No cover available</div>;
}

function BookCard({ book, details, reserve, busy }) {
  return <article className="book-card">
    <Cover image={book.image} title={book.title} />
    <h3>{book.title}</h3>
    <p>Author: {book.author}</p>
    <p>Branch: {book.category}</p>
    <p className={`status ${book.available > 0 ? 'available' : 'not-available'}`}>Available copies: {book.available}</p>
    <button onClick={() => reserve(book._id)} disabled={busy || book.available === 0}>Request Book</button>
    {!details && <a className="book-detail-link" href={`/book.html?id=${book._id}`}>View Details</a>}
  </article>;
}

function SearchBox({ label, value, setValue }) {
  return <div className="search-section">
    <input type="search" aria-label={label} placeholder={label} value={value} onChange={event => setValue(event.target.value)} />
  </div>;
}

function Catalog({ details = false }) {
  const id = new URLSearchParams(location.search).get('id');
  const { data, error, reload } = useData(details ? `/books/${encodeURIComponent(id || '') || 'missing'}` : '/books');
  const [query, setQuery] = useState('');
  const { busy, notice, run } = useAction(reload);
  const reserve = bookId => run(() => api('/requests', { method: 'POST', body: { bookId } }), 'Book request submitted.');
  const books = details ? (data ? [data] : []) : (data || []).filter(book =>
    [book.title, book.author, book.category].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  return <main>
    {!details && <SearchBox label="Search by title, author, or branch" value={query} setValue={setQuery} />}
    {details && <h2 className="page-heading">Book Details</h2>}
    {notice && <Notice {...notice} />}
    <Notice message={error || (!data && 'Loading books…') || (!books.length && 'No books found.')} error={Boolean(error)} />
    <section className={details ? 'single-book' : 'book-container'}>
      {books.map(book => <BookCard key={book._id} book={book} details={details} reserve={reserve} busy={busy} />)}
    </section>
  </main>;
}

function Table({ columns, children, empty }) {
  return <div className="table-wrapper">
    <table className="book-table">
      <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{empty ? <tr><td colSpan={columns.length}>{empty}</td></tr> : children}</tbody>
    </table>
  </div>;
}

function Inventory() {
  const { data, error, reload } = useData('/books');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState('');
  const books = (data || []).filter(book => [book.title, book.author].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  function saved() {
    setNotice(form.book ? 'Inventory updated.' : 'Book added to inventory.');
    setForm(null);
    reload();
  }
  return <main>
    <div className="page-heading heading-actions">
      <h2>Inventory</h2><button type="button" className="action-btn" onClick={() => setForm({})}>+ Add New Book</button>
    </div>
    <SearchBox label="Search by title or author" value={query} setValue={setQuery} />
    <Notice message={notice} />
    <Notice message={error} error />
    <Table columns={['Book Title', 'Author', 'Branch', 'Total Stock', 'Available', 'Edit']}
      empty={!books.length && (data ? 'No books found.' : error || 'Loading inventory…')}>
      {books.map(book => <tr key={book._id}>
        <td>{book.title}</td><td>{book.author}</td><td>{book.category}</td><td>{book.stock}</td><td>{book.available}</td>
        <td><button type="button" className="action-btn" onClick={() => setForm({ book })}>Edit</button></td>
      </tr>)}
    </Table>
    {form && <BookForm book={form.book} onCancel={() => setForm(null)} onSave={saved} />}
  </main>;
}

function Dashboard() {
  const { data, error } = useData('/admin/dashboard');
  const counts = [['Total Books', 'totalBooks'], ['Total Requests', 'totalRequests'],
    ['Pending Requests', 'pendingRequests'], ['Approved Requests', 'approvedRequests']];
  return <main>
    <h2 className="page-heading">Admin Dashboard</h2>
    <Notice message={error} error />
    <section className="dashboard">
      {counts.map(([label, field]) => <article key={field} className="card"><h3>{label}</h3><p>{data?.[field] ?? '—'}</p></article>)}
    </section>
  </main>;
}

function returnLabel(request) {
  if (request.status === 'pending') return 'Waiting approval';
  if (request.status === 'rejected') return '—';
  return request.returnedAt ? 'Returned' : 'Not returned';
}

function dueLabel(request) {
  if (request.status !== 'approved' || request.returnedAt || !request.dueDate) return '';
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  now.setUTCDate(now.getUTCDate() + 1);
  if (request.dueDate < today) return 'Overdue';
  if (request.dueDate === today) return 'Due today';
  return request.dueDate === now.toISOString().slice(0, 10) ? 'Due tomorrow' : '';
}

function Requests({ admin = false }) {
  const { data, error, reload } = useData(admin ? '/admin/requests' : '/requests/me');
  const { busy, notice, run } = useAction(reload);
  const [query, setQuery] = useState('');
  const requests = (data || []).filter(request => !admin || request.userId.includes(query.trim().toLowerCase()));
  const columns = ['Book', ...(admin ? ['User ID'] : []), 'Status', 'Requested', 'Due', 'Return Status', ...(admin ? ['Action'] : [])];
  function update(id, action) {
    run(() => api(`/admin/requests/${id}/${action}`, { method: 'POST', body: {} }), 'Request updated.');
  }
  return <main>
    <h2 className="page-heading">{admin ? 'Manage Requests' : 'My Books'}</h2>
    {admin && <SearchBox label="Search by user ID" value={query} setValue={setQuery} />}
    {notice && <Notice {...notice} />}
    <Table columns={columns} empty={!requests.length && (data ? 'No requests found.' : error || 'Loading requests…')}>
      {requests.map(request => <tr key={request.id}>
        <td>{request.title}</td>
        {admin && <td className="user-id">{request.userId}</td>}
        <td className="request-status">{request.status}</td>
        <td>{dateLabel(request.requestedAt)}</td>
        <td>{dateLabel(request.dueDate)} {!admin && dueLabel(request) && <small className="due-label">{dueLabel(request)}</small>}</td>
        <td>{returnLabel(request)}</td>
        {admin && <td>
          {request.status === 'pending' ? <div className="row-actions">
            <button className="action-btn" disabled={busy} onClick={() => update(request.id, 'approve')}>Approve</button>
            <button className="action-btn" disabled={busy} onClick={() => update(request.id, 'reject')}>Reject</button>
          </div> : request.status === 'approved' && !request.returnedAt
            ? <button className="action-btn" disabled={busy} onClick={() => update(request.id, 'return')}>Mark Returned</button> : '—'}
        </td>}
      </tr>)}
    </Table>
  </main>;
}

function App() {
  const [session, setSession] = useState({ loading: true });
  useEffect(() => {
    api('/auth/me').then(user => setSession({ user })).catch(error => {
      setSession(error.status === 401 ? {} : { error: error.message });
    });
    const onExpired = () => location.assign('/login.html');
    window.addEventListener('library:session-expired', onExpired);
    return () => window.removeEventListener('library:session-expired', onExpired);
  }, []);
  useEffect(() => {
    if (session.user && (page === 'login.html' || (adminPages.includes(page) && session.user.role !== 'admin'))) {
      location.replace(home(session.user));
    }
  }, [session.user]);
  if (session.loading) return <Notice message="Loading Smart Library…" />;
  if (session.error) return <Notice message={session.error} error />;
  const { user } = session;
  if (!user) return <Login onLogin={account => location.assign(home(account))} />;
  if (page === 'login.html' || (adminPages.includes(page) && user.role !== 'admin')) return null;
  const views = {
    'admin.html': <Dashboard />,
    'inventory.html': <Inventory />,
    'requests.html': <Requests admin />,
    'mybooks.html': <Requests />,
    'book.html': <Catalog details />
  };
  return <><Navigation user={user} onLogout={() => location.assign('/login.html')} />{views[page] || <Catalog />}</>;
}

createRoot(document.getElementById('root')).render(<App />);
