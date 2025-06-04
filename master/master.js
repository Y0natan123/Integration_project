const homefun =  document.querySelector('.home');
const Admin = document.querySelector('.privet');
const tabelAdmin = document.querySelector('.createTableData');
const spectroGraph = document.querySelector('.spectro-graph');
const notesLink = document.querySelector('.notes-link');

const navbarplaceholder = document.querySelector('#navbar-placeholder');

loged = false;
isAdmain = false;

// Function to determine the correct API URL based on the current environment
function getServerUrl() {
    const currentUrl = window.location.href;
    console.log('Current URL:', currentUrl);
    
    // If running through ngrok or another domain
    if (!currentUrl.includes('localhost')) {
        // Extract the correct protocol and host
        const urlParts = currentUrl.split('/');
        const protocol = urlParts[0];
        const host = urlParts[2];
        
        console.log('Running on external domain:', host);
        
        // For all external access, use the same origin to avoid CORS issues
        // This will ensure API requests go to the same server that served the page
        return `${protocol}//${host}`;
    }
    
    // Default to localhost
    console.log('Running on localhost, using default server URL');
    return 'http://localhost:8000';
}

// Store server URL for use throughout the code
const SERVER_URL = getServerUrl();

// Global task tracking for emergency status fixes
window.deactivatedTasks = {};
window.attemptedDeactivation = {};

// Track when we deactivate a task to fix UI inconsistencies
function trackDeactivation(taskId) {
    console.log(`Tracking deactivation of task ${taskId}`);
    window.deactivatedTasks = window.deactivatedTasks || {};
    window.attemptedDeactivation = window.attemptedDeactivation || {};
    
    window.deactivatedTasks[taskId] = {
        time: Date.now(),
        attempts: (window.deactivatedTasks[taskId]?.attempts || 0) + 1
    };
    window.attemptedDeactivation[taskId] = true;
}

// Global variables for task status tracking
const taskCheckTimers = {};

// Global start/stop task status check functions
function startTaskStatusCheck(taskId, taskElement) {
    // Add status indicator to the task item
    let statusIndicator = taskElement.querySelector('.status-indicator');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        statusIndicator.innerHTML = '<span class="pulse"></span> Checking...';
        if (taskElement.querySelector('.task-details')) {
            taskElement.querySelector('.task-details').appendChild(statusIndicator);
        } else {
            taskElement.appendChild(statusIndicator);
        }
    }
    
    // Clear existing timer if any
    if (taskCheckTimers[taskId]) {
        clearInterval(taskCheckTimers[taskId]);
    }
    
    // Check immediately
    checkTaskStatusGlobal(taskId, statusIndicator);
    
    // Set up new timer to check every 30 seconds
    taskCheckTimers[taskId] = setInterval(() => {
        checkTaskStatusGlobal(taskId, statusIndicator);
    }, 30000);
}

function stopTaskStatusCheck(taskId) {
    if (taskCheckTimers[taskId]) {
        clearInterval(taskCheckTimers[taskId]);
        delete taskCheckTimers[taskId];
    }
    
    // Find and update the status indicator
    const taskItems = document.querySelectorAll(`.task-item[data-task-id="${taskId}"]`);
    taskItems.forEach(item => {
        const statusIndicator = item.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive';
        }
    });
}

async function checkTaskStatusGlobal(taskId, statusIndicator) {
    try {
        // Simple version - just check if task is running
        const isRunning = await isTaskRunning(taskId);
        
        if (isRunning) {
            statusIndicator.innerHTML = '<span class="pulse active"></span> Active';
        } else {
            statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive';
        }
    } catch (error) {
        console.error(`Error checking task ${taskId} status:`, error);
        statusIndicator.innerHTML = `<span class="pulse error"></span> Error: ${error.message || 'Unknown error'}`;
    }
}

const wrapper = document.querySelector('.wrapper');
const loginlink = document.querySelector('.login-link');
const registerlink = document.querySelector('.register-link');
const btnPopup = document.querySelector('.button');
const logedB = document.querySelector('.loged');
let logedName = document.querySelector('.name'); // Changed to 'let' to allow reassignment
const admainP = document.querySelector('.privet');

const iconclose = document.querySelector('.icon-close');


const REmail = document.getElementById('lemail');
const LEmail = document.getElementById('remail');
const RPassword = document.getElementById('lpassword');
const LPassword = document.getElementById('rpassword');
const btnRegister = document.querySelector('.btnRegister');
const btnlogin = document.querySelector('.btnLogin');

const formboxlogin = document.querySelector('.login');
const formboxRegister = document.querySelector('.register');


registerlink.addEventListener('click', () => {
    wrapper.classList.add('active');
})

loginlink.addEventListener('click', () => {
    wrapper.classList.remove('active');
});

btnPopup.addEventListener('click', () => {
    wrapper.classList.add('active-popup');

});

iconclose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
});

src="https://code.jquery.com/jquery-3.6.0.min.js"

homefun.addEventListener('click', () => {
    // Clean up admin page if coming from it
    if (window.adminFunctions && window.adminFunctions.cleanupAdminPage) {
        window.adminFunctions.cleanupAdminPage();
    }
    $("#navbar-placeholder").load( "home.html");
});

Admin.addEventListener('click', () => {
    $("#navbar-placeholder").load( "Admain.html");
    createTableData();
});

spectroGraph.addEventListener('click', () => {
    // Clean up admin page if coming from it
    if (window.adminFunctions && window.adminFunctions.cleanupAdminPage) {
        window.adminFunctions.cleanupAdminPage();
    }
    
    // Check if user is logged in (using both cookies and localStorage)
    const sessionId = getCookie('sessionId');
    const userEmailFromCookie = getCookie('userEmail');
    const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
    const userEmailFromStorage = localStorage.getItem('userEmail');
    
    // User is logged in if either cookie or localStorage has valid data
    const isLoggedIn = (sessionId && userEmailFromCookie) || (isLoggedInFromStorage && userEmailFromStorage);
    
    if (!isLoggedIn) {
        alert("Please log in to access the Measurements page");
        wrapper.classList.add('active-popup'); // Show login popup
        return;
    }
    
    $("#navbar-placeholder").load("measurements.html", function() {
        // Initialize Measurements functionality after content is loaded
        initializeMeasurements();
        setupViewTabs();
        
        // Explicitly check all task statuses after loading
        console.log("Measurements page loaded, checking all task statuses from server");
        setTimeout(checkAllTasksOnPageLoad, 1000);
    });
});

notesLink.addEventListener('click', () => {
    // Clean up admin page if coming from it
    if (window.adminFunctions && window.adminFunctions.cleanupAdminPage) {
        window.adminFunctions.cleanupAdminPage();
    }
    
    // Check if user is logged in (using both cookies and localStorage)
    const sessionId = getCookie('sessionId');
    const userEmailFromCookie = getCookie('userEmail');
    const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
    const userEmailFromStorage = localStorage.getItem('userEmail');
    
    // User is logged in if either cookie or localStorage has valid data
    const isLoggedIn = (sessionId && userEmailFromCookie) || (isLoggedInFromStorage && userEmailFromStorage);
    
    if (!isLoggedIn) {
        alert("Please log in to access the Notes page");
        wrapper.classList.add('active-popup'); // Show login popup
        return;
    }
    
    $("#navbar-placeholder").load("notes.html", function() {
        // Notes functionality is initialized within notes.html
        console.log('Notes page loaded');
    });
});

