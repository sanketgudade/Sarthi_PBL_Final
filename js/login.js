// login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginContainer = document.getElementById('loginContainer');
    
    // Show initial circle selection
    showCircleSelection();
    
    // Check if we came from login button
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('show') === 'login') {
        showLoginModal();
    }
});

function showCircleSelection() {
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <div class="form-header">
                <h2>Welcome to Sarathi</h2>
                <p>Choose your login type to continue</p>
            </div>
            
            <div class="circle-selection">
                <div class="user-circle" onclick="showLoginForm('citizen')">
                    <div class="circle circle-citizen">
                        <img src="assets/request.png" alt="Citizen">
                    </div>
                    <span class="user-label">Citizen</span>
                </div>
                
                <div class="user-circle" onclick="showLoginForm('collector')">
                    <div class="circle circle-collector">
                        <img src="assets/pickup.png" alt="Collector">
                    </div>
                    <span class="user-label">Collector</span>
                </div>
                
                <div class="user-circle" onclick="showLoginForm('admin')">
                    <div class="circle circle-admin">
                        <img src="assets/verify.png" alt="Admin">
                    </div>
                    <span class="user-label">Admin</span>
                </div>
            </div>
            
            <div class="switch-form">
                <span>Don't have an account?</span>
                <a href="#" onclick="showSignupOptions()">Sign Up</a>
            </div>
        </div>
    `;
}

function showSignupOptions() {
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <button class="back-to-selection" onclick="showCircleSelection()">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            
            <div class="form-header">
                <h2>Create Account</h2>
                <p>Select your account type</p>
            </div>
            
            <div class="circle-selection">
                <div class="user-circle" onclick="showSignupForm('citizen')">
                    <div class="circle circle-citizen">
                        <img src="assets/request.png" alt="Citizen">
                    </div>
                    <span class="user-label">Citizen</span>
                </div>
                
                <div class="user-circle" onclick="showSignupForm('collector')">
                    <div class="circle circle-collector">
                        <img src="assets/pickup.png" alt="Collector">
                    </div>
                    <span class="user-label">Collector</span>
                </div>
            </div>
            
            <div class="switch-form">
                <span>Already have an account?</span>
                <a href="#" onclick="showCircleSelection()">Login</a>
            </div>
        </div>
    `;
}

function showLoginForm(userType) {
    const userTypes = {
        citizen: { title: 'Citizen Login', icon: 'fa-user' },
        collector: { title: 'Collector Login', icon: 'fa-truck' },
        admin: { title: 'Admin Login', icon: 'fa-shield-alt' }
    };
    
    const user = userTypes[userType];
    
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <button class="back-to-selection" onclick="showCircleSelection()">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            
            <div class="form-header">
                <div class="circle ${userType}-circle" style="width: 80px; height: 80px; margin: 0 auto 20px;">
                    <i class="fas ${user.icon}"></i>
                </div>
                <h2>${user.title}</h2>
                <p>Enter your credentials to continue</p>
            </div>
            
            <div class="form-container">
                <form id="loginForm" onsubmit="handleLogin(event, '${userType}')">
                    <div class="form-group">
                        <label for="username">Username or Email</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    
                    <div class="form-group password-toggle">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility()">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    
                    <div class="form-options">
                        <div class="remember-me">
                            <input type="checkbox" id="remember" name="remember">
                            <label for="remember">Remember me</label>
                        </div>
                        <a href="#" class="forgot-password" onclick="showForgotPassword('${userType}')">Forgot Password?</a>
                    </div>
                    
                    <button type="submit" class="submit-btn">Login</button>
                </form>
                
                <div class="switch-form">
                    <span>Don't have an account?</span>
                    <a href="#" onclick="showSignupForm('${userType}')">Sign Up as ${userType.charAt(0).toUpperCase() + userType.slice(1)}</a>
                </div>
            </div>
        </div>
    `;
}

function showSignupForm(userType) {
    const userTypes = {
        citizen: { title: 'Citizen Registration', icon: 'fa-user' },
        collector: { title: 'Collector Registration', icon: 'fa-truck' }
    };
    
    const user = userTypes[userType] || { title: 'Registration', icon: 'fa-user' };
    
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <button class="back-to-selection" onclick="showSignupOptions()">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            
            <div class="form-header">
                <div class="circle ${userType}-circle" style="width: 80px; height: 80px; margin: 0 auto 20px;">
                    <i class="fas ${user.icon}"></i>
                </div>
                <h2>${user.title}</h2>
                <p>Create your account to get started</p>
            </div>
            
            <div class="form-container">
                <form id="signupForm" onsubmit="handleSignup(event, '${userType}')">
                    ${userType === 'citizen' ? `
                        <div class="form-row">
                            <div class="form-group">
                                <label for="firstName">First Name</label>
                                <input type="text" id="firstName" name="firstName" required>
                            </div>
                            <div class="form-group">
                                <label for="lastName">Last Name</label>
                                <input type="text" id="lastName" name="lastName" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="address">Address</label>
                            <input type="text" id="address" name="address" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="city">City</label>
                                <input type="text" id="city" name="city" required>
                            </div>
                            <div class="form-group">
                                <label for="zipCode">Zip Code</label>
                                <input type="text" id="zipCode" name="zipCode" required>
                            </div>
                        </div>
                    ` : userType === 'collector' ? `
                        <div class="form-group">
                            <label for="fullName">Full Name</label>
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="employeeId">Employee ID</label>
                            <input type="text" id="employeeId" name="employeeId" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="department">Department</label>
                            <select id="department" name="department" required>
                                <option value="">Select Department</option>
                                <option value="north">North Zone</option>
                                <option value="south">South Zone</option>
                                <option value="east">East Zone</option>
                                <option value="west">West Zone</option>
                                <option value="central">Central Zone</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="collectorEmail">Official Email</label>
                            <input type="email" id="collectorEmail" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="collectorPhone">Contact Number</label>
                            <input type="tel" id="collectorPhone" name="phone" required>
                        </div>
                    ` : ''}
                    
                    <div class="form-row">
                        <div class="form-group password-toggle">
                            <label for="signupPassword">Password</label>
                            <input type="password" id="signupPassword" name="password" required minlength="6">
                            <button type="button" class="toggle-password" onclick="togglePasswordVisibility('signupPassword')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        
                        <div class="form-group password-toggle">
                            <label for="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" required>
                            <button type="button" class="toggle-password" onclick="togglePasswordVisibility('confirmPassword')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="remember-me">
                            <input type="checkbox" id="terms" name="terms" required>
                            <label for="terms">I agree to the <a href="#" style="color: #1f7a5a;">Terms & Conditions</a></label>
                        </div>
                    </div>
                    
                    <button type="submit" class="submit-btn">Create Account</button>
                </form>
                
                <div class="switch-form">
                    <span>Already have an account?</span>
                    <a href="#" onclick="showLoginForm('${userType}')">Login</a>
                </div>
            </div>
        </div>
    `;
}

