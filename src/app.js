alert('APP.JS LOADED on iOS ✅');

import { loadTasks, saveTasks } from './storage.js';

let tasks = [];
let filter = 'all';
let editingId = null;

const $ = (sel) => document.querySelector(sel);

/* =========================
   iOS / Web SAFE TAP
========================= */
function onTap(el, handler) {
  if (!el) return;

  let locked = false;

  const run = async (e) => {
    if (locked) return;
    locked = true;

    e?.preventDefault?.();
    e?.stopPropagation?.();

    try {
      await handler(e);
    } finally {
      setTimeout(() => (locked = false), 250);
    }
  };

  el.addEventListener('touchend', run, { passive: false });
  el.addEventListener('click', run);
}

/* ========================= */

function uid() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function applyFilter(items) {
  if (filter === 'active') return items.filter((t) => !t.done);
  if (filter === 'done') return items.filter((t) => t.done);
  return items;
}

function updateCounter() {
  $('#counter').textContent = `Всього: ${tasks.length}, активні: ${
    tasks.filter((t) => !t.done).length
  }`;
}

function updateEmptyState() {
  $('#emptyState').style.display = applyFilter(tasks).length ? 'none' : 'block';
}

function render() {
  $('#tasksList').innerHTML = applyFilter(tasks)
    .map(
      (t) => `
      <ion-item>
        <ion-checkbox slot="start" ${t.done ? 'checked' : ''} data-id="${t.id}"></ion-checkbox>
        <ion-label>
          <h2 class="${t.done ? 'done' : ''}">${t.title}</h2>
          ${t.description ? `<p>${t.description}</p>` : ''}
        </ion-label>
        <ion-buttons slot="end">
          <ion-button fill="clear" data-edit="${t.id}">
            <ion-icon name="create-outline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" color="danger" data-delete="${t.id}">
            <ion-icon name="trash-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-item>
    `
    )
    .join('');

  updateCounter();
  updateEmptyState();
}

function resetModal() {
  editingId = null;
  $('#task-modal-title').textContent = 'Нове завдання';
  $('#taskTitle').value = '';
  $('#taskDescription').value = '';
  $('#taskDueAt').value = '';
}

async function init() {
  const modal = $('#taskModal');

  tasks = await loadTasks();
  render();

  $('#filterSegment').addEventListener('ionChange', (e) => {
    filter = e.detail.value;
    render();
  });

  /* + button */
  onTap($('#open-task-modal'), async () => {
    resetModal();
    setTimeout(() => modal.present(), 0);
  });

  /* Close */
  onTap($('#close-task-modal'), async () => {
    document.activeElement?.blur?.();
    await modal.dismiss();
  });

  /* Save */
  onTap($('#save-task'), async () => {
    const title = $('#taskTitle').value.trim();
    if (!title) return;

    const task = {
      id: editingId || uid(),
      title,
      description: $('#taskDescription').value.trim(),
      dueAt: $('#taskDueAt').value || null,
      done: false,
    };

    tasks = editingId
      ? tasks.map((t) => (t.id === editingId ? task : t))
      : [task, ...tasks];

    await saveTasks(tasks);
    await modal.dismiss();
    render();
  });

  /* List actions */
  $('#tasksList').addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete]');
    const edit = e.target.closest('[data-edit]');

    if (del) {
      tasks = tasks.filter((t) => t.id !== del.dataset.delete);
      await saveTasks(tasks);
      render();
    }

    if (edit) {
      const t = tasks.find((x) => x.id === edit.dataset.edit);
      editingId = t.id;
      $('#task-modal-title').textContent = 'Редагувати завдання';
      $('#taskTitle').value = t.title;
      $('#taskDescription').value = t.description || '';
      $('#taskDueAt').value = t.dueAt || '';
      setTimeout(() => modal.present(), 0);
    }
  });

  $('#tasksList').addEventListener('ionChange', async (e) => {
    const cb = e.target.closest('ion-checkbox');
    if (!cb) return;

    const id = cb.closest('ion-item').querySelector('[data-edit]')?.dataset.edit;
    const t = tasks.find((x) => x.id === id);
    if (!t) return;

    t.done = cb.checked;
    await saveTasks(tasks);
    render();
  });
}

init();
