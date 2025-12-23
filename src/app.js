import { loadTasks, saveTasks } from './storage.js';

let tasks = [];
let filter = 'all'; // all | active | done
let editingId = null;

const $ = (sel) => document.querySelector(sel);

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[m];
  });
}

function applyFilter(items) {
  if (filter === 'active') return items.filter((t) => !t.done);
  if (filter === 'done') return items.filter((t) => t.done);
  return items;
}

function updateCounter() {
  const total = tasks.length;
  const active = tasks.filter((t) => !t.done).length;
  $('#counter').textContent = `Всього: ${total}, активні: ${active}`;
}

function updateEmptyState() {
  const visibleCount = applyFilter(tasks).length;
  $('#emptyState').style.display = visibleCount === 0 ? 'block' : 'none';
}

function formatDue(dueAt) {
  if (!dueAt) return '';
  try {
    return new Date(dueAt).toLocaleString();
  } catch {
    return '';
  }
}

function render() {
  const list = $('#tasksList');
  const items = applyFilter(tasks);

  list.innerHTML = items
    .map((t) => {
      const titleClass = t.done ? 'done' : '';
      const due = t.dueAt ? `<p class="muted">Дедлайн: ${escapeHtml(formatDue(t.dueAt))}</p>` : '';
      const desc = t.description ? `<p class="muted">${escapeHtml(t.description)}</p>` : '';

      return `
        <ion-item>
          <ion-checkbox
            slot="start"
            ${t.done ? 'checked' : ''}
            data-action="toggle"
            data-id="${t.id}"
          ></ion-checkbox>

          <ion-label>
            <h2 class="${titleClass}">${escapeHtml(t.title)}</h2>
            ${desc}
            ${due}
          </ion-label>

          <ion-buttons slot="end">
            <ion-button fill="clear" data-action="edit" data-id="${t.id}" aria-label="edit">
              <ion-icon name="create-outline"></ion-icon>
            </ion-button>
            <ion-button
              fill="clear"
              color="danger"
              data-action="delete"
              data-id="${t.id}"
              aria-label="delete"
            >
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      `;
    })
    .join('');

  updateCounter();
  updateEmptyState();
}

function resetModalToCreate() {
  editingId = null;
  $('#task-modal-title').textContent = 'Нове завдання';
  $('#taskTitle').value = '';
  $('#taskDescription').value = '';
  $('#taskDueAt').value = '';
}

function fillModalForEdit(task) {
  editingId = task.id;
  $('#task-modal-title').textContent = 'Редагувати завдання';
  $('#taskTitle').value = task.title ?? '';
  $('#taskDescription').value = task.description ?? '';
  $('#taskDueAt').value = task.dueAt ? new Date(task.dueAt).toISOString() : '';
}

async function persist() {
  await saveTasks(tasks);
}

async function init() {
  tasks = await loadTasks();
  render();

  // FILTER: ionChange on segment
  $('#filterSegment').addEventListener('ionChange', (e) => {
    filter = e.detail.value;
    render();
  });

  // OPEN MODAL: prepare for create
  $('#open-task-modal').addEventListener('click', () => {
    resetModalToCreate();
  });

  // CLOSE MODAL
  $('#close-task-modal').addEventListener('click', async () => {
    const modal = $('ion-modal');
    await modal.dismiss();
  });

  // SAVE TASK (create/edit)
  $('#save-task').addEventListener('click', async () => {
    const title = ($('#taskTitle').value ?? '').trim();
    const description = ($('#taskDescription').value ?? '').trim();
    const dueIso = $('#taskDueAt').value || null;
    const dueAt = dueIso ? new Date(dueIso).getTime() : null;

    if (!title) {
      const toast = document.createElement('ion-toast');
      toast.message = 'Назва завдання не може бути пустою';
      toast.duration = 1600;
      toast.position = 'top';
      document.body.appendChild(toast);
      await toast.present();
      return;
    }

    if (editingId) {
      const t = tasks.find((x) => x.id === editingId);
      if (t) {
        t.title = title;
        t.description = description;
        t.dueAt = dueAt;
        t.updatedAt = Date.now();
      }
    } else {
      tasks.unshift({
        id: uid(),
        title,
        description,
        dueAt,
        done: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await persist();

    const modal = $('ion-modal');
    await modal.dismiss();

    render();
  });

  // LIST ACTIONS: edit/delete (click)
  $('#tasksList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const task = tasks.find((t) => t.id === id);

    if (action === 'delete') {
      const alert = document.createElement('ion-alert');
      alert.header = 'Видалити завдання?';
      alert.message = 'Цю дію неможливо скасувати.';
      alert.buttons = [
        { text: 'Скасувати', role: 'cancel' },
        {
          text: 'Видалити',
          role: 'destructive',
          handler: async () => {
            tasks = tasks.filter((t) => t.id !== id);
            await persist();
            render();
          },
        },
      ];
      document.body.appendChild(alert);
      await alert.present();
    }

    if (action === 'edit' && task) {
      fillModalForEdit(task);
      const modal = $('ion-modal');
      await modal.present();
    }
  });

  // TOGGLE DONE: ionChange on checkbox
  $('#tasksList').addEventListener('ionChange', async (e) => {
    const cb = e.target.closest('[data-action="toggle"]');
    if (!cb) return;

    const id = cb.dataset.id;
    const t = tasks.find((x) => x.id === id);
    if (!t) return;

    t.done = !!e.detail.checked;
    t.updatedAt = Date.now();

    await persist();
    render();
  });
}

init();
