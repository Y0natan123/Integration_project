/**
 * PAGE PERSISTENCE SYSTEM
 * Remembers the current page and restores it after refresh
 */

// Page persistence configuration
const PAGE_PERSISTENCE = {
    STORAGE_KEY: 'currentPage',
    DEFAULT_PAGE: 'home.html',
    
    // Valid pages that can be persisted
    VALID_PAGES: [
        'home.html',
        'measurements.html', 
        'notes.html',
        'Admain.html',
        'profile.html'
    ],
    
    // Pages that require login
    PROTECTED_PAGES: [
        'measurements.html',
        'notes.html', 
        'Admain.html',
        'profile.html'
    ]
};

// Enhanced page loading function with persistence
function loadPageWithPersistence(pageName, callback = null, skipSave = false) {
    console.log(`🔄 Loading page: ${pageName}`);
    
    // Validate page name
    if (!PAGE_PERSISTENCE.VALID_PAGES.includes(pageName)) {
        console.warn(`⚠️ Invalid page: ${pageName}, defaulting to home`);
        pageName = PAGE_PERSISTENCE.DEFAULT_PAGE;
    }
    
    // Check if page requires login
    if (PAGE_PERSISTENCE.PROTECTED_PAGES.includes(pageName)) {
        const sessionId = getCookie('sessionId');
        const userEmailFromCookie = getCookie('userEmail');
        const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
        const userEmailFromStorage = localStorage.getItem('userEmail');
        
        const isLoggedIn = (sessionId && userEmailFromCookie) || isLoggedInFromStorage;
        
        if (!isLoggedIn) {
            console.log(`🔒 ${pageName} requires login, redirecting to home`);
            pageName = PAGE_PERSISTENCE.DEFAULT_PAGE;
            // Clear any saved protected page
            localStorage.removeItem(PAGE_PERSISTENCE.STORAGE_KEY);
        }
    }
    
    // Save current page to localStorage (unless explicitly skipping)
    if (!skipSave) {
        localStorage.setItem(PAGE_PERSISTENCE.STORAGE_KEY, pageName);
        console.log(`💾 Saved current page: ${pageName}`);
    }
    
    // Load the page
    $("#navbar-placeholder").load(pageName, function(response, status, xhr) {
        if (status === "error") {
            console.error(`❌ Failed to load ${pageName}: ${xhr.status} ${xhr.statusText}`);
            // Fallback to home page
            if (pageName !== PAGE_PERSISTENCE.DEFAULT_PAGE) {
                console.log(`🔄 Falling back to ${PAGE_PERSISTENCE.DEFAULT_PAGE}`);
                loadPageWithPersistence(PAGE_PERSISTENCE.DEFAULT_PAGE, callback, true);
                return;
            }
        } else {
            console.log(`✅ Successfully loaded: ${pageName}`);
            
            // Update page title
            updatePageTitle(pageName);
            
            // Call specific page initialization if needed
            initializePageSpecificFunctions(pageName);
        }
        
        // Execute callback if provided
        if (callback && typeof callback === 'function') {
            callback();
        }
    });
}

// Get the saved page from localStorage
function getSavedPage() {
    const savedPage = localStorage.getItem(PAGE_PERSISTENCE.STORAGE_KEY);
    
    if (savedPage && PAGE_PERSISTENCE.VALID_PAGES.includes(savedPage)) {
        console.log(`📖 Found saved page: ${savedPage}`);
        return savedPage;
    }
    
    console.log(`📖 No valid saved page found, using default: ${PAGE_PERSISTENCE.DEFAULT_PAGE}`);
    return PAGE_PERSISTENCE.DEFAULT_PAGE;
}

// Update page title based on current page
function updatePageTitle(pageName) {
    const pageTitles = {
        'home.html': 'Spectrophotometer System - Home',
        'measurements.html': 'Spectrophotometer System - Measurements', 
        'notes.html': 'Spectrophotometer System - Notes',
        'Admain.html': 'Spectrophotometer System - Admin',
        'profile.html': 'Spectrophotometer System - Profile'
    };
    
    document.title = pageTitles[pageName] || 'Spectrophotometer System';
}

// Initialize page-specific functions after loading
function initializePageSpecificFunctions(pageName) {
    switch(pageName) {
        case 'measurements.html':
            // Initialize measurements functionality
            if (typeof initializeMeasurements === 'function') {
                initializeMeasurements();
            }
            if (typeof setupViewTabs === 'function') {
                setupViewTabs();
            }
            // Check task statuses after loading
            setTimeout(() => {
                if (typeof checkAllTasksOnPageLoad === 'function') {
                    checkAllTasksOnPageLoad();
                }
            }, 1000);
            break;
            
        case 'notes.html':
            console.log('Notes page loaded and initialized');
            break;
            
        case 'Admain.html':
            console.log('Admin page loaded');
            break;
            
        case 'profile.html':
            console.log('Profile page loaded');
            break;
            
        case 'home.html':
        default:
            console.log('Home page loaded');
            break;
    }
}

// Enhanced navigation functions that save page state
function navigateToHome() {
    loadPageWithPersistence('home.html');
}

function navigateToMeasurements() {
    loadPageWithPersistence('measurements.html', function() {
        // Initialize Measurements functionality after content is loaded
        if (typeof initializeMeasurements === 'function') {
            initializeMeasurements();
        }
        if (typeof setupViewTabs === 'function') {
            setupViewTabs();
        }
        
        // Explicitly check all task statuses after loading
        console.log("Measurements page loaded, checking all task statuses from server");
        setTimeout(() => {
            if (typeof checkAllTasksOnPageLoad === 'function') {
                checkAllTasksOnPageLoad();
            }
        }, 1000);
    });
}

