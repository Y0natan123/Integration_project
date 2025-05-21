// Global variables
let currentChart = null;
let spectrumChart = null;
let selectedTaskId = null;
let allDataPoints = [];
let wavelengths = [];
let timePoints = [];

// DOM elements
const addTaskBtn = document.getElementById('add-task-btn');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const saveTaskBtn = document.getElementById('save-task-btn');
const taskList = document.getElementById('task-list');
const viewBtns = document.querySelectorAll('.view-btn');
const viewSections = document.querySelectorAll('.view-section');
const downloadBtn = document.getElementById('download-excel-btn');

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
    
    // View controls
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.getAttribute('data-view');
            switchView(viewName);
        });
    });
    
    // Download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadExcel);
    }
    
    // Legend toggle
    const legendToggle = document.getElementById('legendToggle');
    if (legendToggle) {
        legendToggle.addEventListener('click', (e) => {
            console.log('Legend toggle clicked'); // Debugging log
            e.stopPropagation(); // Prevent event bubbling
            const popup = document.getElementById('wavelengthPopup');
            popup.classList.add('visible');
        });
    }
    
    // Close popup button
    const closePopupBtn = document.getElementById('closePopup');
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            const popup = document.getElementById('wavelengthPopup');
            popup.classList.remove('visible');
        });
    }
    
    // Close the popup when clicking outside of it
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('wavelengthPopup');
        const toggle = document.getElementById('legendToggle');
        if (popup && popup.classList.contains('visible') && 
            !popup.contains(e.target) && 
            e.target !== toggle) {
            popup.classList.remove('visible');
        }
    });
    
    // Select all button
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            if (!currentChart) return;
            
            currentChart.data.datasets.forEach((dataset, index) => {
                currentChart.show(index);
            });
            
            document.querySelectorAll('.legend-item').forEach(item => {
                item.classList.remove('hidden');
            });
            
            currentChart.update();
        });
    }
    
    // Deselect all button
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            if (!currentChart) return;
            
            currentChart.data.datasets.forEach((dataset, index) => {
                currentChart.hide(index);
            });
            
            document.querySelectorAll('.legend-item').forEach(item => {
                item.classList.add('hidden');
            });
            
            currentChart.update();
        });
    }
});

// Helper functions
function clearTaskForm() {
    document.getElementById('task-name').value = '';
    document.getElementById('measurement-interval').value = '';
    document.getElementById('wavelength-start').value = '';
    document.getElementById('wavelength-end').value = '';
    document.getElementById('wavelength-step').value = '';
}

