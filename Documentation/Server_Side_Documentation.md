# 🖥️ מסמך פיתוח צד השרת - מערכת ספקטרופוטומטר

## 📋 תוכן עניינים
1. [שכבת Model](#model-layer)
2. [שכבת ViewModel](#viewmodel-layer)
3. [אבטחה ותקיפות](#security-layer)
4. [שכבת שירותי רשת](#network-services-layer)
5. [שכבת BusinessLogic](#business-logic-layer)

---

## 🏗️ שכבת Model - נתונים להרכבה של כל התחומים {#model-layer}

### תרשים UML של מחלקות הנתונים

```javascript
// 👤 User Model
class User {
    constructor(id, name, password, admin, birthday) {
        this.id = id;
        this.name = name;
        this.password = password;
        this.admin = admin || 0;
        this.birthday = birthday;
    }
    
    validateUser() {
        if (!this.name || this.name.length < 2) {
            throw new Error('שם משתמש חייב להכיל לפחות 2 תווים');
        }
        if (!this.password || this.password.length < 6) {
            throw new Error('סיסמה חייבת להכיל לפחות 6 תווים');
        }
        return true;
    }
    
    isAdmin() {
        return this.admin === 1;
    }
}

// 📋 Task Model
class Task {
    constructor(id, userId, name, measurementInterval, wavelengths) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.measurementInterval = measurementInterval;
        this.wavelengths = wavelengths;
        this.createdAt = new Date();
        this.isActive = false;
    }
    
    validateTask() {
        if (!this.name || this.name.length < 3) {
            throw new Error('שם המשימה חייב להכיל לפחות 3 תווים');
        }
        if (this.measurementInterval < 1) {
            throw new Error('תדירות מדידה חייבת להיות לפחות דקה אחת');
        }
        this.validateWavelengths();
        return true;
    }
    
    validateWavelengths() {
        const wl = this.wavelengths;
        if (!wl.start || !wl.end || !wl.step) {
            throw new Error('חסרים פרמטרי אורכי גל');
        }
        if (wl.start >= wl.end) {
            throw new Error('אורך גל התחלה חייב להיות קטן מאורך גל סיום');
        }
        if (wl.step <= 0) {
            throw new Error('צעד אורך גל חייב להיות חיובי');
        }
    }
}
```

---

## 🔄 שכבת ViewModel {#viewmodel-layer}

```javascript
// 👥 UserViewModel
class UserViewModel {
    constructor(userModel) {
        this.id = userModel.id;
        this.name = userModel.name;
        this.admin = userModel.admin;
        this.birthday = userModel.birthday;
    }
    
    static fromModel(userModel) {
        return new UserViewModel(userModel);
    }
}

// 📋 TaskViewModel
class TaskViewModel {
    constructor(taskModel, notesCount = 0, measurementsCount = 0) {
        this.id = taskModel.id;
        this.name = taskModel.name;
        this.measurementInterval = taskModel.measurementInterval;
        this.wavelengths = taskModel.wavelengths;
        this.isActive = taskModel.isActive;
        this.notesCount = notesCount;
        this.measurementsCount = measurementsCount;
    }
}
```

---

## 🔒 אבטחה ותקיפות {#security-layer}

### הליך א-סינכרוני

```javascript
class AsyncDatabaseManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
    }
    
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            db.all(sql, params, (err, rows) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}
```

### הגנת SQL Injection

```javascript
class SecureDataAccess {
    // ❌ WRONG - פגיע ל-SQL injection
    async unsafeUserQuery(userName) {
        const sql = `SELECT * FROM users WHERE name = '${userName}'`;
        return await this.dbManager.query(sql);
    }
    
    // ✅ CORRECT - בטוח עם פרמטרים
    async safeUserQuery(userName) {
        const sql = 'SELECT * FROM users WHERE name = ?';
        return await this.dbManager.query(sql, [userName]);
    }
    
    validateUserInput(userData) {
        if (!userData.name || typeof userData.name !== 'string') {
            throw new Error('שם משתמש לא תקין');
        }
        
        // סניטציה
        userData.name = userData.name.replace(/[<>\"'%;()&+]/g, '');
        
        if (userData.name.length < 2 || userData.name.length > 50) {
            throw new Error('שם משתמש חייב להיות בין 2-50 תווים');
        }
    }
}
```

---

## 🌐 שכבת שירותי רשת {#network-services-layer}

### Interface ומימוש

```javascript
// Network Service Interface
class INetworkService {
    async get(endpoint, params = {}) {
        throw new Error('Method must be implemented');
    }
    
    async post(endpoint, data = {}) {
        throw new Error('Method must be implemented');
    }
}

// HTTP Service Implementation
class HTTPService extends INetworkService {
    constructor(baseURL, timeout = 5000) {
        super();
        this.baseURL = baseURL;
        this.timeout = timeout;
    }
    
    async get(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => 
            url.searchParams.append(key, params[key])
        );
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        return await this.handleResponse(response);
    }
    
    async handleResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }
}
```

### API Endpoints - CRUD Operations

```javascript
class SpectrophotometerAPI {
    constructor(httpService) {
        this.http = httpService;
    }
    
    // Users CRUD
    async getUsers() {
        return await this.http.get('/api/users');
    }
    
    async createUser(userData) {
        return await this.http.post('/api/users', userData);
    }
    
    async updateUser(userId, userData) {
        return await this.http.put(`/api/users/${userId}`, userData);
    }
    
    async deleteUser(userId) {
        return await this.http.delete(`/api/users/${userId}`);
    }
    
    // Tasks CRUD
    async getTasks() {
        return await this.http.get('/api/tasks');
    }
    
    async createTask(taskData) {
        return await this.http.post('/api/tasks', taskData);
    }
    
    async toggleTaskStatus(taskId, isActive) {
        return await this.http.post(`/api/tasks/${taskId}/toggle`, { active: isActive });
    }
    
    // Measurements
    async getTaskMeasurements(taskId) {
        return await this.http.get(`/api/tasks/${taskId}/measurements`);
    }
    
    async exportTaskData(taskId, format = 'excel') {
        return await this.http.get(`/api/tasks/${taskId}/export`, { format });
    }
}
```

---

## 💼 שכבת BusinessLogic {#business-logic-layer}

### לוגיקה עסקית ראשית

```javascript
class SpectrophotometerBusinessLogic {
    constructor(dataAccess, networkService) {
        this.dataAccess = dataAccess;
        this.api = networkService;
        this.workerManager = require('./worker_manager');
    }
    
    // אימות משתמש
    async authenticateUser(username, password) {
        try {
            const hashedPassword = this.dataAccess.hashPassword(password);
            const users = await this.dataAccess.safeUserQuery(username);
            const user = users.find(u => u.password === hashedPassword);
            
            if (!user) {
                throw new Error('שם משתמש או סיסמה שגויים');
            }
            
            const sessionToken = this.generateSessionToken();
            await this.createUserSession(user.id, sessionToken);
            
            return {
                user: UserViewModel.fromModel(user),
                sessionToken: sessionToken
            };
            
        } catch (error) {
            throw new Error('שגיאה באימות משתמש');
        }
    }
    
    // יצירת משימה עם וולידציה
    async createTaskWithValidation(taskData, userId) {
        try {
            const task = new Task(
                null,
                userId,
                taskData.name,
                taskData.measurement_interval,
                {
                    start: taskData.wavelength_start,
                    end: taskData.wavelength_end,
                    step: taskData.wavelength_step
                }
            );
            
            task.validateTask();
            await this.validateTaskBusinessRules(task, userId);
            
            const result = await this.createTaskInDatabase(task);
            task.id = result.taskId;
            
            return new TaskViewModel(task);
            
        } catch (error) {
            throw error;
        }
    }
    
    // בדיקת חוקים עסקיים
    async validateTaskBusinessRules(task, userId) {
        const userTasks = await this.getUserTasks(userId);
        const maxTasksPerUser = 10;
        
        if (userTasks.length >= maxTasksPerUser) {
            throw new Error(`משתמש יכול ליצור עד ${maxTasksPerUser} משימות`);
        }
        
        const duplicateTask = userTasks.find(t => t.name === task.name);
        if (duplicateTask) {
            throw new Error('משתמש כבר יש משימה בשם זה');
        }
        
        if (task.measurementInterval > 1440) {
            throw new Error('תדירות מדידה לא יכולה לעלות על 24 שעות');
        }
    }
    
    // התחלת איסוף נתונים
    async startDataCollection(taskId, userId) {
        try {
            await this.verifyTaskOwnership(taskId, userId);
            
            const taskStatus = this.workerManager.getTaskStatus(taskId);
            if (taskStatus.active) {
                throw new Error('המשימה כבר פועלת');
            }
            
            const result = await this.workerManager.activateTask(taskId);
            
            if (!result.success) {
                throw new Error(`שגיאה בהפעלת משימה: ${result.message}`);
            }
            
            await this.logUserActivity(userId, 'TASK_STARTED', taskId);
            
            return {
                success: true,
                message: 'איסוף נתונים הופעל בהצלחה'
            };
            
        } catch (error) {
            throw error;
        }
    }
    
    // ניתוח נתוני משימה
    async getTaskAnalysis(taskId, userId) {
        try {
            await this.verifyTaskAccess(taskId, userId);
            
            const measurements = await this.getTaskMeasurements(taskId);
            const taskInfo = await this.getTaskById(taskId);
            
            const analysis = new TaskAnalysis(measurements, taskInfo);
            
            return {
                summary: analysis.getSummary(),
                statistics: analysis.getStatistics(),
                recommendations: analysis.getRecommendations()
            };
            
        } catch (error) {
            throw error;
        }
    }
    
    // פונקציות עזר
    generateSessionToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }
    
    async verifyTaskOwnership(taskId, userId) {
        const task = await this.getTaskById(taskId);
        if (task.userId !== userId) {
            throw new Error('אין הרשאה לגשת למשימה זו');
        }
    }
    
    async logUserActivity(userId, action, taskId = null) {
        const logEntry = {
            userId: userId,
            action: action,
            taskId: taskId,
            timestamp: new Date()
        };
        
        console.log('User Activity:', logEntry);
    }
}
```

### מחלקת ניתוח נתונים

```javascript
class TaskAnalysis {
    constructor(measurements, taskInfo) {
        this.measurements = measurements;
        this.taskInfo = taskInfo;
    }
    
    getSummary() {
        return {
            totalMeasurements: this.measurements.length,
            timeRange: this.getTimeRange(),
            wavelengthRange: this.getWavelengthRange(),
            averageAbsorbance: this.getAverageAbsorbance()
        };
    }
    
    getStatistics() {
        const absorbances = this.measurements.map(m => m.absorbance);
        
        return {
            min: Math.min(...absorbances),
            max: Math.max(...absorbances),
            mean: absorbances.reduce((a, b) => a + b, 0) / absorbances.length,
            standardDeviation: this.calculateStandardDeviation(absorbances)
        };
    }
    
    getRecommendations() {
        const stats = this.getStatistics();
        const recommendations = [];
        
        if (stats.standardDeviation > 0.1) {
            recommendations.push('נתגלו שינויים גדולים בערכי האבסורבציה');
        }
        
        if (stats.max > 2.0) {
            recommendations.push('נמדדו ערכי אבסורבציה גבוהים');
        }
        
        return recommendations;
    }
    
    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
    
    getTimeRange() {
        const timePoints = this.measurements.map(m => m.timePoint);
        return {
            start: Math.min(...timePoints),
            end: Math.max(...timePoints)
        };
    }
    
    getWavelengthRange() {
        const wavelengths = [...new Set(this.measurements.map(m => m.wavelength))];
        return {
            start: Math.min(...wavelengths),
            end: Math.max(...wavelengths),
            count: wavelengths.length
        };
    }
    
    getAverageAbsorbance() {
        const sum = this.measurements.reduce((acc, m) => acc + m.absorbance, 0);
        return sum / this.measurements.length;
    }
}
```

---

## 🗂️ מבנה קבצים מומלץ

```
server/
├── models/
│   ├── User.js
│   ├── Task.js
│   ├── Note.js
│   └── AbsorbanceData.js
├── viewModels/
│   ├── UserViewModel.js
│   ├── TaskViewModel.js
│   └── ChartDataViewModel.js
├── businessLogic/
│   ├── SpectrophotometerBusinessLogic.js
│   ├── TaskAnalysis.js
│   └── UserManagement.js
├── dataAccess/
│   ├── SecureDataAccess.js
│   ├── AsyncDatabaseManager.js
│   └── XMLConfigManager.js
├── services/
│   ├── HTTPService.js
│   ├── SpectrophotometerAPI.js
│   └── NetworkService.js
├── controllers/
│   ├── UsersController.js
│   ├── TasksController.js
│   └── MeasurementsController.js
└── config/
    ├── database.js
    ├── server.js
    └── spectrophotometer.xml
```

---

## ✅ עקרונות מפתח

### 1. הפרדת תחומים
- כל שכבה אחראית על תחום ספציפי
- Model מכיל רק לוגיקת נתונים
- BusinessLogic מכיל חוקים עסקיים
- DataAccess מטפל בבסיס נתונים

### 2. אבטחה מתקדמת
- הגנה מפני SQL Injection
- וולידציה בכל שכבה
- הצפנת סיסמאות
- ניהול הפעלות (Sessions)

### 3. פעולות א-סינכרוניות
- שימוש ב-async/await
- טיפול בשגיאות מתקדם
- ביצועים מיטביים

### 4. ניתנות לתחזוקה
- קוד מובנה וברור
- תיעוד מפורט
- דפוסי עיצוב מוכרים

המסמך מספק בסיס מוצק לפיתוח צד השרת עם דגש על איכות, אבטחה וביצועים. 