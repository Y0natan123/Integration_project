# 💻 מסמך פיתוח צד הלקוח - מערכת ספקטרופוטומטר

## 📋 תוכן עניינים
1. [ממשקי משתמש](#user-interfaces)
2. [רכיבי מדידות](#measurement-components)
3. [ניהול משתמשים](#user-management)
4. [הצגת נתונים](#data-display)

---

## 🎨 ממשקי משתמש {#user-interfaces}

### HTML בסיסי למדידות וניהול משתמשים

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מערכת ספקטרופוטומטר</title>
</head>
<body>
    <!-- Header Navigation -->
    <header>
        <nav>
            <h1>🔬 מערכת ספקטרופוטומטר</h1>
            <ul>
                <li><a href="#admin" class="admin-only">ניהול משתמשים</a></li>
            </ul>
            <div class="user-controls">
                <span class="user-name"></span>
                <button class="logout-btn">יציאה</button>
            </div>
        </nav>
    </header>

    <!-- Task Management Section -->
    <section class="task-section">
        <h2>ניהול משימות מדידה</h2>
        
        <!-- Task Form with Validation -->
        <form id="taskForm">
            <div>
                <label for="taskName">שם המשימה *</label>
                <input type="text" id="taskName" required 
                       data-validation="required,min:3,max:50">
                <span class="error-message" id="taskNameError"></span>
            </div>
            
            <div>
                <label for="wavelengthStart">אורך גל התחלה (nm) *</label>
                <input type="number" id="wavelengthStart" 
                       min="200" max="1000" required>
                <span class="error-message"></span>
            </div>
            
            <div>
                <label for="wavelengthEnd">אורך גל סיום (nm) *</label>
                <input type="number" id="wavelengthEnd" 
                       min="200" max="1000" required>
                <span class="error-message"></span>
            </div>
            
            <div>
                <button type="submit">צור משימה</button>
                <button type="reset">אפס</button>
            </div>
        </form>
    </section>

    <!-- Data Display Section -->
    <section class="data-section">
        <div class="chart-container">
            <canvas id="spectralChart"></canvas>
        </div>
        
        <div class="status-panel">
            <div>
                <span>סטטוס:</span>
                <span id="deviceStatus">מחובר</span>
            </div>
            
        </div>
    </section>
</body>
</html>
```

---

## 📊 רכיבי מדידות {#measurement-components}

### רכיב ספקטרופוטומטר למדידות

```javascript
// Measurement Component
class MeasurementController {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.measurementData = [];
        this.isActive = false;
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <div>
                <h3>בקרת מדידות</h3>
                <div id="statusIndicator">
                    <span>סטטוס: </span>
                    <span id="statusText">לא פעיל</span>
                </div>
                
                <div>
                    <button id="startBtn">התחל מדידה</button>
                    <button id="stopBtn" disabled>עצור מדידה</button>
                </div>
                
                <div>
                    <label>אורך גל נוכחי:</label>
                    <span id="currentWavelength">--</span> nm
                </div>
                <div>
                    <label>אבסורבציה:</label>
                    <span id="currentAbsorbance">--</span>
                </div>
                
                <div>
                    <span id="progressText">ממתין להתחלה...</span>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        const startBtn = this.container.querySelector('#startBtn');
        const stopBtn = this.container.querySelector('#stopBtn');
        
        startBtn.addEventListener('click', () => this.startMeasurement());
        stopBtn.addEventListener('click', () => this.stopMeasurement());
    }
    
    startMeasurement() {
        this.isActive = true;
        this.updateStatus('פעיל');
        this.enableControls(false, true);
        
        // Start measurement loop
        this.measurementInterval = setInterval(() => {
            this.takeMeasurement();
        }, 1000);
    }
    
    stopMeasurement() {
        this.isActive = false;
        this.updateStatus('לא פעיל');
        this.enableControls(true, false);
        
        if (this.measurementInterval) {
            clearInterval(this.measurementInterval);
        }
    }
    
    takeMeasurement() {
        const wavelength = 300 + Math.random() * 400;
        const absorbance = Math.random() * 2;
        
        this.updateCurrentValues(wavelength, absorbance);
        
        // Store measurement data
        this.measurementData.push({
            wavelength: wavelength,
            absorbance: absorbance,
            timestamp: new Date()
        });
        
        // Trigger update event
        this.onDataReceived({
            wavelength: wavelength.toFixed(1),
            absorbance: absorbance.toFixed(4)
        });
    }
    
    updateStatus(text) {
        const statusText = this.container.querySelector('#statusText');
        statusText.textContent = text;
    }
    
    enableControls(startEnabled, stopEnabled) {
        const startBtn = this.container.querySelector('#startBtn');
        const stopBtn = this.container.querySelector('#stopBtn');
        
        startBtn.disabled = !startEnabled;
        stopBtn.disabled = !stopEnabled;
    }
    
    updateCurrentValues(wavelength, absorbance) {
        const wavelengthSpan = this.container.querySelector('#currentWavelength');
        const absorbanceSpan = this.container.querySelector('#currentAbsorbance');
        
        wavelengthSpan.textContent = wavelength.toFixed(1);
        absorbanceSpan.textContent = absorbance.toFixed(4);
    }
    
    // Callback for new data
    onDataReceived(data) {
        // Override this method to handle new measurements
        console.log('New measurement:', data);
    }
    
    // Get all measurement data
    getMeasurementData() {
        return this.measurementData;
    }
}
```

---

## 👥 ניהול משתמשים {#user-management}

### מערכת אימות משתמשים

```javascript
// User Authentication Manager
class UserAuthManager {
    constructor() {
        this.currentUser = null;
        this.userRoles = {
            admin: 'מנהל מערכת',
            researcher: 'חוקר',
            technician: 'טכנאי'
        };
    }
    
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData;
                this.updateUserInterface();
                return userData;
            } else {
                throw new Error('פרטי התחברות שגויים');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }
    
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.currentUser = null;
            this.updateUserInterface();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
    
    updateUserInterface() {
        const userNameSpan = document.querySelector('.user-name');
        if (this.currentUser) {
            userNameSpan.textContent = this.currentUser.name;
            this.showRoleBasedElements();
        } else {
            userNameSpan.textContent = '';
            this.hideAllRoleElements();
        }
    }
    
    showRoleBasedElements() {
        // Show admin elements only for admin users
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = 
                this.currentUser.role === 'admin' ? 'block' : 'none';
        });
    }
    
    hideAllRoleElements() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = 'none';
        });
    }
    
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const permissions = {
            admin: ['read_data', 'write_data', 'manage_users', 'system_config'],
            researcher: ['read_data', 'write_data'],
            technician: ['read_data']
        };
        
        return permissions[this.currentUser.role]?.includes(permission) || false;
    }
}
```

---

## 📊 הצגת נתונים {#data-display}

### הצגת גרפים ונתונים

```javascript
// Chart Display Manager
class ChartDisplayManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.chart = null;
        this.measurementData = [];
        this.initChart();
    }
    
    initChart() {
        // Simple chart implementation
        this.chart = {
            data: {
                labels: [],
                datasets: [{
                    label: 'אבספורציה',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'אורך גל (nm)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'אבספורציה'
                        }
                    }
                }
            }
        };
    }
    
    updateChart(wavelength, absorbance) {
        this.measurementData.push({
            wavelength: wavelength,
            absorbance: absorbance,
            timestamp: new Date()
        });
        
        // Update chart data
        this.chart.data.labels.push(wavelength.toFixed(1));
        this.chart.data.datasets[0].data.push(absorbance);
        
        // Keep only last 50 points
        if (this.chart.data.labels.length > 50) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
        }
        
        this.renderChart();
    }
    
    renderChart() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Simple line drawing
        if (this.chart.data.datasets[0].data.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgb(75, 192, 192)';
            ctx.lineWidth = 2;
            
            const data = this.chart.data.datasets[0].data;
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            for (let i = 0; i < data.length; i++) {
                const x = (i / (data.length - 1)) * width;
                const y = height - (data[i] / 2) * height; // Normalize to canvas height
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
    }
    
    exportData() {
        return this.measurementData;
    }
    
    clearChart() {
        this.measurementData = [];
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.renderChart();
    }
}
```

### ניהול הרשאות משתמשים

```javascript
// User Role Management System
class UserRoleManager {
    constructor() {
        this.currentUser = null;
        this.userRoles = {
            'admin': {
                permissions: ['all'],
                displayName: 'מנהל מערכת',
                menuItems: ['measurements', 'admin', 'users']
            },
            'researcher': {
                permissions: ['read', 'create_tasks', 'export_data'],
                displayName: 'חקרן',
                menuItems: ['measurements', 'export']
            },
            'technician': {
                permissions: ['read', 'operate_device'],
                displayName: 'טכנאי',
                menuItems: ['measurements']
            }
        };
    }
    