// Function to initialize the measurements functionality
function initializeMeasurements() {
    // Get DOM elements from the loaded content
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskForm = document.getElementById('task-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const taskList = document.getElementById('task-list');
    
    // Global variables for measurements
    let currentChart = null;
    let selectedTaskId = null;
    
    // Load tasks when initialized and check status immediately after loading
    loadTasks().then(() => {
        console.log("Tasks loaded, now checking statuses with server");
        // Check status of all loaded tasks
        const taskItems = document.querySelectorAll('.task-item');
        
        if (taskItems.length > 0) {
            console.log(`Loaded ${taskItems.length} tasks - setting up status checking`);
            
            // First update each task's state individually
            taskItems.forEach(taskItem => {
                const taskId = taskItem.getAttribute('data-task-id');
                if (taskId) {
                    updateTaskRunningState(taskItem);
                }
            });
            
            // Then start the regular refresh mechanism
            console.log("Starting regular status refresh mechanism");
            scheduleRegularStatusRefreshes();
        } else {
            console.log("No tasks found to monitor");
        }
    });

    // Set up download Excel button
    const downloadExcelBtn = document.getElementById('download-excel-btn');
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', function() {
            if (selectedTaskId) {
                downloadExcelFile(selectedTaskId);
            } else {
                alert("Please select a task first");
            }
        });
    }
    
    // Function to download measurement data as Excel file
    async function downloadExcelFile(taskId) {
        try {
            // Get task info for naming
            const taskResponse = await fetch(`http://localhost:8000/api/tasks/${taskId}/status`);
            const taskInfo = await taskResponse.json();
            
            // Fetch data
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/data`);
            const data = await response.json();
            
            if (!data || data.length === 0) {
                alert('No data available for this task');
                return;
            }
            
            // Process data for Excel export
            const wavelengths = [...new Set(data.map(item => item.wavelength))].sort((a, b) => a - b);
            const timePoints = [...new Set(data.map(item => item.time_point))].sort((a, b) => a - b);
            const interval = taskInfo.measurement_interval || 1;
            
            // Create Excel workbook
            const wb = XLSX.utils.book_new();
                
            // Create the header row with time points (in actual minutes)
            const header = ['Wavelength (nm)'];
            timePoints.forEach(t => {
                header.push(`${t * interval} min`);
            });
            
            // Create rows for each wavelength
            const rows = [];
            rows.push(header);
            
            wavelengths.forEach(wavelength => {
                const row = [wavelength];
                timePoints.forEach(time => {
                    const point = data.find(d => d.wavelength === wavelength && d.time_point === time);
                    row.push(point ? point.absorbance : null);
                });
                rows.push(row);
            });
            
            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(rows);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Absorbance Data');
            
            // Generate filename from task info
            const fileName = `absorbance_data_${taskInfo.name || taskId}_${new Date().toISOString().slice(0,10)}.xlsx`;
            
            // Write and download workbook
            XLSX.writeFile(wb, fileName);
            
            console.log(`Excel file downloaded: ${fileName}`);
        } catch (error) {
            console.error('Error generating Excel file:', error);
            alert('Failed to generate Excel file');
        }
    }
    
    // Add task button click
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            taskForm.style.display = 'block';
            addTaskBtn.style.display = 'none';
        });
    }
    
    // Cancel button click
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            taskForm.style.display = 'none';
            addTaskBtn.style.display = 'block';
            clearTaskForm();
        });
    }
    
    // Save task button click
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', saveTask);
    }

    // Wavelength popup event listeners (same as measurements.js)
    // Legend toggle
    const legendToggle = document.getElementById('legendToggle');
    if (legendToggle) {
        legendToggle.addEventListener('click', (e) => {
            console.log('Legend toggle clicked'); // Debugging log
            e.stopPropagation(); // Prevent event bubbling
            const popup = document.getElementById('wavelengthPopup');
            if (popup) {
                popup.classList.add('visible');
            }
        });
    }
    
    // Close popup button
    const closePopupBtn = document.getElementById('closePopup');
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            const popup = document.getElementById('wavelengthPopup');
            if (popup) {
                popup.classList.remove('visible');
            }
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

    // Helper functions
    function clearTaskForm() {
        document.getElementById('task-name').value = '';
        document.getElementById('measurement-interval').value = '';
        document.getElementById('wavelength-start').value = '';
        document.getElementById('wavelength-end').value = '';
        document.getElementById('wavelength-step').value = '';
    }

    // API functions
    async function loadTasks() {
        try {
            const response = await fetch(`${SERVER_URL}/api/tasks`);
            const tasks = await response.json();
            
            // Clear task list
            if (taskList) {
                taskList.innerHTML = '';
                
                // Render tasks
                tasks.forEach(task => {
                    renderTaskItem(task);
                });
                
                // If there are tasks, select the first one
                if (tasks.length > 0) {
                    selectTask(tasks[0].task_id);
                }
            }
            return tasks; // Return the tasks so the promise resolves with them
        } catch (error) {
            console.error('Error loading tasks:', error);
            return []; // Return empty array in case of error
        }
    }

    async function saveTask() {
        const taskName = document.getElementById('task-name').value;
        const measurementInterval = document.getElementById('measurement-interval').value;
        const wavelengthStart = document.getElementById('wavelength-start').value;
        const wavelengthEnd = document.getElementById('wavelength-end').value;
        const wavelengthStep = document.getElementById('wavelength-step').value;
        
        // Validate inputs
        if (!taskName || !measurementInterval || !wavelengthStart || !wavelengthEnd || !wavelengthStep) {
            alert('Please fill all fields');
            return;
        }
        
        try {
            const response = await fetch(`${SERVER_URL}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: taskName,
                    measurement_interval: parseFloat(measurementInterval),
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
                alert(`Error: ${errorData.error || 'Failed to save task'}`);
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Failed to save task');
        }
    }

    // Modify the toggleTaskStatus function to update the UI
    async function toggleTaskStatus(taskId, isActive) {
        try {
            console.log(`Toggling task ${taskId} status from ${isActive ? 'active' : 'inactive'} to ${!isActive ? 'active' : 'inactive'}`);
            
            // Show a visual indication that something is happening
            const taskItems = document.querySelectorAll('.task-item');
            taskItems.forEach(item => {
                if (item.getAttribute('data-task-id') == taskId) {
                    const toggleButton = item.querySelector('.toggle-button');
                    if (toggleButton) {
                        toggleButton.disabled = true;
                        toggleButton.style.opacity = '0.5';
                        toggleButton.textContent = 'Updating...';
                    }
                }
            });
            
            let response;
            let result;
            
            // Choose endpoint based on current state
            // If currently active, deactivate it
            // If currently inactive, activate it
            const endpoint = isActive 
                ? `/api/tasks/${taskId}/deactivate` 
                : `/api/tasks/${taskId}/activate`;
            
            console.log(`Sending request to ${endpoint} (current state: ${isActive ? 'active' : 'inactive'})`);
            
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    }
            });
                
                console.log(`Response status from ${endpoint}: ${response.status}`);
            
            // Get the response as text first
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            try {
                // Then try to parse it as JSON
                result = JSON.parse(responseText);
                console.log('Parsed result:', result);
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    throw new Error(`Invalid server response: ${responseText}`);
                }
            } catch (error) {
                console.error(`Error with ${endpoint}:`, error);
                
                // Fallback to using the toggle endpoint
                console.log(`Falling back to toggle endpoint`);
                
                response = await fetch(`/api/tasks/${taskId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_active: !isActive })
                });
                
                console.log(`Response status from toggle: ${response.status}`);
                
                // Get the response as text
                const responseText = await response.text();
                console.log('Response text:', responseText);
                
                try {
                    // Parse as JSON
                    result = JSON.parse(responseText);
                    console.log('Parsed result:', result);
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                throw new Error(`Invalid server response: ${responseText}`);
                }
            }
            
            if (response.ok) {
                console.log(`Task ${taskId} toggle success`);
                
                // Make sure we have the new state from the server
                const newState = result.is_active;
                
                console.log(`New task state from server: ${newState ? 'active' : 'inactive'}`);
                
                // Update UI for all matches of this task
                document.querySelectorAll('.task-item').forEach(item => {
                    if (item.getAttribute('data-task-id') == taskId) {
                        // Get the toggle button
                        const toggleButton = item.querySelector('.toggle-button');
                        
                        // Reset button appearance
                        if (toggleButton) {
                            toggleButton.disabled = false;
                            toggleButton.style.opacity = '1';
                        
                            if (newState) {
                                toggleButton.textContent = 'Deactivate';
                                toggleButton.classList.remove('inactive');
                                startTaskStatusCheck(taskId, item);
                            } else {
                                toggleButton.textContent = 'Activate';
                                toggleButton.classList.add('inactive');
                                stopTaskStatusCheck(taskId);
                            }
                        }
                        
                        // Update the item's active state
                        item.setAttribute('data-active', newState ? 'true' : 'false');
                    }
                });
                
                // After toggling, explicitly refresh all statuses
                setTimeout(() => {
                    refreshAllTaskStatuses();
                }, 1000);
                
                // Optionally reload task data if needed
                if (selectedTaskId === taskId) {
                    loadTaskData(taskId);
                }
            } else {
                console.error('Server returned error:', result);
                alert(`Error: ${result.error || 'Failed to update task status'}`);
                
                // Reset buttons to original state
                document.querySelectorAll('.task-item').forEach(item => {
                    if (item.getAttribute('data-task-id') == taskId) {
                        const toggleButton = item.querySelector('.toggle-button');
                        if (toggleButton) {
                            toggleButton.disabled = false;
                            toggleButton.style.opacity = '1';
                            toggleButton.textContent = isActive ? 'Deactivate' : 'Activate';
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error toggling task status:', error);
            alert(`Failed to update task status: ${error.message}`);
            
            // Reset buttons to original state in case of error
            document.querySelectorAll('.task-item').forEach(item => {
                if (item.getAttribute('data-task-id') == taskId) {
                    const toggleButton = item.querySelector('.toggle-button');
                    if (toggleButton) {
                        toggleButton.disabled = false;
                        toggleButton.style.opacity = '1';
                        toggleButton.textContent = isActive ? 'Deactivate' : 'Activate';
                    }
                }
            });
        }
    }

    // Helper to format time ago
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    // Modify the renderTaskItem function to display task names properly
    function renderTaskItem(task) {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.setAttribute('data-task-id', task.task_id);
        
        // We'll set the active state after checking with the server
        taskItem.setAttribute('data-active', 'checking');
        
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        
        // Extract original task name from the task_id which contains the filename
        let displayName = task.task_name;
        if (!displayName && task.task_id) {
            // Try to extract name from task_id (which is the filename without extension)
            const parts = task.task_id.split('_');
            if (parts.length > 2) {
                // Skip "task_" prefix and extract name parts
                let nameEndIndex = parts.findIndex(part => part.includes('T') && part.length > 10);
                if (nameEndIndex > 1) {
                    displayName = parts.slice(1, nameEndIndex).join(' ');
                    // Capitalize each word
                    displayName = displayName.split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                }
            }
        }
        
        const taskName = document.createElement('div');
        taskName.className = 'task-name';
        taskName.textContent = displayName || 'Unnamed Task';
        
        const taskParams = document.createElement('div');
        taskParams.className = 'task-params';
        taskParams.innerHTML = `
            Interval: ${task.measurement_interval} minutes<br>
            Wavelength: ${task.wavelength_start}-${task.wavelength_end}nm (step: ${task.wavelength_step}nm)
        `;
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        // Create activation button - completely new implementation
        const activateButton = document.createElement('button');
        activateButton.className = 'activate-button';
        activateButton.textContent = 'Checking...';
        activateButton.disabled = true;
        
        // Simple direct click handler
        activateButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent task selection
            
            // Disable button while processing
            activateButton.disabled = true;
            activateButton.textContent = 'Processing...';
            
            try {
                // Always check current status from server first
                const isCurrentlyActive = await isTaskRunning(task.task_id);
                console.log(`Button clicked for task ${task.task_id} - Current state: ${isCurrentlyActive ? 'RUNNING' : 'NOT RUNNING'}`);
                
                // Choose the correct endpoint based on current state
                const endpoint = isCurrentlyActive 
                    ? `/api/tasks/${task.task_id}/deactivate` 
                    : `/api/tasks/${task.task_id}/activate`;
                    
                console.log(`Sending request to ${endpoint}`);
                
                const isDeactivation = isCurrentlyActive;
                
                // Track deactivation attempt if we're trying to deactivate
                if (isDeactivation) {
                    console.log(`Tracking deactivation attempt for task ${task.task_id}`);
                    trackDeactivation(task.task_id);
                    
                    // Immediately force UI to show deactivated
                    console.log(`Immediately forcing UI to show inactive state for task ${task.task_id}`);
                    activateButton.textContent = 'Activate';
                    activateButton.classList.add('inactive');
                    taskItem.setAttribute('data-active', 'false');
                    
                    // Also manually remove from any timers
                    if (taskCheckTimers[task.task_id]) {
                        console.log(`Manually clearing timer for task ${task.task_id}`);
                        clearInterval(taskCheckTimers[task.task_id]);
                        delete taskCheckTimers[task.task_id];
                    }
                }
                
                // Make the request with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                try {
                    // Try with a clear content-type header to avoid response issues
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache, no-store, must-revalidate'
                        },
                        signal: controller.signal
                    }).finally(() => clearTimeout(timeoutId));
                    
                    console.log(`Response status: ${response.status}`);
                    
                    if (!response.ok) {
                        // Get the error response as text
                        const errorText = await response.text();
                        console.error(`Error response: ${errorText}`);
                        
                        // Try to parse if it looks like JSON
                        if (errorText.trim().startsWith('{')) {
                            try {
                                const errorJson = JSON.parse(errorText);
                                throw new Error(errorJson.error || `Server error: ${response.status}`);
                            } catch (parseError) {
                                throw new Error(`Server error: ${response.status} ${errorText.substring(0, 50)}`);
                            }
                        } else {
                            throw new Error(`Server error: ${response.status} ${errorText.substring(0, 50)}`);
                        }
                    }
                    
                    // Get the response text first to check if valid JSON
                    const responseText = await response.text();
                    let result;
                    
                    try {
                        // Try to parse the JSON
                        result = JSON.parse(responseText);
                        console.log('Response data:', result);
                    } catch (jsonError) {
                        console.error('Invalid JSON response:', responseText);
                        // If successful status but invalid JSON, still continue
                        if (response.ok) {
                            result = { success: true };
                        } else {
                            throw new Error(`Invalid server response: ${responseText.substring(0, 50)}`);
                        }
                    }
                    
                    // For deactivation, be more aggressive with checking the status
                    if (isDeactivation) {
                        console.log(`Deactivation request sent for task ${task.task_id} - extra verification needed`);
                        
                        // Schedule multiple checks to ensure deactivation took effect
                        const verifyDeactivation = async () => {
                            console.log(`Verifying deactivation of task ${task.task_id}`);
                            
                            // Track this verification attempt
                            trackDeactivation(task.task_id);
                            
                            // Always force UI to inactive state - this is safer than server state
                            console.log(`Forcing UI to show inactive state for task ${task.task_id}`);
                            activateButton.textContent = 'Activate';
                            activateButton.classList.add('inactive');
                            taskItem.setAttribute('data-active', 'false');
                            
                            // Clear any timers to be extra safe
                            if (taskCheckTimers[task.task_id]) {
                                console.log(`Clearing timer for task ${task.task_id}`);
                                clearInterval(taskCheckTimers[task.task_id]);
                                delete taskCheckTimers[task.task_id];
                            }
                            
                            // Now check the actual server state
                            const isStillRunning = await isTaskRunning(task.task_id);
                            
                            if (isStillRunning) {
                                console.warn(`Task ${task.task_id} still reported as running after deactivation!`);
                                
                                // Try to deactivate again
                                console.log(`Attempting to deactivate task ${task.task_id} again`);
                                try {
                                    await fetch(`/api/tasks/${task.task_id}/deactivate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' }
                                    });
                                } catch (err) {
                                    console.error(`Error in retry deactivation for task ${task.task_id}:`, err);
                                }
                            } else {
                                console.log(`Verified task ${task.task_id} is now inactive`);
                            }
                        };
                        
                        // Check multiple times with increasing delays
                        setTimeout(verifyDeactivation, 2000);
                        setTimeout(verifyDeactivation, 5000);
                        setTimeout(verifyDeactivation, 10000);
                    }
                    
                    // Update the task state after a short delay
                    setTimeout(async () => {
                        console.log(`Task ${task.task_id} status changed - forcing status refresh`);
                        // First try to check just this task
                        await updateTaskRunningState(taskItem);
                        
                        // Then after a slightly longer delay, force refresh all tasks
                        // This helps catch any side effects or server state changes
                        setTimeout(() => {
                            forceRefreshAllTaskStatuses();
                        }, 2000);
                    }, 1000);
                    
                } catch (fetchError) {
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Request timed out. The server may be busy.');
                    }
                    throw fetchError;
                }
                
            } catch (error) {
                console.error('Error toggling task state:', error);
                alert(`Error: ${error.message}`);
                
                // Restore button state based on actual current state
                await updateTaskRunningState(taskItem);
            } finally {
                // Re-enable button
                activateButton.disabled = false;
                
                // Set button text based on the current state
                const currentState = await isTaskRunning(task.task_id);
                activateButton.textContent = currentState ? 'Deactivate' : 'Activate';
                activateButton.classList.toggle('inactive', !currentState);
            }
        });
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.task_id);
        });
        
        taskActions.appendChild(activateButton);
        taskActions.appendChild(deleteButton);
        
        taskDetails.appendChild(taskName);
        taskDetails.appendChild(taskParams);
        taskItem.appendChild(taskDetails);
        taskItem.appendChild(taskActions);
        
        // Create status indicator for all tasks, not just active ones
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'status-indicator';
        statusIndicator.innerHTML = '<span class="pulse"></span> Checking...';
            taskDetails.appendChild(statusIndicator);
            
        // Add to DOM first
        taskList.appendChild(taskItem);
        
        // IMPORTANT: Always check the actual status from the server
        // regardless of what the task object says
        setTimeout(async () => {
            console.log(`Checking current server status for task ${task.task_id} after rendering`);
            
            // Do a direct fetch to the server for the latest status
            try {
                const response = await fetch(`/api/tasks/${task.task_id}/status`);
                if (response.ok) {
                    const statusData = await response.json();
                    const isActive = statusData.is_active;
                    
                    console.log(`Server says task ${task.task_id} is ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
                    
                    // Update button
                    activateButton.textContent = isActive ? 'Deactivate' : 'Activate';
                    activateButton.classList.toggle('inactive', !isActive);
                    activateButton.disabled = false;
                    
                    // Update data-active attribute
                    taskItem.setAttribute('data-active', isActive ? 'true' : 'false');
                    
                    // Update status indicator
                    if (isActive) {
                        statusIndicator.innerHTML = '<span class="pulse active"></span> Active';
                startTaskStatusCheck(task.task_id, taskItem);
                    } else {
                        statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive';
                    }
                } else {
                    console.error(`Failed to get status for task ${task.task_id} from server`);
                    activateButton.textContent = 'Activate';
                    activateButton.classList.add('inactive');
                    activateButton.disabled = false;
                    taskItem.setAttribute('data-active', 'false');
                    statusIndicator.innerHTML = '<span class="pulse error"></span> Status unknown';
                }
            } catch (error) {
                console.error(`Error checking task ${task.task_id} status:`, error);
                activateButton.textContent = 'Activate';
                activateButton.classList.add('inactive');
                activateButton.disabled = false;
                taskItem.setAttribute('data-active', 'false');
                statusIndicator.innerHTML = '<span class="pulse error"></span> Status check failed';
            }
        }, 100);
        
        // Add click event to select task
        taskItem.addEventListener('click', () => {
            selectTask(task.task_id);
        });
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

    function updateChart(data, measurementInterval = 1) {
        try {
            console.log("Updating main chart...");
            console.log(`Using measurement interval: ${measurementInterval} minutes`);
            
            // Process data for the chart
            const wavelengths = [...new Set(data.map(item => item.wavelength))].sort((a, b) => a - b);
            const timePoints = [...new Set(data.map(item => item.time_point))].sort((a, b) => a - b);
            
            // Function to generate a color based on wavelength (same as spectro-graph.html)
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
            
            // Create datasets by wavelength (each wavelength is a line across time points)
            const datasets = wavelengths.map(wavelength => {
                const color = getColorForWavelength(wavelength);
                const wavelengthData = data.filter(d => d.wavelength === wavelength);
                return {
                    label: `${wavelength}nm`,
                    data: timePoints.map(time => {
                        const point = wavelengthData.find(d => d.time_point === time);
                        return point ? point.absorbance : null;
                    }),
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.1)'),
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: false,
                    tension: 0.1,
                    hidden: true  // Hide all datasets by default
                };
            });
            
            // Get the canvas element
            const ctx = document.getElementById('spectroChart');
            if (!ctx) {
                console.error("Could not find spectroChart canvas element");
                return;
            }
            
            // Safely destroy existing chart if it exists
            if (currentChart && typeof currentChart.destroy === 'function') {
                console.log("Destroying existing main chart");
                currentChart.destroy();
                currentChart = null;
            } else if (currentChart) {
                console.warn("Existing main chart found but destroy method is not available");
                currentChart = null;
            }
            
            // Create new chart
            console.log("Creating new main chart");
            currentChart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: timePoints.map(t => `${t * measurementInterval} minutes`),
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
                            text: 'Absorbance Over Time by Wavelength'
                        },
                        legend: {
                            display: false // Hide default legend
                        }
                    }
                }
            });
            
            // Create custom legend
            createCustomLegend(currentChart, wavelengths, getColorForWavelength);
            
            console.log("Main chart updated successfully");
        } catch (error) {
            console.error("Error updating main chart:", error);
            // Reset the chart instance if there was an error
            currentChart = null;
        }
    }
    
    // Function to create custom legend (similar to measurements.js)
    function createCustomLegend(chartInstance, wavelengths, getColorForWavelength) {
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

    // Function to toggle dataset visibility (similar to measurements.js)
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

    // Fix the updateDataTable function
    function updateDataTable(data, measurementInterval = 1) {
        console.log("Updating data table with", data.length, "data points");
        console.log("Using measurement interval:", measurementInterval);
        
        try {
            // Process data for the table
            const wavelengths = [...new Set(data.map(item => item.wavelength))].sort((a, b) => a - b);
            const timePoints = [...new Set(data.map(item => item.time_point))].sort((a, b) => a - b);
            
            console.log(`Found ${wavelengths.length} wavelengths and ${timePoints.length} time points`);
            
            // Get table elements
            const headerRow = document.getElementById('time-header-row');
            const tableBody = document.getElementById('absorbance-data-body');
            
            if (!headerRow || !tableBody) {
                console.error("Could not find table elements:", 
                              "headerRow=", headerRow, 
                              "tableBody=", tableBody);
                return;
            }
            
            // Clear existing table
            while (headerRow.children.length > 1) {
                headerRow.removeChild(headerRow.lastChild);
            }
            tableBody.innerHTML = '';
            
            // Add time headers
            timePoints.forEach(time => {
                const th = document.createElement('th');
                th.textContent = `${time * measurementInterval}`;  // Remove "min" suffix
                headerRow.appendChild(th);
            });
            
            // Add data rows
            wavelengths.forEach(wavelength => {
                const row = document.createElement('tr');
                
                // Add wavelength header cell
                const wavelengthCell = document.createElement('td');
                wavelengthCell.textContent = wavelength;
                wavelengthCell.style.fontWeight = 'bold';
                wavelengthCell.style.backgroundColor = '#f8f8f8';
                row.appendChild(wavelengthCell);
                
                // Add data cells
                timePoints.forEach(time => {
                    const cell = document.createElement('td');
                    const point = data.find(d => d.wavelength === wavelength && d.time_point === time);
                    if (point) {
                        cell.textContent = point.absorbance.toFixed(3);
                    } else {
                        cell.textContent = '-';
                    }
                    row.appendChild(cell);
                });
                
                tableBody.appendChild(row);
            });
            
            console.log("Data table updated successfully");
        } catch (error) {
            console.error("Error updating data table:", error);
        }
    }

    // Function to delete a task via API
    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        console.log(`Attempting to delete task ${taskId}...`);
        
        try {
            // Add a timeout to the fetch to prevent it from hanging forever
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
                method: 'DELETE',
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
            
            // Log all response headers for debugging
            console.log('Response status:', response.status);
            console.log('Response headers:');
            for (const [key, value] of response.headers.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            // Try to get the response as text first
            const responseText = await response.text();
            console.log(`Delete response body: ${responseText}`);
            
            // Then try to parse it as JSON if possible
            let responseData;
            try {
                if (responseText && responseText.trim()) {
                    responseData = JSON.parse(responseText);
                } else {
                    responseData = { error: 'Empty response from server' };
                }
            } catch (e) {
                console.error('Response is not valid JSON:', e, responseText);
                // If we can't parse the response as JSON, but the request was successful, consider it a success
                if (response.ok) {
                    console.log('Task deletion seems successful despite invalid JSON response');
                    loadTasks();
                    return;
                } else {
                    alert(`Error deleting task: Server returned invalid response (${response.status}: ${responseText.substring(0, 100)})`);
                    return;
                }
            }
            
            if (response.ok) {
                console.log('Task deleted successfully:', responseData);
                loadTasks();
            } else {
                console.error('Server returned error:', responseData);
                alert(`Error deleting task: ${responseData.error || `Server returned ${response.status}`}`);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error('Request timed out');
                alert('Failed to delete task: Request timed out');
            } else {
                console.error('Error during task deletion:', err);
                alert(`Failed to delete task: ${err.message || 'Network error'}`);
            }
        }
    }

    // Add back the loadTaskData function
    async function loadTaskData(taskId) {
        try {
            // First get the task info to get the measurement interval
            const taskResponse = await fetch(`http://localhost:8000/api/tasks/${taskId}/status`);
            const taskInfo = await taskResponse.json();
            const interval = taskInfo.measurement_interval || 1;
            
            // Now get the data points
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/data`);
            const data = await response.json();
            
            console.log("Loaded data:", data);  // Debug log
            
            // Update chart
            updateChart(data, interval);
            
            // Update spectrum chart
            updateSpectrumChart(data, interval);
            
            // Update data table with the correct interval
            updateDataTable(data, interval);
        } catch (error) {
            console.error('Error loading task data:', error);
        }
    }

    // New function to create a spectrum graph (wavelength vs absorbance)
    function updateSpectrumChart(data, measurementInterval = 1) {
        try {
            console.log("Updating spectrum chart...");
            console.log(`Using measurement interval: ${measurementInterval} minutes`);
            
            // Process data for the spectrum chart
            const wavelengths = [...new Set(data.map(item => item.wavelength))].sort((a, b) => a - b);
            const timePoints = [...new Set(data.map(item => item.time_point))].sort((a, b) => a - b);
            
            // Group time points by day
            const timePointsByDay = {};
            timePoints.forEach(timePoint => {
                const day = Math.floor((timePoint * measurementInterval) / (24 * 60)); // Convert to days and round down
                if (!timePointsByDay[day]) {
                    timePointsByDay[day] = [];
                }
                timePointsByDay[day].push(timePoint);
            });
            
            // Create datasets by day (averaging points within each day)
            const datasets = Object.entries(timePointsByDay).map(([day, dayTimePoints], index) => {
                // Get all data points for this day
                const dayData = dayTimePoints.flatMap(timePoint => 
                    data.filter(d => d.time_point === timePoint)
                );
                
                // Calculate average absorbance for each wavelength for this day
                const averagedData = wavelengths.map(wavelength => {
                    const pointsAtWavelength = dayData.filter(d => d.wavelength === wavelength);
                    if (pointsAtWavelength.length === 0) return null;
                    
                    const sum = pointsAtWavelength.reduce((acc, curr) => acc + curr.absorbance, 0);
                    return sum / pointsAtWavelength.length;
                });
                
                // Generate color based on day number
                const hue = 220 + (index * 30) % 360; // More spread out colors
                const saturation = 70;
                const lightness = Math.max(30, 70 - (index * 5));
                
                return {
                    label: `d${day}`,  // Show as day number
                    data: averagedData,
                    borderWidth: 2,
                    borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                    pointRadius: 0,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                    showLine: true,
                    fill: false
                };
            });
            
            // Get the canvas element
            const ctx = document.getElementById('spectrumChart');
            if (!ctx) {
                console.error("Could not find spectrumChart canvas element");
                return;
            }
            
            // Safely destroy existing chart if it exists
            if (window.spectrumChart && typeof window.spectrumChart.destroy === 'function') {
                console.log("Destroying existing spectrum chart");
                window.spectrumChart.destroy();
                window.spectrumChart = null;
            } else if (window.spectrumChart) {
                console.warn("Existing spectrum chart found but destroy method is not available");
                window.spectrumChart = null;
            }
            
            // Create new chart
            console.log("Creating new spectrum chart");
            window.spectrumChart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: wavelengths.map(w => `${w}`),
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
                                text: 'Optical Density (OD)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Wavelength (nm)'
                            },
                            ticks: {
                                maxTicksLimit: 15,
                                callback: function(value, index, values) {
                                    const label = this.getLabelForValue(value);
                                    return index % 3 === 0 ? label : '';
                                }
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Average Absorbance Spectrum by Day'  // Updated title
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                boxWidth: 10
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: function(tooltipItems) {
                                    return `Wavelength: ${tooltipItems[0].label} nm`;
                                },
                                label: function(context) {
                                    return `Day ${context.dataset.label.substring(1)}: ${context.formattedValue} OD`;
                                }
                            }
                        }
                    }
                }
            });
            
            console.log("Spectrum chart updated successfully");
        } catch (error) {
            console.error("Error updating spectrum chart:", error);
            window.spectrumChart = null;
        }
    }
}

logedB.addEventListener('click', () => {
    // Clear login state and reset UI
    clearLoginState();
    resetToLoggedOutState();
    
    // Always redirect to home page after logout
    $("#navbar-placeholder").load("home.html");
    
    // Clear form fields if they exist
    const loginForm = document.querySelector('.login');
    if (loginForm) {
        loginForm.reset();
    }
});


formboxlogin.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission behavior
    const LPassword = document.getElementById('lpassword');
    const LName = document.getElementById('lname');
    // Access form elements by their IDs or names
    pass = LPassword.value;
    name = LName.value;

    login(pass, name);
});

async function login(pass, name) {
    try {
        // Clear any existing session
        clearLoginState();
        
        const response = await fetch(`${SERVER_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: name, // parameter name still 'email' for backward compatibility
                password: pass
            }),
            credentials: 'include' // Important for cookies
        });

        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error('Server returned invalid response format');
        }
        
        if (data && data.success) {
            resetToLoggedOutState();
            updateUIForLoggedInState(name, data.user.admin);
            saveLoginState(name, data.user.admin);

            // Also set cookies for compatibility with existing checks
            const expires = new Date(Date.now() + (4 * 60 * 60 * 1000)); // 4 hours
            document.cookie = `sessionId=authenticated; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
            document.cookie = `userEmail=${name}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
            document.cookie = `isAdmin=${data.user.admin}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
            document.cookie = `lastActivity=${Date.now()}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;

            alert("Welcome!");
        } else {
            alert("Login failed: " + (data.error || "Invalid credentials"));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert("Login failed. Please try again.");
    }
}


