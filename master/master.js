const homefun =  document.querySelector('.home');
const Admin = document.querySelector('.privet');
const tabelAdmin = document.querySelector('.createTableData');
const spectroGraph = document.querySelector('.spectro-graph');

const navbarplaceholder = document.querySelector('#navbar-placeholder');

loged = false;
isAdmain = false;

const wrapper = document.querySelector('.wrapper');
const loginlink = document.querySelector('.login-link');
const registerlink = document.querySelector('.register-link');
const btnPopup = document.querySelector('.button');
const logedB = document.querySelector('.loged');
const logedName = document.querySelector('.name');
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
    $("#navbar-placeholder").load( "home.html");
});

Admin.addEventListener('click', () => {
    $("#navbar-placeholder").load( "Admain.html");
    createTableData();
});

spectroGraph.addEventListener('click', () => {
    // Check if user is logged in
    const sessionId = getCookie('sessionId');
    const userEmail = getCookie('userEmail');
    
    if (!sessionId || !userEmail) {
        alert("Please log in to access the Measurements page");
        wrapper.classList.add('active-popup'); // Show login popup
        return;
    }
    
    $("#navbar-placeholder").load("measurements.html", function() {
        // Initialize Measurements functionality after content is loaded
        initializeMeasurements();
        setupViewTabs();
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
    
    // Load tasks when initialized
    loadTasks();

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
            const response = await fetch('http://localhost:8000/api/tasks');
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
        if (!taskName || !measurementInterval || !wavelengthStart || !wavelengthEnd || !wavelengthStep) {
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
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !isActive })
            });
            
            if (response.ok) {
                // Parse the server response to get the true new state
                const result = await response.json();
                const newState = result.is_active;
                // Update the toggle button for this task
                document.querySelectorAll('.task-item').forEach(item => {
                    if (item.getAttribute('data-task-id') == taskId) {
                        const toggleButton = item.querySelector('.toggle-button');
                        if (newState) {
                            toggleButton.textContent = 'Deactivate';
                            toggleButton.classList.remove('inactive');
                            startTaskStatusCheck(taskId, item);
                        } else {
                            toggleButton.textContent = 'Activate';
                            toggleButton.classList.add('inactive');
                            stopTaskStatusCheck(taskId);
                        }
                        item.setAttribute('data-active', newState ? 'true' : 'false');
                    }
                });
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to update task status'}`);
            }
        } catch (error) {
            console.error('Error toggling task status:', error);
            alert('Failed to update task status');
        }
    }

    // Store task check timers
    const taskCheckTimers = {};

    // Start periodic status check for a task
    function startTaskStatusCheck(taskId, taskElement) {
        // Get the task's measurement interval from its data
        const intervalText = taskElement.querySelector('.task-params').textContent;
        const match = intervalText.match(/Interval: (\d+) minutes/);
        // Default to 5 minutes (300000ms) if interval can't be found
        let measurementInterval = 5;
        
        if (match && match[1]) {
            measurementInterval = parseInt(match[1]);
        }
        
        // Check status at the same interval as the measurement (converted to ms)
        // with a minimum of 1 minute (60000ms) and maximum of 5 minutes (300000ms)
        const checkInterval = Math.min(300000, Math.max(60000, measurementInterval * 60000));
        console.log(`Setting status check interval to ${checkInterval/1000} seconds for task with measurement interval ${measurementInterval} minutes`);
        
        // Add status indicator to the task item
        let statusIndicator = taskElement.querySelector('.status-indicator');
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.className = 'status-indicator';
            statusIndicator.innerHTML = '<span class="pulse"></span> Checking...';
            taskElement.querySelector('.task-details').appendChild(statusIndicator);
        }
        
        // Clear existing timer if any
        if (taskCheckTimers[taskId]) {
            clearInterval(taskCheckTimers[taskId]);
        }
        
        // Set up new timer
        taskCheckTimers[taskId] = setInterval(() => {
            checkTaskStatus(taskId, statusIndicator);
        }, checkInterval);
        
        // Run an immediate check
        checkTaskStatus(taskId, statusIndicator);
    }

    // Stop task status check
    function stopTaskStatusCheck(taskId) {
        if (taskCheckTimers[taskId]) {
            clearInterval(taskCheckTimers[taskId]);
            delete taskCheckTimers[taskId];
        }
        
        // Find and remove the status indicator
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            if (item.getAttribute('data-task-id') == taskId) {
                const statusIndicator = item.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.remove();
                }
            }
        });
    }

    // Check a task's status
    async function checkTaskStatus(taskId, statusIndicator) {
        try {
            console.log(`Checking status for task ${taskId}...`);
            
            // Fetch latest data for the task to see if it's being updated
            const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/status-check`)
                .catch(err => {
                    console.error(`Network error fetching status for task ${taskId}:`, err);
                    throw new Error(`Network error: ${err.message}`);
                });
            
            if (!response) {
                throw new Error('No response received from server');
            }
            
            console.log(`Status check response: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                let data;
                try {
                    data = await response.json();
                    console.log('Status data received:', data);
                } catch (jsonError) {
                    console.error('Error parsing status response JSON:', jsonError);
                    throw new Error('Invalid response format');
                }
                
                if (!data) {
                    throw new Error('Empty data received');
                }
                
                if (data.isActive) {
                    // Update the status indicator
                    if (data.lastDataTime) {
                        const timeAgo = getTimeAgo(new Date(data.lastDataTime));
                        statusIndicator.innerHTML = `<span class="pulse active"></span> Active - Last data: ${timeAgo}`;
                        statusIndicator.classList.remove('warning', 'error');
                        
                        // Add warning if data is older than twice the interval
                        if (data.timeSinceUpdate > data.measurementInterval * 2) {
                            statusIndicator.classList.add('warning');
                        }
                        
                        // Add error if data is older than 10 minutes
                        if (data.timeSinceUpdate > 10) {
                            statusIndicator.classList.add('error');
                        }
                    } else {
                        statusIndicator.innerHTML = '<span class="pulse"></span> Waiting for data...';
                    }
                } else {
                    statusIndicator.innerHTML = '<span class="pulse inactive"></span> Inactive';
                }
            } else {
                // Try to get error details
                let errorText = '';
                try {
                    const errorData = await response.text();
                    errorText = errorData ? `: ${errorData}` : '';
                    console.error(`Server returned error ${response.status}${errorText}`);
                } catch (e) {
                    console.error('Could not read error response:', e);
                }
                
                statusIndicator.innerHTML = `<span class="pulse error"></span> Check failed (${response.status})`;
                statusIndicator.classList.add('error');
            }
        } catch (error) {
            console.error(`Error checking task ${taskId} status:`, error);
            statusIndicator.innerHTML = `<span class="pulse error"></span> Error: ${error.message || 'Unknown error'}`;
            statusIndicator.classList.add('error');
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
        taskItem.setAttribute('data-active', task.is_active ? 'true' : 'false');
        
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
        
        const toggleButton = document.createElement('button');
        toggleButton.className = `toggle-button ${task.is_active ? '' : 'inactive'}`;
        toggleButton.textContent = task.is_active ? 'Deactivate' : 'Activate';
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent task selection
            toggleTaskStatus(task.task_id, task.is_active);
        });
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.task_id);
        });
        
        taskActions.appendChild(toggleButton);
        taskActions.appendChild(deleteButton);
        
        taskDetails.appendChild(taskName);
        taskDetails.appendChild(taskParams);
        taskItem.appendChild(taskDetails);
        taskItem.appendChild(taskActions);
        
        // Add status indicator if the task is active
        if (task.is_active) {
            // Create status indicator that will be updated by status check
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'status-indicator';
            statusIndicator.innerHTML = '<span class="pulse"></span> Initializing...';
            taskDetails.appendChild(statusIndicator);
            
            // Schedule status check after rendering
            setTimeout(() => {
                startTaskStatusCheck(task.task_id, taskItem);
            }, 500);
        }
        
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

    function updateChart(data, measurementInterval = 1) {
        try {
            console.log("Updating main chart...");
            console.log(`Using measurement interval: ${measurementInterval} minutes`);
            
            // Process data for the chart
            const wavelengths = [...new Set(data.map(item => item.wavelength))].sort((a, b) => a - b);
            const timePoints = [...new Set(data.map(item => item.time_point))].sort((a, b) => a - b);
            
            // Create datasets by wavelength (each wavelength is a line across time points)
            const datasets = wavelengths.map(wavelength => {
                const wavelengthData = data.filter(d => d.wavelength === wavelength);
                return {
                    label: `${wavelength}nm`,
                    data: timePoints.map(time => {
                        const point = wavelengthData.find(d => d.time_point === time);
                        return point ? point.absorbance : null;
                    }),
                    borderWidth: 1,
                    borderColor: `hsl(${(wavelength % 360)}deg, 70%, 50%)`,
                    pointRadius: 3,
                    showLine: true,
                    fill: false
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
                            position: 'right',
                            labels: {
                                boxWidth: 20
                            }
                        }
                    }
                }
            });
            
            console.log("Main chart updated successfully");
        } catch (error) {
            console.error("Error updating main chart:", error);
            // Reset the chart instance if there was an error
            currentChart = null;
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
                th.textContent = `${time * measurementInterval} min`;  // Show time in minutes
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
    // Check if we're on the Measurements page
    const measurementsPage = document.querySelector('.measurements-container');
    
    clearLoginState();
    resetToLoggedOutState();
    
    // If we're on the Measurements page, redirect to home
    if (measurementsPage) {
        $("#navbar-placeholder").load("home.html");
    }
    
    // Clear form fields if they exist
    const loginForm = document.querySelector('.login');
    if (loginForm) {
        loginForm.reset();
    }
});