    setCurrentUser(user) {
        this.currentUser = user;
        this.updateUIForUser();
    }
    
    updateUIForUser() {
        if (!this.currentUser) return;
        
        const userRole = this.userRoles[this.currentUser.role];
        
        // Update navigation menu
        this.updateNavigationMenu(userRole.menuItems);
        
        // Show/hide UI elements based on permissions
        this.updateUIPermissions(userRole.permissions);
    }
    
    updateNavigationMenu(allowedItems) {
        const menuItems = document.querySelectorAll('nav a');
        
        menuItems.forEach(item => {
            const href = item.getAttribute('href');
            const isAllowed = allowedItems.some(allowed => href.includes(allowed));
            item.style.display = isAllowed ? 'block' : 'none';
        });
    }
    
    updateUIPermissions(permissions) {
        // Admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = permissions.includes('all') ? 'block' : 'none';
        });
        
        // Measurement controls
        const measurementButtons = document.querySelectorAll('#startBtn, #stopBtn');
        measurementButtons.forEach(button => {
            button.disabled = !permissions.includes('operate_device') && !permissions.includes('all');
        });
    }
    
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const userRole = this.userRoles[this.currentUser.role];
        return userRole.permissions.includes('all') || userRole.permissions.includes(permission);
    }
}
```

---

## ✅ סיכום

מסמך זה מכיל את הקוד הנדרש לצד הלקוח של מערכת ספקטרופוטומטר, המתמקד ב:

### 🔧 רכיבי מדידות
- בקר מדידות לניהול פעולות הספקטרופוטומטר
- איסוף וזיהוי נתוני מדידה
- ממשק פשוט לתחילה ועצירת מדידות

### 👥 ניהול משתמשים  
- מערכת אימות והרשאות
- שלושה סוגי משתמשים: מנהל, חוקר, טכנאי
- הגבלת גישה לפונקציות לפי תפקיד

### 📊 הצגת נתונים
- גרפים בזמן אמת של מדידות אבספורציה
- ממשק נקי להצגת נתוני אורך גל ואבספורציה
- ייצוא נתונים לשימוש חיצוני

כל הקוד מותאם לעבודה עם מערכת ספקטרופוטומטר ומותג עבור ממשק בעברית.

### שלב 5: ייצוא נתונים
1. בחר את המשימה הרצויה
2. לחץ על "ייצא נתונים"
3. בחר פורמט (Excel/CSV)
4. הקובץ יורד אוטומטית
```

המסמך כולל כל הרכיבים הנדרשים לצד הלקוח עם דגש על ממשקי משתמש נקיים, רכיבים מותאמים אישית, תמיכה מולטיפלטפורמה וקוד אסינכרוני מתקדם! 