formboxRegister.addEventListener("submit", async function (event) {
    if (loged == true) {
        alert("You are already logged in");
        return;
    }
    event.preventDefault();

    const RName = document.getElementById('rname');
    const RPassword = document.getElementById('rpassword');
    const RBirthday = document.getElementById('Birthday');

    const name = RName.value;
    const password = RPassword.value;
    const birthday = RBirthday.value;

    try {
        const response = await fetch(`${SERVER_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: name, // parameter name still 'email' for backward compatibility
                password: password,
                birthday: birthday
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration successful! Please log in.");
            // Switch to login form
            wrapper.classList.remove('active');
            // Clear registration form
            RName.value = '';
            RPassword.value = '';
            RBirthday.value = '';
        } else {
            alert("Registration failed: " + (data.error || "Unknown error"));
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert("Registration failed. Please try again.");
    }
});



async function ifUser(user) {
    try {
        const resp1 = await fetch(`${SERVER_URL}/users/${user.name}`);
        const data1 = await resp1.json();

        const resp2 = await fetch(`${SERVER_URL}/users/${user.password}`);
        const data2 = await resp2.json();

        if ( data1 == data2 && data1 != null && data2 != null) {
            return true;
        }
        else{
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createTableData() {
    try {
        console.log("createTableData called - checking for admin table");
        
        // Check if we're on the admin page by looking for the correct table
        const tableEl = document.getElementById("usersTableBody");
        
        if (!tableEl) {
            console.log("Admin table not found (usersTableBody), skipping createTableData");
            return;
        }
        
        console.log("Admin table found, loading users data");
        
        const users = await getData();
        
        if (!users || users.length === 0) {
            console.log("No users data returned");
            return;
        }
        
        // Clear existing rows
        tableEl.innerHTML = '';

        users.forEach(user => {
            // create elements
            const newTr = document.createElement("tr");
            
            // Create table cells matching the admin page structure
            const tdId = document.createElement("td");
            const tdName = document.createElement("td");
            const tdRole = document.createElement("td");
            const tdBirthday = document.createElement("td");
            const tdActions = document.createElement("td");

            // insert data to the new columns
            tdId.textContent = user.id || 'N/A';
            tdName.textContent = user.name || 'N/A';
            
            // Role cell with badge
            const roleBadge = document.createElement("span");
            roleBadge.className = `status-badge ${user.admin ? 'status-admin' : 'status-user'}`;
            roleBadge.textContent = user.admin ? 'Administrator' : 'Regular User';
            tdRole.appendChild(roleBadge);
            
            tdBirthday.textContent = user.birthday || 'Not set';
            
            // Actions cell with buttons
            tdActions.innerHTML = `
                <button class="btn btn-warning" onclick="window.adminFunctions.editUser(${user.id}, '${user.name}', ${user.admin}, '${user.birthday || ''}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="window.adminFunctions.deleteUser(${user.id}, '${user.name}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;

            // append the new columns to the new row
            newTr.appendChild(tdId);
            newTr.appendChild(tdName);
            newTr.appendChild(tdRole);
            newTr.appendChild(tdBirthday);
            newTr.appendChild(tdActions);

            // append the new row to the table
            tableEl.appendChild(newTr);
        });
        
        console.log(`Added ${users.length} users to admin table`);
        
    } catch (error) {
        console.error('Error in createTableData:', error);
    }
}

async function getData() {
    console.log("get data");
    const resp = await fetch(`${SERVER_URL}/users`)
    const data = await resp.json()

    return data
}

async function update() {
    const fetchParams = {
        method: "PUT",
        body: JSON.stringify({
            name: "Moshe"
        }),
        headers: {
            "Content-Type": "application/json"
        }
    }
    
    const resp = await fetch(`${SERVER_URL}/users/${user.name}`, fetchParams)
    const data = await resp.json()
    console.log(data)
    }

// Improved setupViewTabs function that works with all views
function setupViewTabs() {
    console.log("Setting up view tabs...");
    
    // Find all view buttons and view sections
    const viewButtons = document.querySelectorAll('.view-btn');
    const viewSections = document.querySelectorAll('.view-section');
    
    console.log(`Found ${viewButtons.length} view buttons and ${viewSections.length} view sections`);
    
    if (viewButtons.length > 0) {
        // Add click event listener to each button
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const viewToShow = this.getAttribute('data-view');
                console.log(`Switching to view: ${viewToShow}`);
                
                // Remove active class from all buttons and sections
                viewButtons.forEach(btn => btn.classList.remove('active'));
                viewSections.forEach(section => section.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Show corresponding section
                const targetSection = document.getElementById(`${viewToShow}-view`);
                if (targetSection) {
                    targetSection.classList.add('active');
                } else {
                    console.error(`Could not find section with ID: ${viewToShow}-view`);
                }
            });
        });
        
        // Ensure the correct initial view is shown
        const activeButton = document.querySelector('.view-btn.active');
        if (activeButton) {
            const initialView = activeButton.getAttribute('data-view');
            console.log(`Setting initial view to: ${initialView}`);
            
            viewSections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(`${initialView}-view`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        }
        
        console.log("View tabs setup completed");
    } else {
        console.warn("No view buttons found");
    }
}

