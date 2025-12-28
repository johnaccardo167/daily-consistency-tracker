const COLORS = {
    zero: '#ebedf0',
    low: '#fff3b0',
    medium: '#ffe066',
    high: '#8cc665',
    complete: '#216e39'
};

let currentViewMonth = new Date().getMonth();
let currentViewYear = new Date().getFullYear();

function loadTasks() {
    const stored = localStorage.getItem('userTasks');
    return stored ? JSON.parse(stored) : [];
}

function saveTasks(tasks) {
    localStorage.setItem('userTasks', JSON.stringify(tasks));
}

function loadAppTitle() {
    return localStorage.getItem('appTitle') || 'My Consistency Tracker';
}

function saveAppTitle(title) {
    localStorage.setItem('appTitle', title);
}

function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function getStorageKey(year, month) {
    return `consistency-${year}-${month + 1}`;
}

function loadMonthData(year, month) {
    const key = getStorageKey(year, month);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
}

function saveMonthData(year, month, data) {
    const key = getStorageKey(year, month);
    localStorage.setItem(key, JSON.stringify(data));
}

function getTodayData() {
    const today = new Date();
    const monthData = loadMonthData(today.getFullYear(), today.getMonth());
    return monthData[getTodayKey()] || { completed: [] };
}

function saveTodayData(data) {
    const today = new Date();
    const monthData = loadMonthData(today.getFullYear(), today.getMonth());
    monthData[getTodayKey()] = data;
    saveMonthData(today.getFullYear(), today.getMonth(), monthData);
}

function getColor(percentage) {
    if (percentage === 0) return COLORS.zero;
    if (percentage <= 25) return COLORS.low;
    if (percentage <= 50) return COLORS.medium;
    if (percentage < 100) return COLORS.high;
    return COLORS.complete;
}

function formatDate() {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    return `${days[today.getDay()]}, ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

function renderDate() {
    document.getElementById('current-date').textContent = formatDate();
}

function renderAppTitle() {
    const titleEl = document.getElementById('app-title');
    titleEl.textContent = loadAppTitle();
    
    titleEl.addEventListener('blur', function() {
        const newTitle = titleEl.textContent.trim() || 'My Consistency Tracker';
        titleEl.textContent = newTitle;
        saveAppTitle(newTitle);
    });
    
    titleEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleEl.blur();
        }
    });
}

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
        return `
            <li class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
                <span class="task-text">${task.name}</span>
                <button class="delete-task-btn" title="Delete task">&times;</button>
            </li>
        `;
    }).join('');
    
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.closest('.task-item').dataset.id;
            toggleTask(taskId);
        });
    });
    
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskId = this.closest('.task-item').dataset.id;
            deleteTask(taskId);
        });
    });
    
    updateCompletedCount();
}

function addTask(name) {
    const tasks = loadTasks();
    const newTask = {
        id: Date.now().toString(),
        name: name.trim()
    };
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
    
    if (index === -1) {
        todayData.completed.push(taskId);
    } else {
        todayData.completed.splice(index, 1);
    }
    
    saveTodayData(todayData);
    renderTasks();
    renderCalendar();
}

function updateCompletedCount() {
    const tasks = loadTasks();
    const todayData = getTodayData();
    const validCompleted = todayData.completed.filter(id => tasks.some(t => t.id === id));
    document.getElementById('completed-count').textContent = validCompleted.length;
    document.getElementById('total-count').textContent = tasks.length;
}

function renderCalendar() {
    const tasks = loadTasks();
    const monthData = loadMonthData(currentViewYear, currentViewMonth);
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    calendarTitle.textContent = `${monthNames[currentViewMonth]} ${currentViewYear}`;
    
    const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    
    const today = new Date();
    const isCurrentMonth = currentViewMonth === today.getMonth() && currentViewYear === today.getFullYear();
    
    let html = '';
    
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
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

function setupAddTask() {
    const input = document.getElementById('new-task-input');
    const btn = document.getElementById('add-task-btn');
    
    btn.addEventListener('click', function() {
        const name = input.value.trim();
        if (name) {
            addTask(name);
            input.value = '';
        }
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const name = input.value.trim();
            if (name) {
                addTask(name);
                input.value = '';
            }
        }
    });
}

function setupMonthNavigation() {
    document.getElementById('prev-month-btn').addEventListener('click', function() {
        currentViewMonth--;
        if (currentViewMonth < 0) {
            currentViewMonth = 11;
            currentViewYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('next-month-btn').addEventListener('click', function() {
        currentViewMonth++;
        if (currentViewMonth > 11) {
            currentViewMonth = 0;
            currentViewYear++;
        }
        renderCalendar();
    });
}

function init() {
    renderAppTitle();
    renderDate();
    renderTasks();
    renderCalendar();
    setupAddTask();
    setupMonthNavigation();
}

init();
