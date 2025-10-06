// ---------------------- GLOBAL STATE ----------------------
let appState = {
    masterPasswordHash: null,
    accounts: [],
    isSetup: false,
    currentOTP: null,
    otpTimestamp: null,
    currentRecoveryType: null,
    currentRecoveryEmail: null,
    pendingAccountData: null,
    isConnected: false,
    demoMode: false
};

// Configuration
const CONFIG = {
    name: "LockSafe",
    version: "2.0",
    otpValidityMinutes: 2,
    encryptionKey: "key123",
    apiBaseUrl: "http://localhost:5000/api", // Default backend URL
    passwordStrengthRules: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: "!@#$%^&*(),.?\":{}|<>"
    }
};

// ---------------------- UTILITY FUNCTIONS ----------------------

// Password visibility toggle for forms
function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

// Simple hash function (SHA-256 simulation)
function hashPassword(password) {
    let hash = 0;
    if (password.length === 0) return hash.toString();
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

// Simple AES encryption simulation
function encryptPassword(password, key) {
    const keyHash = hashPassword(key);
    let encrypted = '';
    for (let i = 0; i < password.length; i++) {
        const keyChar = keyHash[i % keyHash.length];
        encrypted += String.fromCharCode(password.charCodeAt(i) ^ keyChar.charCodeAt(0));
    }
    return btoa(encrypted);
}

// Simple AES decryption simulation
function decryptPassword(encryptedPassword, key) {
    try {
        const keyHash = hashPassword(key);
        const encrypted = atob(encryptedPassword);
        let decrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
            const keyChar = keyHash[i % keyHash.length];
            decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ keyChar.charCodeAt(0));
        }
        return decrypted;
    } catch (error) {
        return null;
    }
}