function switchView(viewName) {
    // Update buttons
    viewBtns.forEach(btn => {
        if (btn.getAttribute('data-view') === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update sections
    viewSections.forEach(section => {
        if (section.id === `${viewName}-view`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
}

// Function to generate a color based on wavelength
function getColorForWavelength(wavelength) {
    // Match colors to the specific wavelengths in the image
    if (wavelength === 400) return 'rgb(255, 215, 0)';      // Yellow
    if (wavelength === 440) return 'rgb(144, 238, 144)';    // Light green
    if (wavelength === 480) return 'rgb(50, 205, 50)';      // Green
    if (wavelength === 520) return 'rgb(64, 224, 208)';     // Teal
    if (wavelength === 560) return 'rgb(135, 206, 250)';    // Light blue
    if (wavelength === 600) return 'rgb(106, 90, 205)';     // Blue-purple
    if (wavelength === 640) return 'rgb(147, 112, 219)';    // Purple
    if (wavelength === 680) return 'rgb(255, 182, 193)';    // Pink

    // Fallback for other wavelengths using approximation
    if (wavelength < 440) return 'rgb(255, 215, 0)';      // Yellow-ish
    if (wavelength < 480) return 'rgb(144, 238, 144)';    // Light green
    if (wavelength < 520) return 'rgb(50, 205, 50)';      // Green
    if (wavelength < 560) return 'rgb(64, 224, 208)';     // Teal
    if (wavelength < 600) return 'rgb(135, 206, 250)';    // Light blue
    if (wavelength < 640) return 'rgb(106, 90, 205)';     // Blue-purple
    if (wavelength < 680) return 'rgb(147, 112, 219)';    // Purple
    return 'rgb(255, 182, 193)';                         // Pink
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
    const measurementInterval = document.getElementById('measurement-interval').value;
    const wavelengthStart = document.getElementById('wavelength-start').value;
    const wavelengthEnd = document.getElementById('wavelength-end').value;
    const wavelengthStep = document.getElementById('wavelength-step').value;
    
    // Validate inputs
    if (!taskName || !wavelengthStart || !wavelengthEnd || !wavelengthStep) {
        alert('Please fill all required fields');
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
                measurement_interval: parseInt(measurementInterval) || 60,
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Store data globally
        allDataPoints = data;
        
        // Extract unique wavelengths and time points
        wavelengths = [...new Set(data.map(item => item.wavelength))].sort((a, b) => a - b);
        timePoints = [...new Set(data.map(item => item.time_point))].sort((a, b) => a - b);
        
        // Update charts and tables
        updateCharts(data);
        updateDataTable(data);
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
        Interval: ${task.measurement_interval} minutes<br>
        Wavelength: ${task.wavelength_start}-${task.wavelength_end}nm (step: ${task.wavelength_step}nm)
    `;
    
    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';
    
    const toggleButton = document.createElement('button');
    toggleButton.className = `toggle-button ${task.is_active ? '' : 'inactive'}`;
    toggleButton.textContent = task.is_active ? 'Active' : 'Inactive';
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

function createCustomLegend(chartInstance, wavelengths) {
    const legendItems = document.getElementById('legendItems');
    if (!legendItems) return;
    
    legendItems.innerHTML = '';
    
    wavelengths.forEach(wavelength => {
        const color = getColorForWavelength(wavelength);
        
        const item = document.createElement('div');
        item.className = 'legend-item hidden'; // Add hidden class by default
        item.dataset.wavelength = wavelength;
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;
        
        const text = document.createElement('div');
        text.className = 'legend-text';
        text.textContent = `${wavelength}nm`;
        
        item.appendChild(colorBox);
        item.appendChild(text);
        
        // Add click event to toggle dataset visibility
        item.addEventListener('click', () => {
            toggleDataset(chartInstance, wavelength, item);
        });
        
        legendItems.appendChild(item);
    });
}

function toggleDataset(chartInstance, wavelength, legendItem) {
    const datasetIndex = chartInstance.data.datasets.findIndex(dataset => dataset.label === `${wavelength}nm`);
    
    if (datasetIndex === -1) return;
    
    // Toggle visibility
    const isVisible = chartInstance.isDatasetVisible(datasetIndex);
    if (isVisible) {
        chartInstance.hide(datasetIndex);
        legendItem.classList.add('hidden');
    } else {
        chartInstance.show(datasetIndex);
        legendItem.classList.remove('hidden');
    }
}

function updateCharts(data) {
    // Destroy existing charts if they exist
    if (currentChart) {
        currentChart.destroy();
    }
    if (spectrumChart) {
        spectrumChart.destroy();
    }
    
    // Create Absorbance vs Time chart
    const datasets = wavelengths.map(wavelength => {
        const color = getColorForWavelength(wavelength);
        return {
            label: `${wavelength}nm`,
            data: timePoints.map(time => {
                const point = data.find(d => d.wavelength === wavelength && d.time_point === time);
                return point ? point.absorbance : null;
            }),
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            tension: 0.1,
            hidden: true // Hide all datasets by default
        };
    });
    
    // Main chart (Absorbance vs Time)
    const ctx = document.getElementById('spectroChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timePoints.map(t => `${t} min`),
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
                    text: 'Absorbance vs Time',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Create Spectrum chart (Absorbance vs Wavelength)
    // Only create if we have data
    if (timePoints.length > 0) {
        const spectrumDatasets = timePoints.map((time, index) => {
            return {
                label: `Time ${time} min`,
                data: wavelengths.map(wl => {
                    const point = data.find(d => d.wavelength === wl && d.time_point === time);
                    return point ? point.absorbance : null;
                }),
                borderColor: `hsl(${time * 15 % 360}, 70%, 60%)`,
                backgroundColor: `hsla(${time * 15 % 360}, 70%, 60%, 0.1)`,
                borderWidth: 2,
                pointRadius: 3,
                fill: false,
                tension: 0.1,
                hidden: index > 0 // Only show the first time point by default
            };
        });
        
        const ctxSpectrum = document.getElementById('spectrumChart').getContext('2d');
        spectrumChart = new Chart(ctxSpectrum, {
            type: 'line',
            data: {
                labels: wavelengths.map(wl => `${wl} nm`),
                datasets: spectrumDatasets
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
                            text: 'Wavelength (nm)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Absorbance Spectrum',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Create custom legend
    createCustomLegend(currentChart, wavelengths);
}

function updateDataTable(data) {
    const tableBody = document.getElementById('absorbance-data-body');
    const headerRow = document.getElementById('time-header-row');
    
    if (!tableBody || !headerRow) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Update header with time points
    headerRow.innerHTML = '<th>Wavelength (nm) \ Time (min)</th>';
    timePoints.forEach(time => {
        const th = document.createElement('th');
        th.textContent = `${time} min`;
        headerRow.appendChild(th);
    });
    
    // Create rows for each wavelength
    wavelengths.forEach(wl => {
        const row = document.createElement('tr');
        
        // Add wavelength cell
        const wlCell = document.createElement('td');
        wlCell.textContent = wl;
        wlCell.style.fontWeight = 'bold';
        row.appendChild(wlCell);
        
        // Add data cells for each time point
        timePoints.forEach(time => {
            const cell = document.createElement('td');
            const point = data.find(d => d.wavelength === wl && d.time_point === time);
            cell.textContent = point ? point.absorbance.toFixed(4) : 'N/A';
            row.appendChild(cell);
        });
        
        tableBody.appendChild(row);
    });
}

function downloadExcel() {
    if (!allDataPoints || allDataPoints.length === 0) {
        alert('No data available to download');
        return;
    }
    
    try {
        // Create a workbook with a worksheet
        const wb = XLSX.utils.book_new();
        
        // Create headers
        const headers = ['Wavelength (nm)', ...timePoints.map(t => `Time ${t} min`)];
        
        // Create data rows
        const rows = wavelengths.map(wl => {
            const row = [wl];
            
            timePoints.forEach(time => {
                const point = allDataPoints.find(d => d.wavelength === wl && d.time_point === time);
                row.push(point ? point.absorbance : 'N/A');
            });
            
            return row;
        });
        
        // Combine headers and rows
        const wsData = [headers, ...rows];
        
        // Generate worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Absorbance Data');
        
        // Generate filename
        const taskName = document.querySelector('.task-item.selected .task-name').textContent || 'spectro_data';
        const filename = `${taskName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Trigger download
        XLSX.writeFile(wb, filename);
    } catch (error) {
        console.error('Error generating Excel file:', error);
        alert('Failed to generate Excel file');
    }
} 