// Update to ensure we're checking task status every time the page loads
function checkAllTasksOnPageLoad() {
    console.log("Page loaded/refreshed - checking all task statuses from server");
    
    // First check if we're on the measurements page by looking for task-list
    const taskList = document.getElementById('task-list');
    
    if (taskList) {
        console.log("Measurements page detected - force refreshing all task statuses");
        
        // Wait a short moment for tasks to be loaded
        setTimeout(() => {
            // Use our improved force refresh function
            forceRefreshAllTaskStatuses();
            
            // Also start the regular refresh mechanism
            scheduleRegularStatusRefreshes();
        }, 1000);
    }
}

// Add event listener for page load/refresh
window.addEventListener('load', checkAllTasksOnPageLoad);

// Add event listener for visibility change (when user returns to the tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('Page became visible, checking all task statuses');
        checkAllTasksOnPageLoad();
    }
});

function setToggleState(item, isActive) {
  const btn = item.querySelector('.toggle-button');
  btn.textContent = isActive ? 'Deactivate' : 'Activate';
  btn.classList.toggle('inactive', !isActive);
  item.setAttribute('data-active', isActive);
}

// Add these utility functions at the top of the file
function generateSecureToken() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function encryptData(data) {
    const key = generateSecureToken();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    
    return window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encodedData
    ).then(encrypted => {
        return {
            encrypted: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv),
            key: key
        };
    });
}