formboxlogin.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission behavior
    const LPassword = document.getElementById('lpassword');
    const LEmail = document.getElementById('lemail');
    // Access form elements by their IDs or names
    pass =  RPassword.value;
    email = REmail.value;

    login(pass, email);
});

async function login(pass, email) {
    try {
        // Clear any existing session
        clearLoginState();
        
        const response = await fetch('http://localhost:8000/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
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
            updateUIForLoggedInState(email, data.admin);
            saveLoginState(email, data.admin);
            alert("Welcome!");
        } else {
            alert("Login failed: " + (data.message || "Invalid credentials"));
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

    const REmail = document.getElementById('remail');
    const RPassword = document.getElementById('rpassword');
    const RBirthday = document.getElementById('Birthday');

    const email = REmail.value;
    const password = RPassword.value;
    const birthday = RBirthday.value;

    try {
        const response = await fetch('http://localhost:8000/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
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
            REmail.value = '';
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



async function  ifUser(user) {
    try {
        const resp1 = await fetch(`http://localhost:8000/users/${user.email}`);
        const data1 = await resp1.json();

        const resp2 = await fetch(`http://localhost:8000/users/${user.password}`);
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
    const users = await getData()
    const tableEl = document.getElementById("tbl")

    users.forEach(user => {
        // create elements
        const newTr = document.createElement("tr") // <tr></tr>
        const tdName = document.createElement("td") // <td></td>
        const tdAge = document.createElement("td") // <td></td>

        // insert data to the new columns
        tdName.textContent = user.email
        tdAge.textContent = user.password

        // append the new columns to the new row
        newTr.appendChild(tdName)
        newTr.appendChild(tdAge)

        // append the new row to the table
        tableEl.appendChild(newTr)

    })
}

async function getData() {
    console.log("get data");
    const resp = await fetch("http://localhost:8000/users")
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
    
    const resp = await fetch(`http://localhost:8000/users/${user.email}`, fetchParams)
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

// Update the document ready handler to call setupViewTabs
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, initializing UI...");
    setupViewTabs();
    checkLoginState();
});

// Function to activate a task
function activateTask(taskId) {
    return fetch(`/api/tasks/${taskId}/activate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Failed to activate task') });
        }
        return response.json();
    })
    .then(data => {
        console.log('Task activated:', data);
        updateTaskButtons();
        return data;
    })
    .catch(error => {
        console.error('Activation error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    });
}

// Function to deactivate a task
function deactivateTask(taskId) {
    return fetch(`/api/tasks/${taskId}/deactivate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Failed to deactivate task') });
        }
        return response.json();
    })
    .then(data => {
        console.log('Task deactivated:', data);
        updateTaskButtons();
        return data;
    })
    .catch(error => {
        console.error('Deactivation error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    });
}

// Function to check task status
function checkTaskStatus(taskId) {
    return fetch(`/api/tasks/${taskId}/status`)
    .then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                return { is_active: false, exists: false };
            }
            return response.json().then(err => { throw new Error(err.error || 'Failed to check task status') });
        }
        return response.json();
    })
    .then(data => {
        console.log('Task status:', data);
        return data;
    })
    .catch(error => {
        console.error('Status check error:', error);
        return { is_active: false, error: error.message };
    });
}

// Function to handle the start/stop button click
function handleStartStopClick(taskId, button) {
    // Disable the button to prevent multiple clicks
    button.disabled = true;
    
    // Check current status
    checkTaskStatus(taskId)
    .then(status => {
        if (status.is_active) {
            // Task is active, deactivate it
            return deactivateTask(taskId);
        } else {
            // Task is not active, activate it
            return activateTask(taskId);
        }
    })
    .finally(() => {
        // Re-enable the button
        button.disabled = false;
        // Update the task list to reflect changes
        loadTasks();
    });
}

// Function to update all task buttons based on their status
function updateTaskButtons() {
    const taskButtons = document.querySelectorAll('.task-item .start-stop-btn');
    
    taskButtons.forEach(button => {
        const taskId = button.getAttribute('data-task-id');
        
        checkTaskStatus(taskId)
        .then(status => {
            if (status.is_active) {
                button.textContent = 'Stop';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
            } else {
                button.textContent = 'Start';
                button.classList.remove('btn-danger');
                button.classList.add('btn-success');
            }
        });
    });
}

// Update the loadTasks function to include start/stop buttons with proper state
function loadTasks() {
    fetch('/api/tasks')
    .then(response => response.json())
    .then(tasks => {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            taskList.innerHTML = '<div class="no-tasks">No tasks available. Create a new task to begin.</div>';
            return;
        }
        
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <div class="task-info">
                    <h3>${task.name}</h3>
                    <p>Interval: ${task.measurement_interval} minutes</p>
                    <p>Wavelength: ${task.wavelength_start} - ${task.wavelength_end} nm (step: ${task.wavelength_step})</p>
                </div>
                <div class="task-actions">
                    <button class="btn view-btn" data-task-id="${task.id}">View Data</button>
                    <button class="btn start-stop-btn ${task.is_active ? 'btn-danger' : 'btn-success'}" 
                            data-task-id="${task.id}">${task.is_active ? 'Stop' : 'Start'}</button>
                    <button class="btn btn-danger delete-btn" data-task-id="${task.id}">Delete</button>
                </div>
            `;
            
            taskList.appendChild(taskItem);
            
            // Add click event for view button
            taskItem.querySelector('.view-btn').addEventListener('click', () => {
                viewTaskData(task.id, task.name);
            });
            
            // Add click event for start/stop button
            taskItem.querySelector('.start-stop-btn').addEventListener('click', event => {
                handleStartStopClick(task.id, event.target);
            });
            
            // Add click event for delete button
            taskItem.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete task "${task.name}"?`)) {
                    deleteTask(task.id);
                }
            });
        });
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks. Please try again.', 'error');
    });
}