function handleLogin(event, userType) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        userType: userType
    };
    
    // In a real app, you would send this to your backend
    console.log('Login attempt:', data);
    
    // Simulate API call
    setTimeout(() => {
        showLoginSuccess(userType);
    }, 1000);
}

function handleSignup(event, userType) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    data.userType = userType;
    
    // Check password match
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // In a real app, you would send this to your backend
    console.log('Signup attempt:', data);
    
    // Simulate API call
    setTimeout(() => {
        showSignupSuccess(userType);
    }, 1000);
}

function showLoginSuccess(userType) {
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <div class="success-message">
                <div class="success-icon">
                    <i class="fas fa-check"></i>
                </div>
                <h2>Login Successful!</h2>
                <p>Welcome back! Redirecting to your ${userType} dashboard...</p>
            </div>
        </div>
    `;
    
    // Redirect to dashboard
    setTimeout(() => {
        closeLoginModal();
        // Redirect to actual dashboard
        window.location.href = `${userType}_dashboard.html`;
    }, 2000);
}

function showSignupSuccess(userType) {
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <div class="success-message">
                <div class="success-icon">
                    <i class="fas fa-check"></i>
                </div>
                <h2>Account Created Successfully!</h2>
                <p>Your ${userType} account has been created. You can now login.</p>
                <button class="submit-btn" onclick="showLoginForm('${userType}')" style="margin-top: 20px;">
                    Proceed to Login
                </button>
            </div>
        </div>
    `;
}

function showForgotPassword(userType) {
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.innerHTML = `
        <div class="login-container">
            <button class="back-to-selection" onclick="showLoginForm('${userType}')">
                <i class="fas fa-arrow-left"></i> Back to Login
            </button>
            
            <div class="form-header">
                <h2>Reset Password</h2>
                <p>Enter your email to receive reset instructions</p>
            </div>
            
            <div class="form-container">
                <form onsubmit="handleForgotPassword(event, '${userType}')">
                    <div class="form-group">
                        <label for="resetEmail">Email Address</label>
                        <input type="email" id="resetEmail" name="email" required>
                    </div>
                    
                    <button type="submit" class="submit-btn">Send Reset Link</button>
                </form>
            </div>
        </div>
    `;
}

function handleForgotPassword(event, userType) {
    event.preventDefault();
    const email = event.target.email.value;
    
    // Simulate sending reset link
    setTimeout(() => {
        const loginContainer = document.getElementById('loginContainer');
        loginContainer.innerHTML = `
            <div class="login-container">
                <div class="success-message">
                    <div class="success-icon">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <h2>Reset Link Sent!</h2>
                    <p>We've sent password reset instructions to ${email}</p>
                    <button class="submit-btn" onclick="showLoginForm('${userType}')" style="margin-top: 20px;">
                        Back to Login
                    </button>
                </div>
            </div>
        `;
    }, 1000);
}

function togglePasswordVisibility(fieldId = 'password') {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Modal control functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    showCircleSelection();
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function showSignupModal() {
    document.getElementById('loginModal').style.display = 'block';
    showSignupOptions();
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target === modal) {
        closeLoginModal();
    }
});