// Generate OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Check password strength
function checkPasswordStrength(password) {
    const rules = CONFIG.passwordStrengthRules;
    const issues = [];
    
    if (password.length < rules.minLength) {
        issues.push(`Password must be at least ${rules.minLength} characters long`);
    }
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
        issues.push("Password must contain at least one uppercase letter");
    }
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
        issues.push("Password must contain at least one lowercase letter");
    }
    if (rules.requireNumbers && !/\d/.test(password)) {
        issues.push("Password must contain at least one digit");
    }
    if (rules.requireSpecialChars && !new RegExp(`[${rules.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
        issues.push("Password must contain at least one special character");
    }
    
    if (issues.length === 0) {
        return { valid: true, strength: "strong", message: "Strong password!" };
    } else if (issues.length <= 2) {
        return { valid: false, strength: "medium", message: issues.join(". ") };
    } else {
        return { valid: false, strength: "weak", message: issues.join(". ") };
    }
}

// Update connection status
function updateConnectionStatus(status, message) {
    const statusElement = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    statusElement.className = `connection-status ${status}`;
    statusText.textContent = message;
    
    if (status === 'connected') {
        appState.isConnected = true;
        appState.demoMode = false;
        setTimeout(() => {
            statusElement.classList.add('hidden');
        }, 3000);
    } else if (status === 'error') {
        appState.isConnected = false;
        appState.demoMode = true;
    }
}

// Show message
function showMessage(message, type = 'info', duration = 5000) {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, duration);
}

// API calls with better error handling
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors', // Enable CORS
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        console.log(`API Call: ${method} ${CONFIG.apiBaseUrl}${endpoint}`, data);
        
        const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, options);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`API Response:`, result);
        return result;
        
    } catch (error) {
        console.error('API call failed:', error);
        
        // If we can't connect to backend, switch to demo mode
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (!appState.demoMode) {
                updateConnectionStatus('error', 'Backend server not available - Running in demo mode');
                showMessage('Backend server not connected. Running in demo mode with browser storage.', 'warning', 8000);
            }
            return handleOfflineMode(endpoint, method, data);
        }
        
        throw error;
    }
}

// Test connection to backend
async function testConnection() {
    try {
        showMessage('Testing connection...', 'info', 2000);
        const response = await fetch(CONFIG.apiBaseUrl.replace('/api', ''), { 
            method: 'GET',
            mode: 'cors'
        });
        
        if (response.ok) {
            updateConnectionStatus('connected', 'Connected to backend server');
            showMessage('Connection successful!', 'success');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        updateConnectionStatus('error', 'Cannot connect to backend - Running in demo mode');
        showMessage('Connection failed. Running in demo mode.', 'warning');
        return false;
    }
}

// Offline mode simulation
function handleOfflineMode(endpoint, method, data) {
    appState.demoMode = true;
    
    // Simulate API responses for demo purposes
    switch (endpoint) {
        case '/setup-master-password':
            if (method === 'POST' && data.password) {
                appState.masterPasswordHash = hashPassword(data.password);
                appState.isSetup = true;
                localStorage.setItem('locksafe_master', appState.masterPasswordHash);
                return { success: true, message: 'Master password set successfully (Demo Mode)' };
            }
            break;
            
        case '/verify-master-password':
            if (method === 'POST' && data.password) {
                const storedHash = localStorage.getItem('locksafe_master') || appState.masterPasswordHash;
                if (hashPassword(data.password) === storedHash) {
                    return { success: true, message: 'Password verified (Demo Mode)' };
                } else {
                    return { success: false, error: 'Incorrect master password' };
                }
            }
            break;
            
        case '/check-master-password-exists':
            const exists = localStorage.getItem('locksafe_master') || appState.masterPasswordHash;
            return { exists: !!exists };
            
        case '/send-otp':
            if (method === 'POST' && data.email) {
                appState.currentOTP = generateOTP();
                appState.otpTimestamp = Date.now();
                
                // Show OTP in debug info
                const debugElement = document.getElementById('otpDebugInfo');
                if (debugElement) {
                    debugElement.textContent = `Demo Mode - Your OTP: ${appState.currentOTP}`;
                    debugElement.style.display = 'block';
                }
                
                return { success: true, message: 'OTP generated (Demo Mode)', debug_otp: appState.currentOTP };
            }
            break;
            
        case '/verify-otp':
            if (method === 'POST' && data.otp && data.email) {
                if (appState.currentOTP === data.otp && 
                    Date.now() - appState.otpTimestamp < (CONFIG.otpValidityMinutes * 60 * 1000)) {
                    return { success: true, message: 'OTP verified successfully (Demo Mode)' };
                } else {
                    return { success: false, error: 'Invalid or expired OTP' };
                }
            }
            break;
            
        case '/create-account':
            if (method === 'POST' && data) {
                // Check for duplicates
                const exists = appState.accounts.some(acc => 
                    acc.platform === data.platform.toLowerCase() && acc.username === data.username
                );
                if (exists) {
                    return { success: false, error: 'This username is already registered on this platform' };
                }
                
                // Add new account
                const newAccount = {
                    platform: data.platform.toLowerCase(),
                    username: data.username,
                    email: data.email,
                    password: encryptPassword(data.password, CONFIG.encryptionKey)
                };
                appState.accounts.push(newAccount);
                localStorage.setItem('locksafe_accounts', JSON.stringify(appState.accounts));
                return { success: true, message: 'Account created successfully (Demo Mode)' };
            }
            break;
            
        case '/accounts':
            if (method === 'POST' && data.master_password) {
                const storedHash = localStorage.getItem('locksafe_master') || appState.masterPasswordHash;
                if (hashPassword(data.master_password) === storedHash) {
                    const storedAccounts = localStorage.getItem('locksafe_accounts');
                    const accounts = storedAccounts ? JSON.parse(storedAccounts) : appState.accounts;
                    
                    // Decrypt passwords for display
                    const decryptedAccounts = accounts.map(acc => ({
                        platform: acc.platform,
                        username: acc.username,
                        email: acc.email,
                        password: decryptPassword(acc.password, CONFIG.encryptionKey) || '(decryption failed)'
                    }));
                    
                    return { success: true, accounts: decryptedAccounts };
                } else {
                    return { success: false, error: 'Incorrect master password' };
                }
            }
            break;
    }
    
    return { success: false, error: 'Operation not available in demo mode' };
}

// ---------------------- UI FUNCTIONS ----------------------

// Initialize the application
function initializeApp() {
    // Hide all modals initially
    document.getElementById('masterPasswordModal').style.display = 'none';
    document.getElementById('otpModal').style.display = 'none';
    
    // Test connection first
    testConnection();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load any stored data for demo mode
    const storedHash = localStorage.getItem('locksafe_master');
    const storedAccounts = localStorage.getItem('locksafe_accounts');
    
    if (storedHash) {
        appState.masterPasswordHash = storedHash;
        appState.isSetup = true;
    }
    
    if (storedAccounts) {
        appState.accounts = JSON.parse(storedAccounts);
    }
    
    // Check if master password is set after a delay
    setTimeout(() => {
        checkMasterPasswordStatus();
    }, 1500);
}

// Check master password status
async function checkMasterPasswordStatus() {
    try {
        const result = await apiCall('/check-master-password-exists');
        if (!result.exists && !appState.isSetup) {
            showMasterPasswordSetup();
        }
    } catch (error) {
        if (!appState.isSetup) {
            showMasterPasswordSetup();
        }
    }
}

// Show master password setup modal
function showMasterPasswordSetup() {
    // Hide any other modals first
    document.getElementById('otpModal').style.display = 'none';
    
    const modal = document.getElementById('masterPasswordModal');
    modal.style.display = 'flex';
}

// Hide master password setup modal
function hideMasterPasswordSetup() {
    const modal = document.getElementById('masterPasswordModal');
    modal.style.display = 'none';
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });
    
    // Master password setup
    document.getElementById('setupMasterPasswordBtn').addEventListener('click', setupMasterPassword);
    
    // Real-time password strength checking
    document.getElementById('masterPassword').addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value);
    });
    
    // Account creation
    document.getElementById('createAccountForm').addEventListener('submit', createAccount);
    
    // View accounts
    document.getElementById('verifyMasterPasswordBtn').addEventListener('click', verifyAndShowAccounts);
    
    // Password recovery
    document.getElementById('resetUserPasswordBtn').addEventListener('click', resetUserPassword);
    document.getElementById('resetMasterPasswordBtn').addEventListener('click', resetMasterPassword);
    
    // Settings
    document.getElementById('changeMasterPasswordBtn').addEventListener('click', changeMasterPassword);
    document.getElementById('updateApiUrlBtn').addEventListener('click', updateApiUrl);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
    
    // OTP modal
    document.getElementById('verifyOtpBtn').addEventListener('click', verifyOTP);
    document.getElementById('cancelOtpBtn').addEventListener('click', hideOtpModal);
    
    // Initialize current API URL display
    document.getElementById('currentApiUrl').textContent = CONFIG.apiBaseUrl;
    document.getElementById('apiUrlInput').value = CONFIG.apiBaseUrl;
}

// Update API URL
function updateApiUrl() {
    const newUrl = document.getElementById('apiUrlInput').value.trim();
    if (newUrl) {
        CONFIG.apiBaseUrl = newUrl.endsWith('/api') ? newUrl : newUrl + '/api';
        document.getElementById('currentApiUrl').textContent = CONFIG.apiBaseUrl;
        showMessage('API URL updated. Testing connection...', 'info');
        testConnection();
    }
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    // Add active class to selected nav button
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
}

// Update password strength indicator
function updatePasswordStrength(password) {
    const indicator = document.getElementById('passwordStrength');
    if (!password) {
        indicator.textContent = '';
        indicator.className = 'password-strength';
        return;
    }
    
    const strength = checkPasswordStrength(password);
    indicator.textContent = strength.message;
    indicator.className = `password-strength ${strength.strength}`;
}

// Setup master password
async function setupMasterPassword() {
    const password = document.getElementById('masterPassword').value;
    const confirmPassword = document.getElementById('confirmMasterPassword').value;
    
    if (!password || !confirmPassword) {
        showMessage('Please fill in both password fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    const strength = checkPasswordStrength(password);
    if (!strength.valid) {
        showMessage(strength.message, 'error');
        return;
    }
    
    try {
        const result = await apiCall('/setup-master-password', 'POST', { password });
        
        if (result.success) {
            showMessage(result.message || 'Master password set successfully!', 'success');
            appState.isSetup = true;
            hideMasterPasswordSetup();
            
            // Clear form
            document.getElementById('masterPassword').value = '';
            document.getElementById('confirmMasterPassword').value = '';
            document.getElementById('passwordStrength').textContent = '';
        } else {
            showMessage(result.error || 'Failed to set master password', 'error');
        }
    } catch (error) {
        showMessage('Error setting master password: ' + error.message, 'error');
    }
}

// Create account
async function createAccount(e) {
    e.preventDefault();
    
    const platform = document.getElementById('platform').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!platform || !username || !email || !password) {
        showMessage('All fields are required', 'error');
        return;
    }
    
    // Store pending account data
    appState.pendingAccountData = { platform, username, email, password };
    
    // Send OTP
    try {
        const result = await apiCall('/send-otp', 'POST', { email });
        
        if (result.success) {
            showMessage(result.message || 'OTP sent to your email', 'success');
            showOtpModal('create-account');
        } else {
            showMessage(result.error || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        showMessage('Error sending OTP: ' + error.message, 'error');
    }
}

// Show OTP modal
function showOtpModal(type) {
    // Hide other modals first
    document.getElementById('masterPasswordModal').style.display = 'none';
    
    appState.currentRecoveryType = type;
    const modal = document.getElementById('otpModal');
    modal.style.display = 'flex';
    document.getElementById('otpInput').focus();
}

// Hide OTP modal
function hideOtpModal() {
    const modal = document.getElementById('otpModal');
    modal.style.display = 'none';
    document.getElementById('otpInput').value = '';
    appState.currentRecoveryType = null;
    appState.pendingAccountData = null;
    
    // Hide debug info
    const debugElement = document.getElementById('otpDebugInfo');
    if (debugElement) {
        debugElement.style.display = 'none';
    }
}

// Verify OTP
async function verifyOTP() {
    const otp = document.getElementById('otpInput').value.trim();
    
    if (!otp) {
        showMessage('Please enter the OTP', 'error');
        return;
    }
    
    if (!appState.pendingAccountData) {
        showMessage('No pending operation', 'error');
        return;
    }
    
    try {
        const result = await apiCall('/verify-otp', 'POST', {
            email: appState.pendingAccountData.email,
            otp: otp
        });
        
        if (result.success) {
            if (appState.currentRecoveryType === 'create-account') {
                await finalizeAccountCreation();
            }
        } else {
            showMessage(result.error || 'Invalid OTP', 'error');
        }
    } catch (error) {
        showMessage('Error verifying OTP: ' + error.message, 'error');
    }
}

// Finalize account creation
async function finalizeAccountCreation() {
    try {
        const result = await apiCall('/create-account', 'POST', appState.pendingAccountData);
        
        if (result.success) {
            showMessage(result.message || 'Account created successfully!', 'success');
            hideOtpModal();
            
            // Clear form
            document.getElementById('createAccountForm').reset();
            appState.pendingAccountData = null;
        } else {
            showMessage(result.error || 'Failed to create account', 'error');
        }
    } catch (error) {
        showMessage('Error creating account: ' + error.message, 'error');
    }
}

// Verify master password and show accounts
async function verifyAndShowAccounts() {
    const masterPassword = document.getElementById('viewMasterPassword').value;
    
    if (!masterPassword) {
        showMessage('Please enter your master password', 'error');
        return;
    }
    
    try {
        const result = await apiCall('/accounts', 'POST', { master_password: masterPassword });
        
        if (result.success) {
            displayAccounts(result.accounts);
            document.getElementById('masterPasswordVerification').style.display = 'none';
            document.getElementById('accountsList').style.display = 'block';
        } else {
            showMessage(result.error || 'Failed to verify master password', 'error');
        }
    } catch (error) {
        showMessage('Error verifying master password: ' + error.message, 'error');
    }
}

// Display accounts
function displayAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    
    if (accounts.length === 0) {
        accountsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>No accounts found</h3>
                <p>Create your first account to get started!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    accounts.forEach((account, index) => {
        html += `
            <div class="account-card">
                <div class="account-header">
                    <span class="account-platform">${account.platform}</span>
                </div>
                <div class="account-details">
                    <div class="account-field">
                        <strong>Username:</strong>
                        <span>${account.username}</span>
                    </div>
                    <div class="account-field">
                        <strong>Email:</strong>
                        <span>${account.email}</span>
                    </div>
                    <div class="account-field" style="grid-column: 1 / -1;">
                        <strong>Password:</strong>
                        <div class="password-field">
                            <span id="password-${index}" class="password-value">••••••••</span>
                            <button class="reveal-btn" onclick="togglePasswordVisibilityInAccounts(${index}, '${account.password.replace(/'/g, "\\'")}')">Show</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    accountsList.innerHTML = html;
}