// Update to ensure we're checking task status periodically
function setupPeriodicStatusCheck() {
    // Check status every 10 seconds
    setInterval(() => {
        updateTaskButtons();
    }, 10000);
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    setupPeriodicStatusCheck();
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
function updateUIForLoggedInState(email, isAdmin) {
    btnPopup.classList.remove('button');
    btnPopup.classList.add('loged');
    logedB.classList.remove('loged');
    logedB.classList.add('button');
    wrapper.classList.remove('active-popup');
    logedName.innerHTML = "Welcome " + email;
    
    if (isAdmin) {
        admainP.classList.remove('privet');
        isAdmain = true;
    }
    
    loged = true;
}

function resetToLoggedOutState() {
    btnPopup.classList.remove('loged');
    btnPopup.classList.add('button');
    logedB.classList.remove('button');
    logedB.classList.add('loged');
    wrapper.classList.remove('active-popup');
    logedName.innerHTML = "";
    
    if (isAdmain) {
        admainP.classList.add('privet');
        isAdmain = false;
    }
    
    loged = false;
}

// Session management functions
function saveLoginState(email, isAdmin) {
    // Set secure HTTP-only cookies
    const expires = new Date(Date.now() + (4 * 60 * 60 * 1000)); // 4 hours from now
    document.cookie = `sessionId=${generateSecureToken()}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    document.cookie = `userEmail=${encodeURIComponent(email)}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    document.cookie = `isAdmin=${isAdmin}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    document.cookie = `lastActivity=${Date.now()}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
}

function clearLoginState() {
    // Clear all cookies by setting their expiration to the past
    const pastDate = new Date(0).toUTCString();
    document.cookie = `sessionId=; expires=${pastDate}; path=/; secure; samesite=strict`;
    document.cookie = `userEmail=; expires=${pastDate}; path=/; secure; samesite=strict`;
    document.cookie = `isAdmin=; expires=${pastDate}; path=/; secure; samesite=strict`;
    document.cookie = `lastActivity=; expires=${pastDate}; path=/; secure; samesite=strict`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function checkLoginState() {
    const sessionId = getCookie('sessionId');
    const userEmail = getCookie('userEmail');
    const isAdmin = getCookie('isAdmin') === 'true';
    const lastActivity = parseInt(getCookie('lastActivity') || '0');
    
    // Check if we're on the Measurements page
    const measurementsPage = document.querySelector('.measurements-container');
    
    if (!sessionId || !userEmail) {
        resetToLoggedOutState();
        // If we're on the Measurements page, redirect to home
        if (measurementsPage) {
            $("#navbar-placeholder").load("home.html");
        }
        return;
    }
    
    // Check for session inactivity (30 minutes)
    if (Date.now() - lastActivity > 30 * 60 * 1000) {
        clearLoginState();
        resetToLoggedOutState();
        // If we're on the Measurements page, redirect to home
        if (measurementsPage) {
            $("#navbar-placeholder").load("home.html");
        }
        return;
    }
    
    // Update last activity
    const expires = new Date(Date.now() + (4 * 60 * 60 * 1000));
    document.cookie = `lastActivity=${Date.now()}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    
    // Update UI for logged in state
    updateUIForLoggedInState(decodeURIComponent(userEmail), isAdmin);
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

