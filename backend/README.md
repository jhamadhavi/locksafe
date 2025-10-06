# LockSafe Password Manager - Web Version

This is the web-based version of the LockSafe Password Manager, converted from the original Tkinter GUI application.

## Features

- 🔐 **Master Password Protection**: Secure all your accounts with one strong master password
- 📧 **OTP Verification**: Email-based OTP verification for account creation and password resets
- 🔒 **AES Encryption**: All passwords are encrypted using AES encryption before storage
- 💪 **Password Strength Checking**: Ensures all passwords meet security requirements
- 🌐 **Web Interface**: Modern, responsive web interface accessible from any browser
- 📱 **Cross-Platform**: Works on desktop, tablet, and mobile devices

## Project Structure

```
locksafe-web/
├── frontend/           # Web application (HTML, CSS, JS)
│   ├── index.html     # Main application page
│   ├── style.css      # Styling
│   └── app.js         # Frontend JavaScript logic
├── backend/           # Flask server
│   ├── server.py      # Main Flask application
│   ├── requirements.txt
│   ├── master_password.txt  # Created automatically
│   └── passwords.txt        # Created automatically
└── README.md
```

## Setup Instructions

### Backend Setup

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Email Settings** (Optional for development):
   ```bash
   # Set environment variables for email functionality
   export SENDER_EMAIL="your_email@gmail.com"
   export SENDER_PASSWORD="your_app_password"
   ```

3. **Start the Flask Server**:
   ```bash
   python server.py
   ```
   The server will start at `http://localhost:5000`

### Frontend Setup

1. **Open the Web Application**: 
   - Use the deployed version: [LockSafe Web App](https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/ef1a4331af01d891f0765e72fbff4d0d/d7539cf7-5a00-497a-aaf7-832daacb19db/index.html)
   - Or serve the frontend files locally using any web server

2. **Configure API Endpoint**:
   - Update the `API_BASE_URL` in `app.js` to point to your Flask server
   - Default is `http://localhost:5000/api`

## Usage

### First Time Setup
1. Open the web application
2. Set up your master password (must be strong)
3. Start creating and managing your accounts

### Creating Accounts
1. Fill in the account creation form (Platform, Username, Email, Password)
2. Click "Create Account"
3. Enter the OTP sent to your email (for development, check console)
4. Account will be saved with AES encryption

### Viewing Accounts
1. Click "View Accounts"
2. Enter your master password
3. View all saved accounts with the option to reveal passwords

### Password Recovery
- **User Password Reset**: Reset password for specific platform accounts
- **Master Password Reset**: Reset your master password (requires email verification)

## Development Notes

### Email Configuration
For production use, configure proper SMTP settings:

```python
# In server.py, uncomment and configure:
server = smtplib.SMTP("smtp.gmail.com", 587)
server.starttls()
server.login(SENDER_EMAIL, SENDER_PASSWORD)
# ... rest of email sending code
```

### Security Features
- Passwords are hashed using SHA-256
- Account passwords are encrypted with AES-256
- OTP verification for sensitive operations
- Password strength requirements enforced
- Master password protection for viewing accounts

### File Storage
- `master_password.txt`: Stores hashed master password
- `passwords.txt`: Stores encrypted account information (CSV format)

## API Endpoints

- `POST /api/setup-master-password`: Set up master password
- `POST /api/verify-master-password`: Verify master password
- `GET /api/check-master-password-exists`: Check if master password exists
- `POST /api/send-otp`: Send OTP to email
- `POST /api/verify-otp`: Verify OTP
- `POST /api/create-account`: Create new account
- `POST /api/accounts`: Get all accounts (requires master password)
- `POST /api/reset-user-password`: Reset user account password
- `POST /api/reset-master-password`: Reset master password

## Technology Stack

**Frontend**:
- HTML5, CSS3, JavaScript (Vanilla)
- Responsive design with CSS Grid/Flexbox
- Modern UI with smooth animations

**Backend**:
- Flask (Python web framework)
- Flask-CORS (Cross-origin resource sharing)
- PyCryptodome (AES encryption)
- SMTP (Email sending)

## Security Considerations

- Use HTTPS in production
- Configure proper CORS policies
- Store sensitive data securely
- Use environment variables for configuration
- Implement rate limiting for OTP endpoints
- Consider using a proper database instead of file storage for production

## Differences from Original Tkinter Version

- **Web Interface**: Modern web UI instead of desktop GUI
- **API Architecture**: RESTful API for frontend-backend communication
- **Responsive Design**: Works on all screen sizes
- **Cross-Platform**: No installation required, works in any browser
- **Enhanced Security**: Same encryption and security features maintained

## License

This project is for educational purposes. Please ensure you comply with all security best practices when using in production.