function navigateToNotes() {
    loadPageWithPersistence('notes.html', function() {
        // Notes functionality is initialized within notes.html
        console.log('Notes page loaded');
    });
}

function navigateToAdmin() {
    loadPageWithPersistence('Admain.html');
}

function navigateToProfile() {
    loadPageWithPersistence('profile.html');
}

// Initialize page persistence system
function initializePagePersistence() {
    console.log('🔧 Initializing page persistence system...');
    
    // Override the default jQuery load function in master.html
    // This ensures the saved page is loaded instead of always defaulting to home
    
    // Check login state first
    const sessionId = getCookie('sessionId');
    const userEmailFromCookie = getCookie('userEmail');
    const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
    const isLoggedIn = (sessionId && userEmailFromCookie) || isLoggedInFromStorage;
    
    let pageToLoad = PAGE_PERSISTENCE.DEFAULT_PAGE;
    
    if (isLoggedIn) {
        // User is logged in, try to restore saved page
        pageToLoad = getSavedPage();
        
        // Double-check if the saved page requires login
        if (PAGE_PERSISTENCE.PROTECTED_PAGES.includes(pageToLoad)) {
            console.log(`✅ User is logged in, restoring page: ${pageToLoad}`);
        } else {
            console.log(`✅ Loading public page: ${pageToLoad}`);
        }
    } else {
        // User not logged in, clear any saved protected pages
        const savedPage = localStorage.getItem(PAGE_PERSISTENCE.STORAGE_KEY);
        if (savedPage && PAGE_PERSISTENCE.PROTECTED_PAGES.includes(savedPage)) {
            console.log(`🔒 User not logged in, clearing saved protected page: ${savedPage}`);
            localStorage.removeItem(PAGE_PERSISTENCE.STORAGE_KEY);
        }
        pageToLoad = PAGE_PERSISTENCE.DEFAULT_PAGE;
    }
    
    // Load the determined page
    loadPageWithPersistence(pageToLoad, null, true); // Skip saving since we're restoring
    
    console.log('✅ Page persistence system initialized');
}

// Enhance existing navigation event listeners
function enhanceNavigationEventListeners() {
    // Override the existing event listeners with persistence-aware versions
    
    // Home button
    const homeBtn = document.querySelector('.home');
    if (homeBtn) {
        homeBtn.removeEventListener('click', homeBtn._originalHandler);
        homeBtn.addEventListener('click', navigateToHome);
    }
    
    // Measurements button  
    const measurementsBtn = document.querySelector('.spectro-graph');
    if (measurementsBtn) {
        measurementsBtn.removeEventListener('click', measurementsBtn._originalHandler);
        measurementsBtn.addEventListener('click', (e) => {
            // Check login first
            const sessionId = getCookie('sessionId');
            const userEmailFromCookie = getCookie('userEmail');
            const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
            const userEmailFromStorage = localStorage.getItem('userEmail');
            
            const isLoggedIn = (sessionId && userEmailFromCookie) || (isLoggedInFromStorage && userEmailFromStorage);
            
            if (!isLoggedIn) {
                alert("Please log in to access the Measurements page");
                const wrapper = document.querySelector('.wrapper');
                if (wrapper) wrapper.classList.add('active-popup');
                return;
            }
            
            navigateToMeasurements();
        });
    }
    
    // Notes button
    const notesBtn = document.querySelector('.notes-link');
    if (notesBtn) {
        notesBtn.removeEventListener('click', notesBtn._originalHandler);
        notesBtn.addEventListener('click', (e) => {
            // Check login first
            const sessionId = getCookie('sessionId');
            const userEmailFromCookie = getCookie('userEmail');
            const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';
            const userEmailFromStorage = localStorage.getItem('userEmail');
            
            const isLoggedIn = (sessionId && userEmailFromCookie) || (isLoggedInFromStorage && userEmailFromStorage);
            
            if (!isLoggedIn) {
                alert("Please log in to access the Notes page");
                const wrapper = document.querySelector('.wrapper');
                if (wrapper) wrapper.classList.add('active-popup');
                return;
            }
            
            navigateToNotes();
        });
    }
    
    // Admin button
    const adminBtn = document.querySelector('.privet');
    if (adminBtn) {
        adminBtn.removeEventListener('click', adminBtn._originalHandler);
        adminBtn.addEventListener('click', navigateToAdmin);
    }
    
    console.log('✅ Enhanced navigation event listeners');
}

// Handle logout to clear saved page
function handleLogoutPagePersistence() {
    const savedPage = localStorage.getItem(PAGE_PERSISTENCE.STORAGE_KEY);
    if (savedPage && PAGE_PERSISTENCE.PROTECTED_PAGES.includes(savedPage)) {
        console.log(`🔒 Clearing saved protected page on logout: ${savedPage}`);
        localStorage.removeItem(PAGE_PERSISTENCE.STORAGE_KEY);
    }
    // Navigate to home
    loadPageWithPersistence(PAGE_PERSISTENCE.DEFAULT_PAGE);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for other scripts to load
        setTimeout(() => {
            initializePagePersistence();
            enhanceNavigationEventListeners();
        }, 100);
    });
} else {
    setTimeout(() => {
        initializePagePersistence();
        enhanceNavigationEventListeners();
    }, 100);
}

// Export functions for use by other scripts
window.pagePersistence = {
    loadPage: loadPageWithPersistence,
    navigateToHome,
    navigateToMeasurements,
    navigateToNotes,
    navigateToAdmin,
    navigateToProfile,
    handleLogout: handleLogoutPagePersistence,
    getSavedPage
}; 