function decryptData(encryptedData) {
    return window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(encryptedData.iv)
        },
        encryptedData.key,
        new Uint8Array(encryptedData.encrypted)
    ).then(decrypted => {
        return JSON.parse(new TextDecoder().decode(decrypted));
    });
}

// UI state management functions
function updateUIForLoggedInState(name, isAdmin) {
    loged = true;
    logedB.style.display = 'inline';
    btnPopup.style.display = 'none';
    wrapper.classList.remove('active-popup');
    
    // Show user name in the nav bar
    logedName.textContent = "Welcome " + name;
    logedName.style.cursor = 'pointer';
    
    // Add profile navigation event
    logedName.addEventListener('click', () => {
        $("#navbar-placeholder").load("profile.html");
    });
    
    if (isAdmin === true) {
        admainP.style.display = 'inline';
    } else {
        admainP.style.display = 'none';
    }
}

function resetToLoggedOutState() {
    btnPopup.style.display = 'inline';
    logedB.style.display = 'none';
    wrapper.classList.remove('active-popup');
    logedName.innerHTML = "";
    logedName.style.cursor = 'default';
    
    // Remove the profile navigation event
    logedName.replaceWith(logedName.cloneNode(true));
    logedName = document.querySelector('.name');
    
    admainP.style.display = 'none';
    
    loged = false;
}

