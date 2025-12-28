// ------------------ COLORS ------------------
const COLORS = {
    zero: '#ebedf0',
    low: '#fff3b0',
    medium: '#ffe066',
    high: '#8cc665',
    complete: '#216e39'
};

// ------------------ STATE ------------------
let currentViewMonth = new Date().getMonth();
let currentViewYear = new Date().getFullYear();

// ------------------ USER ID ------------------
let userId = localStorage.getItem("userId");
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    localStorage.setItem("userId", userId);
}

// ------------------ HELPER FUNCTIONS ------------------
function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function getStorageKey(year, month) {
    return `consistency-${year}-${month + 1}`;
}

// ------------------ TASKS ------------------
function loadTasks() {
    const local = localStorage.getItem('userTasks');
    return local ? JSON.parse(local) : [];
}

function saveTasks(tasks) {
    localStorage.setItem('userTasks', JSON.stringify(tasks));
    // Firebase background sync
    set(ref(db, 'users/' + userId + '/tasks'), tasks).catch(()=>{});
}

// ------------------ APP TITLE ------------------
function loadAppTitle() {
    const title = localStorage.getItem('appTitle') || 'My Consistency Tracker';
    // Firebase background sync
    get(child(ref(db), 'users/' + userId + '/appTitle')).then(snapshot=>{
        if(snapshot.exists()){
            localStorage.setItem('appTitle', snapshot.val());
            document.getElementById('app-title').textContent = snapshot.val();
        }
    }).catch(()=>{});
    return title;
}

function saveAppTitle(title) {
    localStorage.setItem('appTitle', title);
    set(ref(db, 'users/' + userId + '/appTitle'), title).catch(()=>{});
}

// ------------------ DAILY DATA ------------------
function getTodayData() {
    const todayKey = getTodayKey();
    const monthData = JSON.parse(localStorage.getItem(getStorageKey(new Date().getFullYear(), new Date().getMonth()))) || {};
    return monthData[todayKey] || { completed: [] };
}

function saveTodayData(data) {
    const todayKey = getTodayKey();
    const monthData = JSON.parse(localStorage.getItem(getStorageKey(new Date().getFullYear(), new Date().getMonth()))) || {};
    monthData[todayKey] = data;
    localStorage.setItem(getStorageKey(new Date().getFullYear(), new Date().getMonth()), JSON.stringify(monthData));
    set(ref(db, 'users/' + userId + '/daily/' + todayKey), data).catch(()=>{});
}

// ------------------ COLOR HELPER ------------------
function getColor(percentage) {
    if (percentage === 0) return COLORS.zero;
    if (percentage <= 25) return COLORS.low;
    if (percentage <= 50) return COLORS.medium;
    if (percentage < 100) return COLORS.high;
    return COLORS.complete;
}

// ------------------ RENDER DATE ------------------
function renderDate() {
    const today = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const day = today.getDate().toString().padStart(2,'0');
    const month = (today.getMonth()+1).toString().padStart(2,'0');
    const year = today.getFullYear();
    document.getElementById('current-date').textContent = `${days[today.getDay()]}, ${day}/${month}/${year}`;
}

// ------------------ RENDER APP TITLE ------------------
function renderAppTitle() {
    const titleEl = document.getElementById('app-title');
    titleEl.textContent = loadAppTitle();

    titleEl.addEventListener('blur', function () {
        const newTitle = titleEl.textContent.trim() || 'My Consistency Tracker';
        titleEl.textContent = newTitle;
        saveAppTitle(newTitle);
    });

    titleEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleEl.blur();
        }
    });
}