// Toggle password visibility in accounts list
function togglePasswordVisibilityInAccounts(index, password) {
    const passwordElement = document.getElementById(`password-${index}`);
    const button = passwordElement.nextElementSibling;
    
    if (passwordElement.textContent === '••••••••') {
        passwordElement.textContent = password;
        button.textContent = 'Hide';
    } else {
        passwordElement.textContent = '••••••••';
        button.textContent = 'Show';
    }
}

// Reset user password
async function resetUserPassword() {
    const username = prompt('Enter your username:');
    if (!username) return;
    
    if (appState.demoMode) {
        showMessage('Password reset requires backend server connection', 'warning');
        return;
    }
    
    showMessage('User password reset feature will be implemented with full backend', 'info');
}

// Reset master password
async function resetMasterPassword() {
    const email = prompt('Enter your recovery email:');
    if (!email) return;
    
    if (appState.demoMode) {
        showMessage('Master password reset requires backend server connection', 'warning');
        return;
    }
    
    showMessage('Master password reset feature will be implemented with full backend', 'info');
}

// Change master password
async function changeMasterPassword() {
    const currentPassword = prompt('Enter your current master password:');
    if (!currentPassword) return;
    
    const newPassword = prompt('Enter new master password:');
    if (!newPassword) return;
    
    const confirmPassword = prompt('Confirm new master password:');
    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    const strength = checkPasswordStrength(newPassword);
    if (!strength.valid) {
        showMessage(strength.message, 'error');
        return;
    }
    
    if (appState.demoMode) {
        showMessage('Master password change requires backend server connection', 'warning');
        return;
    }
    
    showMessage('Change master password feature will be implemented with full backend', 'info');
}

// Make functions globally available
window.togglePasswordVisibility = togglePasswordVisibility;
window.togglePasswordVisibilityInAccounts = togglePasswordVisibilityInAccounts;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