// Session management functions
function saveLoginState(name, isAdmin) {
    localStorage.setItem('userEmail', name); // Keep the key for backward compatibility
    localStorage.setItem('isAdmin', isAdmin);
    localStorage.setItem('isLoggedIn', 'true');
}

function clearLoginState() {
    // Clear all cookies by setting their expiration to the past
    const pastDate = new Date(0).toUTCString();
    document.cookie = `sessionId=; expires=${pastDate}; path=/; secure; samesite=strict`;
    document.cookie = `userEmail=; expires=${pastDate}; path=/; secure; samesite=strict`;
    document.cookie = `isAdmin=; expires=${pastDate}; path=/; secure; samesite=strict`;
    document.cookie = `lastActivity=; expires=${pastDate}; path=/; secure; samesite=strict`;
    
    // Clear localStorage items
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isLoggedIn');
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function checkLoginState() {
    // First check cookies (for session-based auth)
    const sessionId = getCookie('sessionId');
    const userEmailFromCookie = getCookie('userEmail');
    const isAdminFromCookie = getCookie('isAdmin') === 'true';
    const lastActivity = parseInt(getCookie('lastActivity') || '0');
    
    // Then check localStorage (for persistent login)
    const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
    const userEmailFromStorage = localStorage.getItem('userEmail');
    const isAdminFromStorage = localStorage.getItem('isAdmin') === 'true';
    
    // Combine both sources - prefer cookies if available
    const userEmail = userEmailFromCookie || userEmailFromStorage;
    const isAdmin = isAdminFromCookie || isAdminFromStorage;
    const isLoggedIn = (sessionId && userEmailFromCookie) || isLoggedInFromStorage;
    
    if (!isLoggedIn || !userEmail) {
        resetToLoggedOutState();
        // Always redirect to home page when not logged in
        $("#navbar-placeholder").load("home.html");
        return;
    }
    
    // If using cookies, check for session inactivity (30 minutes)
    if (sessionId && Date.now() - lastActivity > 30 * 60 * 1000) {
        clearLoginState();
        resetToLoggedOutState();
        // Always redirect to home page on session timeout
        $("#navbar-placeholder").load("home.html");
        return;
    }
    
    // Update last activity if using cookies
    if (sessionId) {
        const expires = new Date(Date.now() + (4 * 60 * 60 * 1000));
        document.cookie = `lastActivity=${Date.now()}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    }
    
    // Update UI for logged in state
    loged = true;
    updateUIForLoggedInState(userEmail, isAdmin);
}

// Security utility functions
function secureFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        credentials: 'include' // Important for cookies
    });
}

// Activity monitoring setup
let lastActivity = Date.now();
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

activityEvents.forEach(event => {
    document.addEventListener(event, () => {
        lastActivity = Date.now();
        // Update last activity cookie
        const expires = new Date(Date.now() + (4 * 60 * 60 * 1000));
        document.cookie = `lastActivity=${Date.now()}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    });
});

// Security check intervals
setInterval(() => {
    checkLoginState();
}, 60000); // Check every minute

