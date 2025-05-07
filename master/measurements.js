// Global variables
let currentChart = null;
let selectedTaskId = null;

// DOM elements
const addTaskBtn = document.getElementById('add-task-btn');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const saveTaskBtn = document.getElementById('save-task-btn');
const taskList = document.getElementById('task-list');

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load tasks when page loads
    loadTasks();
    
    // Add task button click
    addTaskBtn.addEventListener('click', () => {
        taskForm.style.display = 'block';
        addTaskBtn.style.display = 'none';
    });
    
    // Cancel button click
    cancelBtn.addEventListener('click', () => {
        taskForm.style.display = 'none';
        addTaskBtn.style.display = 'block';
        clearTaskForm();
    });
    
    // Save task button click
    saveTaskBtn.addEventListener('click', saveTask);
});

// Helper functions
function clearTaskForm() {
    document.getElementById('task-name').value = '';
    document.getElementById('oil-quantity').value = '';
    document.getElementById('wavelength-start').value = '';
    document.getElementById('wavelength-end').value = '';
    document.getElementById('wavelength-step').value = '';
}

// API functions
async function loadTasks() {
    try {
        const response = await fetch('http://localhost:8000/api/tasks');
        const tasks = await response.json();
        
        // Clear task list
        taskList.innerHTML = '';
        
        // Render tasks
        tasks.forEach(task => {
            renderTaskItem(task);
        });
        
        // If there are tasks, select the first one
        if (tasks.length > 0) {
            selectTask(tasks[0].task_id);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function saveTask() {
    const taskName = document.getElementById('task-name').value;
    const oilQuantity = document.getElementById('oil-quantity').value;
    const wavelengthStart = document.getElementById('wavelength-start').value;
    const wavelengthEnd = document.getElementById('wavelength-end').value;
    const wavelengthStep = document.getElementById('wavelength-step').value;
    
    // Validate inputs
    if (!taskName || !oilQuantity || !wavelengthStart || !wavelengthEnd || !wavelengthStep) {
        alert('Please fill all fields');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task_name: taskName,
                oil_quantity: parseFloat(oilQuantity),
                wavelength_start: parseInt(wavelengthStart),
                wavelength_end: parseInt(wavelengthEnd),
                wavelength_step: parseInt(wavelengthStep)
            })
        });
        
        if (response.ok) {
            // Hide form and show add button
            taskForm.style.display = 'none';
            addTaskBtn.style.display = 'block';
            
            // Clear form
            clearTaskForm();
            
            // Reload tasks
            loadTasks();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save task');
    }
}

async function toggleTaskStatus(taskId, isActive) {
    try {
        const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_active: !isActive
            })
        });
        
        if (response.ok) {
            // Reload tasks
            loadTasks();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error toggling task status:', error);
        alert('Failed to update task status');
    }
}

async function loadTaskData(taskId) {
    try {
        const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/data`);
        const data = await response.json();
        
        // Update chart
        updateChart(data);
    } catch (error) {
        console.error('Error loading task data:', error);
    }
}

// UI functions
function renderTaskItem(task) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.setAttribute('data-task-id', task.task_id);
    
    const taskDetails = document.createElement('div');
    taskDetails.className = 'task-details';
    
    const taskName = document.createElement('div');
    taskName.className = 'task-name';
    taskName.textContent = task.task_name;
    
    const taskParams = document.createElement('div');
    taskParams.className = 'task-params';
    taskParams.innerHTML = `
        Oil: ${task.oil_quantity}ml<br>
        Wavelength: ${task.wavelength_start}-${task.wavelength_end}nm (step: ${task.wavelength_step}nm)
    `;
    
    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';
    
    const toggleButton = document.createElement('button');
    toggleButton.className = `toggle-button ${task.is_active ? '' : 'inactive'}`;
    toggleButton.textContent = task.is_active ? 'Deactivate' : 'Activate';
    toggleButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent task selection
        toggleTaskStatus(task.task_id, task.is_active);
    });
    
    taskActions.appendChild(toggleButton);
    taskDetails.appendChild(taskName);
    taskDetails.appendChild(taskParams);
    taskItem.appendChild(taskDetails);
    taskItem.appendChild(taskActions);
    
    // Add click event to select task
    taskItem.addEventListener('click', () => {
        selectTask(task.task_id);
    });
    
    taskList.appendChild(taskItem);
}

function selectTask(taskId) {
    // Update selected task
    selectedTaskId = taskId;
    
    // Highlight selected task
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        if (item.getAttribute('data-task-id') == taskId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Load task data
    loadTaskData(taskId);
}

function updateChart(data) {
    // Process data for the chart
    const wavelengths = [...new Set(data.map(item => item.wavelength))];
    const timePoints = [...new Set(data.map(item => item.time_point))];
    
    const datasets = wavelengths.map(wavelength => ({
        label: `${wavelength}nm`,
        data: timePoints.map(time => {
            const point = data.find(d => d.wavelength === wavelength && d.time_point === time);
            return point ? point.absorbance : null;
        }),
        borderWidth: 1,
        fill: false
    }));
    
    // Destroy existing chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Create new chart
    const ctx = document.getElementById('spectroChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timePoints.map(t => `${t} minutes`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Absorbance'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time (minutes)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Spectrophotometer Measurements Over Time'
                },
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 20
                    }
                }
            }
        }
    });
} 