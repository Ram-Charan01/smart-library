import React, { useEffect, useRef, useState } from 'react';
import { branches } from '../../backend/shared/branches.js';
import { api } from './api.js';

function readCover(file) {
  if (!file) return Promise.resolve(undefined);
  if (file.size > 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.type)) {
    return Promise.reject(new Error('Choose a JPEG or PNG cover up to 1 MB.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The cover file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function BookForm({ book, onCancel, onSave }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState('');
  const [author, setAuthor] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lookup = useRef(null);
  const dialog = useRef(null);
  const selectedBook = results.find(result => result.key === selected);

  useEffect(() => {
    dialog.current.showModal();
    return () => lookup.current?.abort();
  }, []);

  async function search() {
    if (searching) return;
    if (query.trim().length < 3) {
      setLookupStatus('Enter at least 3 characters.');
      return;
    }
    const controller = new AbortController();
    lookup.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setSearching(true);
    setLookupStatus('Searching Open Library…');
    try {
      const params = new URLSearchParams({ title: query.trim(), fields: 'key,title,author_name,cover_i,first_publish_year', limit: '15' });
      const response = await fetch(`https://openlibrary.org/search.json?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Search failed');
      const { docs } = await response.json();
      const matches = docs.filter(item => item.key && item.title).map(item => ({
        key: item.key,
        title: item.title,
        author: item.author_name?.join(', ') || '',
        year: item.first_publish_year,
        image: Number.isInteger(item.cover_i) ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg?default=false` : ''
      }));
      setResults(matches);
      setSelected('');
      setAuthor('');
      setLookupStatus(matches.length ? 'Choose a book from the dropdown.' : 'No books found. Try another title or enter the book manually.');
    } catch {
      setLookupStatus('Open Library could not load. Try again or enter the book manually.');
    } finally {
      clearTimeout(timeout);
      setSearching(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const stock = Number(fields.get('stock'));
      const file = fields.get('cover');
      const image = await readCover(file?.size ? file : null);
      if (book) {
        await api(`/admin/books/${book._id}`, { method: 'PATCH', body: { stockDelta: stock, image } });
      } else {
        await api('/admin/books', { method: 'POST', body: {
          title: selectedBook?.title || fields.get('title'), author, category: fields.get('category'), stock,
          image: image ?? selectedBook?.image ?? ''
        } });
      }
      onSave();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <dialog ref={dialog} className="modal-content book-dialog" aria-labelledby="book-form-title"
    onCancel={event => { event.preventDefault(); if (!saving) onCancel(); }}>
    <h3 id="book-form-title">{book ? 'Edit Book' : 'Add New Book'}</h3>
    <form onSubmit={submit}>
      {book ? <strong>{book.title} by {book.author}</strong> : <>
        <div>
          <label htmlFor="book-lookup">Search Open Library by title</label>
          <div className="book-lookup-controls">
            <input id="book-lookup" type="search" placeholder="Enter at least 3 characters" value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} />
            <button type="button" className="action-btn" disabled={searching || saving} onClick={search}>Search</button>
          </div>
          <small role="status">{lookupStatus}</small>
        </div>
        <label>Book title
          <select required value={selected} onChange={event => {
            const key = event.target.value;
            setSelected(key);
            setAuthor(results.find(result => result.key === key)?.author || '');
          }}>
            <option value="">Select a book</option>
            {results.map(result => <option key={result.key} value={result.key}>
              {[result.title, result.author, result.year].filter(Boolean).join(' · ')}
            </option>)}
            <option value="manual">Enter a book manually</option>
          </select>
        </label>
        {selected === 'manual' && <label>Manual book title<input name="title" maxLength={300} required /></label>}
        <label>Author<input value={author} maxLength={300} required onChange={event => setAuthor(event.target.value)} /></label>
        <label>Branch
          <select name="category" defaultValue="" required>
            <option value="">Select branch</option>
            {branches.map(branch => <option key={branch}>{branch}</option>)}
          </select>
        </label>
      </>}
      {selectedBook?.image && <img key={selectedBook.image} src={selectedBook.image} alt="Selected book cover" width="64"
        onError={event => { event.currentTarget.hidden = true; }} />}
      <label>{book ? 'Replace cover (optional)' : 'Upload a cover (optional)'}
        <input name="cover" type="file" accept="image/jpeg,image/png" />
      </label>
      <label>{book ? 'Add stock count' : 'Starting stock'}
        <input name="stock" type="number" min="0" max="100000" step="1" defaultValue={book ? 0 : undefined} required />
      </label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="row-actions">
        <button className="action-btn" disabled={saving || searching}>{saving ? 'Saving…' : book ? 'Save Changes' : 'Add Book'}</button>
        <button className="action-btn" type="button" disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  </dialog>;
}