setInterval(() => {
    if (Date.now() - lastActivity > 30 * 60 * 1000) { // 30 minutes
        clearLoginState();
        resetToLoggedOutState();
    }
}, 5 * 60 * 1000);

// Add a function to refresh all task statuses from the server
async function refreshAllTaskStatuses() {
    console.log('Refreshing all task statuses from server...');
    try {
        // Get all active tasks from the server
        const activeResponse = await fetch('/api/tasks/active/all');
        if (!activeResponse.ok) {
            console.error(`Failed to fetch active tasks: ${activeResponse.status}`);
            const errorText = await activeResponse.text();
            console.error(`Error response: ${errorText}`);
            throw new Error(`Failed to fetch active tasks: ${activeResponse.status}`);
        }
        
        let activeTasks;
        try {
            activeTasks = await activeResponse.json();
            console.log('Active tasks from server:', activeTasks);
        } catch (jsonError) {
            console.error('Error parsing active tasks response:', jsonError);
            throw new Error('Invalid response format for active tasks');
        }
        
        // Create a map of active task IDs for easy lookup
        const activeTaskIds = new Map();
        activeTasks.forEach(task => {
            // Store both id and task_id if they exist
            if (task.id) activeTaskIds.set(task.id.toString(), true);
            if (task.task_id) activeTaskIds.set(task.task_id.toString(), true);
        });
        
        console.log('Active task IDs:', Array.from(activeTaskIds.keys()));
        
        // Update UI for all task items
        const taskItems = document.querySelectorAll('.task-item');
        for (const item of taskItems) {
            const taskId = item.getAttribute('data-task-id');
            if (taskId) {
                // First check directly with the server for this specific task
                try {
                    const statusResponse = await fetch(`/api/tasks/${taskId}/status`);
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        console.log(`Direct status check for task ${taskId}: is_active=${statusData.is_active}`);
                        
                        // Update button
                        const activateButton = item.querySelector('.activate-button');
                        if (activateButton) {
                            if (statusData.is_active) {
                                activateButton.textContent = 'Deactivate';
                                activateButton.classList.remove('inactive');
                            } else {
                                activateButton.textContent = 'Activate';
                                activateButton.classList.add('inactive');
                            }
                        }
                        
                        // Update data-active attribute
                        item.setAttribute('data-active', statusData.is_active ? 'true' : 'false');
                        
                        // Start or stop status check based on direct check
                        if (statusData.is_active) {
                            startTaskStatusCheck(taskId, item);
                        } else {
                            stopTaskStatusCheck(taskId);
                        }
                        
                        // Continue to next task item
                        continue;
                    } else {
                        console.warn(`Failed to get direct status for task ${taskId}: ${statusResponse.status}`);
                    }
                } catch (statusError) {
                    console.error(`Error in direct status check for task ${taskId}:`, statusError);
                }
                
                // Fallback to the active task list if direct check failed
                const isActive = activeTaskIds.has(taskId.toString());
                console.log(`Task ${taskId} active status from active list: ${isActive}`);
                
                // Update UI
                const activateButton = item.querySelector('.activate-button');
                if (activateButton) {
                    if (isActive) {
                        activateButton.textContent = 'Deactivate';
                        activateButton.classList.remove('inactive');
                    } else {
                        activateButton.textContent = 'Activate';
                        activateButton.classList.add('inactive');
                    }
                }
                
                // Update data-active attribute
                item.setAttribute('data-active', isActive ? 'true' : 'false');
                
                // Start or stop status check
                if (isActive) {
                    startTaskStatusCheck(taskId, item);
                } else {
                    stopTaskStatusCheck(taskId);
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing task statuses:', error);
    }
}

// Emergency fix for task status detection
// This completely ignores the server's is_active flag and instead
// directly checks whether the task is active by:
// 1. Looking for the task in activeWorkers in worker_manager.js
// 2. Using presence in taskCheckTimers as a backup indicator
async function isTaskRunning(taskId) {
    console.log(`EMERGENCY check if task ${taskId} is running...`);
    
    // STEP 1: Check if we have a record of deactivating this task locally
    // If we've already know we deactivated it, assume it's still inactive
    if (window.deactivatedTasks && window.deactivatedTasks[taskId]) {
        console.log(`Task ${taskId} was previously deactivated by this client - reporting as INACTIVE`);
        return false;
    }
    
    try {
        // STEP 2: Use a completely different approach - check the worker manager directly
        const isRunningEndpoint = `/api/tasks/${taskId}/is-running?_t=${Date.now()}`;
        console.log(`Checking direct worker manager endpoint: ${isRunningEndpoint}`);
        
        try {
            // Use a timeout to prevent hanging if server is slow
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 3000);
            
            const response = await fetch(isRunningEndpoint, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
                signal: abortController.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                // Check content type to avoid parsing HTML
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error(`Worker manager endpoint returned non-JSON response: ${contentType}`);
                    throw new Error('Received non-JSON response');
                }
                
                const data = await response.json();
                const isRunning = Boolean(data.isRunning);
                console.log(`[WORKER MANAGER] Task ${taskId} running status: ${isRunning ? 'ACTIVE' : 'INACTIVE'}`);
                return isRunning;
            }
            
            console.error(`Worker manager check failed: ${response.status}`);
        } catch (err) {
            console.error(`Error checking worker manager status: ${err.message}`);
        }
        
        // STEP 3: Try the more robust status-check endpoint as a fallback
        try {
            console.log(`Trying robust status check endpoint for task ${taskId}`);
            const statusCheckEndpoint = `/api/tasks/${taskId}/status-check?_t=${Date.now()}`;
            
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 3000);
            
            const statusResponse = await fetch(statusCheckEndpoint, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
                signal: abortController.signal
            });
            
            clearTimeout(timeoutId);
            
            if (statusResponse.ok) {
                // Check content type to avoid parsing HTML
                const contentType = statusResponse.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error(`Status check endpoint returned non-JSON response: ${contentType}`);
                    throw new Error('Received non-JSON response');
                }
                
                const statusData = await statusResponse.json();
                console.log(`Robust status check data:`, statusData);
                
                if (statusData.isActive !== undefined) {
                    return Boolean(statusData.isActive);
                }
                
                // If there's no recent data update, assume it's inactive
                if (statusData.lastDataTime) {
                    const lastUpdateTime = new Date(statusData.lastDataTime);
                    const timeSinceUpdate = (Date.now() - lastUpdateTime.getTime()) / 60000; // minutes
                    const interval = statusData.measurementInterval || 5;
                    
                    console.log(`Last update: ${timeSinceUpdate.toFixed(1)} minutes ago, interval: ${interval} minutes`);
                    
                    // If the last update was within 2x the measurement interval, it might be active
                    if (timeSinceUpdate < interval * 2) {
                        console.log(`Task ${taskId} has recent data - might be active`);
                    } else {
                        console.log(`Task ${taskId} data is stale - probably inactive`);
                        return false;
                    }
                } else {
                    console.log(`Task ${taskId} has no data - probably inactive`);
                    return false;
                }
            }
        } catch (err) {
            console.error(`Error checking robust status: ${err.message}`);
        }
        
        // FALLBACK 1: Check for task ID in our taskCheckTimers
        // If we're actively monitoring this task, it might be running
        if (taskCheckTimers[taskId]) {
            console.log(`Task ${taskId} has an active timer - might be running`);
            // This is not definitive, so still do other checks
        }
        
        // STEP 4: The Emergency Nuclear Option - ASSUME DEACTIVATED
        // If we've explicitly tried to deactivate this task, assume it worked
        if (window.attemptedDeactivation && window.attemptedDeactivation[taskId]) {
            console.log(`Task ${taskId} was previously attempted to be deactivated - assuming INACTIVE`);
            return false;
        }
        
        // Final fallback - assume inactive if we can't verify
        console.log(`Task ${taskId} status cannot be verified - assuming INACTIVE for safety`);
        return false;
    } catch (error) {
        console.error(`Critical error checking task ${taskId} status:`, error);
        return false;
    }
}