// ------------------ RENDER TASKS ------------------
function renderTasks() {
    const tasks = loadTasks();
    const todayData = getTodayData();
    const taskList = document.getElementById('task-list');

    if (tasks.length === 0) {
        taskList.innerHTML = '<li class="empty-tasks-message">No tasks yet. Add your first task above!</li>';
        updateCompletedCount();
        return;
    }

    taskList.innerHTML = tasks.map(task => {
        const isCompleted = todayData.completed.includes(task.id);
        return `<li class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
            <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
            <span class="task-text">${task.name}</span>
            <button class="delete-task-btn" title="Delete task">&times;</button>
        </li>`;
    }).join('');

    document.querySelectorAll('.task-checkbox').forEach(cb => {
        cb.addEventListener('change', function () {
            toggleTask(this.closest('.task-item').dataset.id);
        });
    });

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            deleteTask(this.closest('.task-item').dataset.id);
        });
    });

    updateCompletedCount();

    // Firebase background sync
    get(child(ref(db), 'users/' + userId + '/tasks')).then(snapshot=>{
        if(snapshot.exists()){
            localStorage.setItem('userTasks', JSON.stringify(snapshot.val()));
            renderTasks();
        }
    }).catch(()=>{});
}

// ------------------ TASK ACTIONS ------------------
function addTask(name) {
    const tasks = loadTasks();
    const newTask = { id: Date.now().toString(), name: name.trim() };
    tasks.push(newTask);
    saveTasks(tasks);
    renderTasks();
    renderCalendar();
}

function deleteTask(taskId) {
    let tasks = loadTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks(tasks);
    renderTasks();
    renderCalendar();
}

function toggleTask(taskId) {
    const todayData = getTodayData();
    const index = todayData.completed.indexOf(taskId);
    if (index === -1) todayData.completed.push(taskId);
    else todayData.completed.splice(index, 1);

    saveTodayData(todayData);
    renderTasks();
    renderCalendar();
}

// ------------------ COMPLETION COUNT ------------------
function updateCompletedCount() {
    const tasks = loadTasks();
    const todayData = getTodayData();
    const validCompleted = todayData.completed.filter(id => tasks.some(t => t.id === id));
    document.getElementById('completed-count').textContent = validCompleted.length;
    document.getElementById('total-count').textContent = tasks.length;
}

// ------------------ CALENDAR ------------------
function renderCalendar() {
    const monthData = JSON.parse(localStorage.getItem(getStorageKey(currentViewYear, currentViewMonth))) || {};
    const tasks = loadTasks();
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    calendarTitle.textContent = `${monthNames[currentViewMonth]} ${currentViewYear}`;

    const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = currentViewMonth === today.getMonth() && currentViewYear === today.getFullYear();

    let html = '';
    for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';

    for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `${currentViewYear}-${currentViewMonth + 1}-${day}`;
        const dayData = monthData[dayKey] || { completed: [] };
        let percentage = 0;
        if (tasks.length > 0) {
            const validCompleted = dayData.completed.filter(id => tasks.some(t => t.id === id));
            percentage = (validCompleted.length / tasks.length) * 100;
        }
        const color = getColor(percentage);
        const isToday = isCurrentMonth && day === today.getDate();
        html += `<div class="calendar-day ${isToday ? 'today' : ''}" style="background: ${color};">${day}</div>`;
    }

    calendarGrid.innerHTML = html;
}

// ------------------ SETUP ------------------
function setupAddTask() {
    const input = document.getElementById('new-task-input');
    const btn = document.getElementById('add-task-btn');

    btn.addEventListener('click', function () {
        const name = input.value.trim();
        if (name) { addTask(name); input.value = ''; }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const name = input.value.trim();
            if (name) { addTask(name); input.value = ''; }
        }
    });
}

function setupMonthNavigation() {
    document.getElementById('prev-month-btn').addEventListener('click', function () {
        currentViewMonth--;
        if (currentViewMonth < 0) { currentViewMonth = 11; currentViewYear--; }
        renderCalendar();
    });
    document.getElementById('next-month-btn').addEventListener('click', function () {
        currentViewMonth++;
        if (currentViewMonth > 11) { currentViewMonth = 0; currentViewYear++; }
        renderCalendar();
    });
}

// ------------------ INIT ------------------
function init() {
    renderAppTitle();
    renderDate();
    renderTasks();
    renderCalendar();
    setupAddTask();
    setupMonthNavigation();
}

init();
