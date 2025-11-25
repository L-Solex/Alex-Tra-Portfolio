// Simple reminders manager with sorting, complete, and delete support
let currentSort = { key: null, asc: true };

function getSavedReminders() {
    try {
        return JSON.parse(localStorage.getItem('reminders') || '[]');
    } catch (e) {
        return [];
    }
}

function saveReminders(list) {
    localStorage.setItem('reminders', JSON.stringify(list));
}

function sortRemindersList(list) {
    if (!currentSort.key) return list;
    const sorted = [...list];
    if (currentSort.key === 'date') {
        sorted.sort((a, b) => {
            const ad = a.date || '';
            const bd = b.date || '';
            if (!ad && !bd) return 0;
            if (!ad) return 1;
            if (!bd) return -1;
            return currentSort.asc ? ad.localeCompare(bd) : bd.localeCompare(ad);
        });
    } else if (currentSort.key === 'priority') {
        const order = { high: 0, medium: 1, low: 2, '': 3 };
        sorted.sort((a, b) => {
            const av = order[a.priority || ''] ?? 3;
            const bv = order[b.priority || ''] ?? 3;
            return currentSort.asc ? av - bv : bv - av;
        });
    }
    return sorted;
}

function renderReminders() {
    const tableBody = document.getElementById('reminders-table-body');
    tableBody.innerHTML = '';
    const template = document.getElementById('reminder-row-template');
    const reminders = sortRemindersList(getSavedReminders());

    reminders.forEach((rem, displayIndex) => {
        const rowNode = template.content.firstElementChild.cloneNode(true);

        // Fill cells
        rowNode.querySelector('.cell-text').textContent = rem.text;
        rowNode.querySelector('.cell-date').textContent = rem.date || '';
        rowNode.querySelector('.cell-priority').textContent = rem.priority ? rem.priority.charAt(0).toUpperCase() + rem.priority.slice(1) : '';
        rowNode.querySelector('.cell-notes').textContent = rem.notes || '';

        // Mark completed state via class
        if (rem.completed) rowNode.classList.add('completed');
        else rowNode.classList.remove('completed');

        // Buttons
        const completeBtn = rowNode.querySelector('.btn-complete');
        const editBtn = rowNode.querySelector('.btn-edit');
        const deleteBtn = rowNode.querySelector('.btn-delete');
        const upBtn = rowNode.querySelector('.btn-up');
        const downBtn = rowNode.querySelector('.btn-down');

        completeBtn.textContent = rem.completed ? 'Undo' : 'Complete';

        completeBtn.addEventListener('click', () => toggleComplete(rem.id));
        editBtn.addEventListener('click', () => startEdit(rem.id));
        deleteBtn.addEventListener('click', () => deleteReminder(rem.id));

        // Move up/down operate on the stored array order; disable when at bounds
        const stored = getSavedReminders();
        const storedIndex = stored.findIndex(r => r.id === rem.id);
        upBtn.addEventListener('click', () => { moveUp(rem.id); });
        downBtn.addEventListener('click', () => { moveDown(rem.id); });
        if (storedIndex <= 0) upBtn.disabled = true;
        if (storedIndex === -1 || storedIndex >= stored.length - 1) downBtn.disabled = true;

        tableBody.appendChild(rowNode);
    });
}

function toggleComplete(id) {
    const reminders = getSavedReminders();
    const i = reminders.findIndex(r => r.id === id);
    if (i === -1) return;
    reminders[i].completed = !reminders[i].completed;
    saveReminders(reminders);
    renderReminders();
}

function deleteReminder(id) {
    let reminders = getSavedReminders();
    reminders = reminders.filter(r => r.id !== id);
    saveReminders(reminders);
    renderReminders();
}

function startEdit(id) {
    const reminders = getSavedReminders();
    const i = reminders.findIndex(r => r.id === id);
    if (i === -1) return;
    const rem = reminders[i];
    document.getElementById('new-reminder').value = rem.text || '';
    document.getElementById('reminder-date').value = rem.date || '';
    document.getElementById('reminder-priority').value = rem.priority || '';
    document.getElementById('reminder-notes').value = rem.notes || '';
    // mark editing id and change submit text
    window._editingReminderId = id;
    const form = document.getElementById('reminder-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Changes';
}

function moveUp(id) {
    const reminders = getSavedReminders();
    const idx = reminders.findIndex(r => r.id === id);
    if (idx > 0) {
        const tmp = reminders[idx - 1];
        reminders[idx - 1] = reminders[idx];
        reminders[idx] = tmp;
        saveReminders(reminders);
        // switch to manual order view
        currentSort.key = null;
        updateSortButtons();
        renderReminders();
    }
}

function moveDown(id) {
    const reminders = getSavedReminders();
    const idx = reminders.findIndex(r => r.id === id);
    if (idx !== -1 && idx < reminders.length - 1) {
        const tmp = reminders[idx + 1];
        reminders[idx + 1] = reminders[idx];
        reminders[idx] = tmp;
        saveReminders(reminders);
        currentSort.key = null;
        updateSortButtons();
        renderReminders();
    }
}

function setSort(key) {
    if (currentSort.key === key) {
        currentSort.asc = !currentSort.asc;
    } else {
        currentSort.key = key;
        currentSort.asc = true;
    }
    renderReminders();
    updateSortButtons();
}

function updateSortButtons() {
    const dateBtn = document.getElementById('sort-date-btn');
    const priorityBtn = document.getElementById('sort-priority-btn');
    if (dateBtn) {
        if (currentSort.key === 'date') dateBtn.value = `Sort by Due Date (${currentSort.asc ? 'asc' : 'desc'})`;
        else dateBtn.value = 'Sort by Due Date';
    }
    if (priorityBtn) {
        if (currentSort.key === 'priority') priorityBtn.value = `Sort by Priority (${currentSort.asc ? 'asc' : 'desc'})`;
        else priorityBtn.value = 'Sort by Priority';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reminder-form');
    const sortDateBtn = document.getElementById('sort-date-btn');
    const sortPriorityBtn = document.getElementById('sort-priority-btn');

    if (!form) return;

    // Wire sort buttons
    if (sortDateBtn) sortDateBtn.addEventListener('click', function () { setSort('date'); });
    if (sortPriorityBtn) sortPriorityBtn.addEventListener('click', function () { setSort('priority'); });

    // Render existing reminders
    renderReminders();
    updateSortButtons();

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const reminderText = document.getElementById('new-reminder').value.trim();
        const reminderDate = document.getElementById('reminder-date').value;
        const reminderPriority = document.getElementById('reminder-priority').value;
        const reminderNotes = document.getElementById('reminder-notes').value.trim();

        if (!reminderText) {
            alert('Please enter a reminder.');
            return;
        }

        const newReminder = {
            id: Date.now(),
            text: reminderText,
            date: reminderDate,
            priority: reminderPriority,
            notes: reminderNotes,
            completed: false
        };

        const reminders = getSavedReminders();
        reminders.push(newReminder);
        saveReminders(reminders);

        renderReminders();
        updateSortButtons();

        // Clear inputs
        document.getElementById('new-reminder').value = '';
        document.getElementById('reminder-date').value = '';
        document.getElementById('reminder-priority').value = '';
        document.getElementById('reminder-notes').value = '';
    });
});