// Function to update a single task's UI based on running state
async function updateTaskRunningState(taskItem) {
    const taskId = taskItem.getAttribute('data-task-id');
    if (!taskId) return;
    
    try {
        const isRunning = await isTaskRunning(taskId);
        console.log(`Task ${taskId} running state: ${isRunning ? 'RUNNING' : 'NOT RUNNING'}`);
        
        // Update button
        const activateButton = taskItem.querySelector('.activate-button');
        if (activateButton) {
            if (isRunning) {
                activateButton.textContent = 'Deactivate';
                activateButton.classList.remove('inactive');
            } else {
                activateButton.textContent = 'Activate';
                activateButton.classList.add('inactive');
            }
        }
        
        // Update data-active attribute
        taskItem.setAttribute('data-active', isRunning ? 'true' : 'false');
        
        // Update status indicator
        const statusIndicator = taskItem.querySelector('.status-indicator');
        if (statusIndicator) {
            if (isRunning) {
                if (!statusIndicator.innerHTML.includes('Active')) {
                    statusIndicator.innerHTML = '<span class="pulse active"></span> Active - Checking data...';
                }
                // Only call startTaskStatusCheck if it's defined in the current scope
                if (typeof startTaskStatusCheck === 'function') {
                    startTaskStatusCheck(taskId, taskItem);
                }
            } else {
                statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive';
                // Only call stopTaskStatusCheck if it's defined in the current scope
                if (typeof stopTaskStatusCheck === 'function') {
                    stopTaskStatusCheck(taskId);
                }
            }
        }
        
        return isRunning;
    } catch (error) {
        console.error(`Error updating task ${taskId} running state:`, error);
        // Set a default state in case of errors
        if (activateButton) {
            activateButton.textContent = 'Activate';
            activateButton.classList.add('inactive');
        }
        return false;
    }
}

// Function to update all tasks' running states
async function updateAllTasksRunningState() {
    console.log('Updating running state for all tasks...');
    const taskItems = document.querySelectorAll('.task-item');
    
    for (const taskItem of taskItems) {
        await updateTaskRunningState(taskItem);
    }
    
    console.log('All tasks updated');
}

// Function to setup periodic page refresh to ensure status is always up-to-date
function setupPeriodicPageRefresh() {
    // Check if we're on the measurements page
    const isMeasurementsPage = document.querySelector('.measurements-container') || 
                               document.getElementById('task-list');
    
    if (isMeasurementsPage) {
        console.log('Setting up periodic page refresh for measurements page');
        
        // Set up a refresh every 5 minutes (300000 ms) to ensure status is always updated
        const refreshInterval = 5 * 60 * 1000; // 5 minutes
        
        // Clear any existing refresh timer
        if (window.pageRefreshTimer) {
            clearTimeout(window.pageRefreshTimer);
        }
        
        // Set up the refresh timer
        window.pageRefreshTimer = setTimeout(() => {
            console.log('Periodic refresh timer triggered - refreshing page');
            location.reload();
        }, refreshInterval);
        
        // Add event listeners to reset the timer on user activity
        const resetTimer = () => {
            if (window.pageRefreshTimer) {
                clearTimeout(window.pageRefreshTimer);
                window.pageRefreshTimer = setTimeout(() => {
                    console.log('Periodic refresh timer triggered - refreshing page');
                    location.reload();
                }, refreshInterval);
            }
        };
        
        // Reset timer on user interaction
        ['click', 'touchstart', 'mousemove', 'keypress'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });
    }
}

// Call setupPeriodicPageRefresh when the page loads
document.addEventListener('DOMContentLoaded', setupPeriodicPageRefresh);

// Also call setupPeriodicPageRefresh when the navbar is loaded with measurements.html
$(document).on('load', '#navbar-placeholder', function() {
    if ($(this).html().includes('measurements.html')) {
        setupPeriodicPageRefresh();
    }
});

// Function to force refresh all task statuses from server 
async function forceRefreshAllTaskStatuses() {
    console.log('FORCE REFRESHING all task statuses from server');
    
    // Find all task items
    const taskItems = document.querySelectorAll('.task-item');
    if (taskItems.length === 0) {
        console.log('No task items found to refresh');
        return;
    }
    
    console.log(`Found ${taskItems.length} tasks - refreshing status for all`);
    
    // Process each task item
    for (const taskItem of taskItems) {
        const taskId = taskItem.getAttribute('data-task-id');
        if (!taskId) continue;
        
        // SAFETY CHECK: If we've already deactivated this task, force the UI to show inactive
        if (window.deactivatedTasks && window.deactivatedTasks[taskId]) {
            console.log(`Task ${taskId} was previously deactivated - forcing UI to show inactive`);
            const activateButton = taskItem.querySelector('.activate-button');
            const statusIndicator = taskItem.querySelector('.status-indicator');
            
            if (activateButton) {
                activateButton.textContent = 'Activate';
                activateButton.classList.add('inactive');
                activateButton.disabled = false;
            }
            
            taskItem.setAttribute('data-active', 'false');
            
            if (statusIndicator) {
                statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive (forced)';
            }
            
            // Skip the server check entirely
            continue;
        }
        
        console.log(`Force refreshing status for task ${taskId}`);
        
        // Get the activate button and status indicator
        const activateButton = taskItem.querySelector('.activate-button');
        const statusIndicator = taskItem.querySelector('.status-indicator');
        
        if (!activateButton || !statusIndicator) {
            console.log(`Missing UI elements for task ${taskId}`);
            continue;
        }
        
        // Show loading state
        activateButton.disabled = true;
        activateButton.textContent = 'Checking...';
        statusIndicator.innerHTML = '<span class="pulse"></span> Checking status...';
        
        try {
            // Do a direct server check with cache-busting
            const isActive = await isTaskRunning(taskId);
            console.log(`Verified status for task ${taskId}: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
            
            // Update button state
            activateButton.textContent = isActive ? 'Deactivate' : 'Activate';
            activateButton.classList.toggle('inactive', !isActive);
            activateButton.disabled = false;
            
            // Update the data-active attribute
            taskItem.setAttribute('data-active', isActive ? 'true' : 'false');
            
            // Update status indicator
            if (isActive) {
                statusIndicator.innerHTML = '<span class="pulse active"></span> Active - Verified';
                // Start status check timer
                if (typeof startTaskStatusCheck === 'function') {
                    startTaskStatusCheck(taskId, taskItem);
                }
            } else {
                statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive - Verified';
                // Stop status check timer
                if (typeof stopTaskStatusCheck === 'function') {
                    stopTaskStatusCheck(taskId);
                }
            }
        } catch (error) {
            console.error(`Error forcing refresh for task ${taskId}:`, error);
            
            // Set to inactive on error
            activateButton.textContent = 'Activate';
            activateButton.classList.add('inactive');
            activateButton.disabled = false;
            taskItem.setAttribute('data-active', 'false');
            statusIndicator.innerHTML = '<span class="pulse error"></span> Status check failed';
        }
    }
    
    console.log('All task statuses have been force refreshed');
}

// Schedule regular forced refreshes
function scheduleRegularStatusRefreshes() {
    console.log('Setting up regular forced status refreshes');
    
    // Clear any existing interval
    if (window.statusRefreshInterval) {
        clearInterval(window.statusRefreshInterval);
    }
    
    // Refresh every 30 seconds
    window.statusRefreshInterval = setInterval(() => {
        console.log('Regular status refresh triggered');
        forceRefreshAllTaskStatuses();
    }, 30000); // 30 seconds
    
    // Run an immediate refresh
    forceRefreshAllTaskStatuses();
    
    // Also refresh on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Page became visible, force refreshing task statuses');
            forceRefreshAllTaskStatuses();
        }
    });
}

// Update UI elements for logged in state
function updateUIForLoggedInState(name, isAdmin) {
    loged = true;
    logedB.style.display = 'inline';
    btnPopup.style.display = 'none';
    wrapper.classList.remove('active-popup');
    
    // Show user name in the nav bar
    logedName.textContent = "Welcome " + name;
    logedName.style.cursor = 'pointer';
    
    // Add profile navigation event
    logedName.addEventListener('click', () => {
        $("#navbar-placeholder").load("profile.html");
    });
    
    if (isAdmin === true) {
        admainP.style.display = 'inline';
    } else {
        admainP.style.display = 'none';
    }
}

// Update user display after profile changes
function updateUserDisplay(name, isAdmin) {
    logedName.textContent = name;
    
    if (isAdmin === true) {
        admainP.style.display = 'inline';
    } else {
        admainP.style.display = 'none';
    }
}

// This function has been merged with the earlier checkLoginState function

// Initialize the app when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    logedB.style.display = 'none';    
    admainP.style.display = 'none';
    
    // Check if user is already logged in from a previous session
    checkLoginState();
    
    // Setup other page functionality
    setupPeriodicPageRefresh();
});

