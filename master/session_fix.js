/**
 * COMPREHENSIVE SESSION MANAGEMENT FIX
 * This script fixes all the session disconnect issues
 */

// Enhanced session configuration
const SESSION_CONFIG = {
    // Extended timeouts to prevent frequent disconnections
    COOKIE_LIFETIME: 24 * 60 * 60 * 1000,        // 24 hours (was 4 hours)
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000,         // 8 hours (was 30 minutes)
    ACTIVITY_CHECK_INTERVAL: 5 * 60 * 1000,      // 5 minutes (was 1 minute)
    INACTIVITY_CHECK_INTERVAL: 30 * 60 * 1000,   // 30 minutes (was 5 minutes)
    
    // Activity refresh settings
    ACTIVITY_REFRESH_THRESHOLD: 10 * 60 * 1000,  // Refresh activity every 10 minutes
    PERSISTENT_LOGIN: true                        // Enable persistent login across browser sessions
};

// Enhanced login function with better session management
async function enhancedLogin(pass, name) {
    try {
        // Clear any existing session
        clearLoginState();
        
        const response = await fetch(`${SERVER_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: name,
                password: pass
            }),
            credentials: 'include'
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
            saveEnhancedLoginState(name, data.user.admin);
            
            // Set long-lasting cookies with proper settings
            const expires = new Date(Date.now() + SESSION_CONFIG.COOKIE_LIFETIME);
            const cookieSettings = `expires=${expires.toUTCString()}; path=/; samesite=lax`; // Removed secure for localhost compatibility
            
            document.cookie = `sessionId=authenticated; ${cookieSettings}`;
            document.cookie = `userEmail=${name}; ${cookieSettings}`;
            document.cookie = `isAdmin=${data.user.admin}; ${cookieSettings}`;
            document.cookie = `lastActivity=${Date.now()}; ${cookieSettings}`;
            document.cookie = `loginTime=${Date.now()}; ${cookieSettings}`;

            console.log('✅ Enhanced login successful - session will last 24 hours');
            alert("Welcome! You'll stay logged in for 24 hours.");
        } else {
            alert("Login failed: " + (data.error || "Invalid credentials"));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert("Login failed. Please try again.");
    }
}

// Enhanced session state management
function saveEnhancedLoginState(name, isAdmin) {
    const loginData = {
        userEmail: name,
        isAdmin: isAdmin,
        isLoggedIn: true,
        loginTime: Date.now(),
        lastActivity: Date.now()
    };
    
    // Save to localStorage for persistence
    localStorage.setItem('userEmail', name);
    localStorage.setItem('isAdmin', isAdmin);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loginTime', Date.now());
    localStorage.setItem('lastActivity', Date.now());
    
    // Also save complete login data as JSON
    localStorage.setItem('loginData', JSON.stringify(loginData));
    
    console.log('✅ Enhanced login state saved to localStorage');
}

// Enhanced login state checking with better timeout logic
function enhancedCheckLoginState() {
    // Get data from both sources
    const sessionId = getCookie('sessionId');
    const userEmailFromCookie = getCookie('userEmail');
    const isAdminFromCookie = getCookie('isAdmin') === 'true';
    const lastActivityCookie = parseInt(getCookie('lastActivity') || '0');
    const loginTimeCookie = parseInt(getCookie('loginTime') || '0');
    
    const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
    const userEmailFromStorage = localStorage.getItem('userEmail');
    const isAdminFromStorage = localStorage.getItem('isAdmin') === 'true';
    const lastActivityStorage = parseInt(localStorage.getItem('lastActivity') || '0');
    const loginTimeStorage = parseInt(localStorage.getItem('loginTime') || '0');
    
    // Prefer the most recent data
    const userEmail = userEmailFromCookie || userEmailFromStorage;
    const isAdmin = isAdminFromCookie || isAdminFromStorage;
    const lastActivity = Math.max(lastActivityCookie, lastActivityStorage);
    const loginTime = Math.max(loginTimeCookie, loginTimeStorage);
    
    // Check if user is logged in from either source
    const isLoggedIn = (sessionId && userEmailFromCookie) || isLoggedInFromStorage;
    
    if (!isLoggedIn || !userEmail) {
        console.log('❌ No valid login session found');
        resetToLoggedOutState();
        // Use page persistence system if available
        if (window.pagePersistence && window.pagePersistence.navigateToHome) {
            window.pagePersistence.navigateToHome();
        } else {
            $("#navbar-placeholder").load("home.html");
        }
        return false;
    }
    
    const currentTime = Date.now();
    
    // Check for absolute session timeout (24 hours from login)
    if (currentTime - loginTime > SESSION_CONFIG.COOKIE_LIFETIME) {
        console.log('❌ Absolute session timeout (24 hours) - logging out');
        clearLoginState();
        resetToLoggedOutState();
        // Use page persistence system if available
        if (window.pagePersistence && window.pagePersistence.navigateToHome) {
            window.pagePersistence.navigateToHome();
        } else {
            $("#navbar-placeholder").load("home.html");
        }
        alert('Your session has expired after 24 hours. Please log in again.');
        return false;
    }
    
    // Check for inactivity timeout (8 hours)
    if (currentTime - lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
        console.log('❌ Inactivity timeout (8 hours) - logging out');
        clearLoginState();
        resetToLoggedOutState();
        // Use page persistence system if available
        if (window.pagePersistence && window.pagePersistence.navigateToHome) {
            window.pagePersistence.navigateToHome();
        } else {
            $("#navbar-placeholder").load("home.html");
        }
        alert('You were logged out due to 8 hours of inactivity.');
        return false;
    }
    
    // Session is valid - update activity and UI
    updateActivityTimestamp();
    loged = true;
    updateUIForLoggedInState(userEmail, isAdmin);
    
    console.log(`✅ Session valid - logged in as ${userEmail} (admin: ${isAdmin})`);
    return true;
}

// Update activity timestamp in both cookies and localStorage
function updateActivityTimestamp() {
    const currentTime = Date.now();
    
    // Update localStorage
    localStorage.setItem('lastActivity', currentTime);
    
    // Update cookie if it exists
    const sessionId = getCookie('sessionId');
    if (sessionId) {
        const expires = new Date(Date.now() + SESSION_CONFIG.COOKIE_LIFETIME);
        const cookieSettings = `expires=${expires.toUTCString()}; path=/; samesite=lax`;
        document.cookie = `lastActivity=${currentTime}; ${cookieSettings}`;
    }
}

// Enhanced activity monitoring
function setupEnhancedActivityMonitoring() {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let lastActivityUpdate = Date.now();
    
    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            const currentTime = Date.now();
            
            // Only update activity timestamp every 10 minutes to reduce overhead
            if (currentTime - lastActivityUpdate > SESSION_CONFIG.ACTIVITY_REFRESH_THRESHOLD) {
                updateActivityTimestamp();
                lastActivityUpdate = currentTime;
                console.log('🔄 Activity timestamp updated');
            }
        }, { passive: true });
    });
    
    console.log('✅ Enhanced activity monitoring setup complete');
}

// Enhanced clear login state
function enhancedClearLoginState() {
    // Clear all cookies by setting their expiration to the past
    const pastDate = new Date(0).toUTCString();
    const cookieNames = ['sessionId', 'userEmail', 'isAdmin', 'lastActivity', 'loginTime'];
    
    cookieNames.forEach(name => {
        document.cookie = `${name}=; expires=${pastDate}; path=/; samesite=lax`;
    });
    
    // Clear localStorage items
    const storageKeys = ['userEmail', 'isAdmin', 'isLoggedIn', 'loginTime', 'lastActivity', 'loginData'];
    storageKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    
    console.log('✅ Enhanced login state cleared');
}

// Setup enhanced session management
function initializeEnhancedSessionManagement() {
    console.log('🔧 Initializing enhanced session management...');
    
    // Setup activity monitoring
    setupEnhancedActivityMonitoring();
    
    // Check login state on page load
    enhancedCheckLoginState();
    
    // Periodic session checks (less frequent)
    setInterval(() => {
        enhancedCheckLoginState();
    }, SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL);
    
    // Replace existing functions
    window.login = enhancedLogin;
    window.checkLoginState = enhancedCheckLoginState;
    window.clearLoginState = enhancedClearLoginState;
    window.saveLoginState = saveEnhancedLoginState;
    
    console.log('✅ Enhanced session management initialized');
    console.log(`📊 Session settings:
        - Session duration: ${SESSION_CONFIG.SESSION_TIMEOUT / 1000 / 60 / 60} hours
        - Cookie lifetime: ${SESSION_CONFIG.COOKIE_LIFETIME / 1000 / 60 / 60} hours
        - Activity checks: every ${SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL / 1000 / 60} minutes
        - Persistent login: ${SESSION_CONFIG.PERSISTENT_LOGIN ? 'enabled' : 'disabled'}`);
}

// Initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedSessionManagement);
} else {
    initializeEnhancedSessionManagement();
} 