import hashlib, random, smtplib, re, os, base64, json
from flask import Flask, request, jsonify
from flask_cors import CORS
from Crypto.Cipher import AES 
import time
from datetime import datetime

# ---------------------- CONFIG ----------------------
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

MASTER_PASSWORD_FILE = "master_password.txt"
PASSWORDS_FILE = "passwords.txt"

# Configure these environment variables for email functionality
os.environ["SENDER_EMAIL"] = "noreplylocksafe@gmail.com"
os.environ["SENDER_PASSWORD"] = "acec rdae aehu gmdi"
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

# Store OTPs temporarily (in production, use Redis or database)
otp_store = {}

# ---------------------- CRYPTO ----------------------
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def encrypt_password(password, key):
    cipher = AES.new(key.ljust(32)[:32].encode(), AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(password.encode())
    return base64.b64encode(cipher.nonce + ciphertext).decode()

def decrypt_password(encrypted_password, key):
    try:
        data = base64.b64decode(encrypted_password)
        nonce, ciphertext = data[:16], data[16:]
        cipher = AES.new(key.ljust(32)[:32].encode(), AES.MODE_EAX, nonce=nonce)
        return cipher.decrypt(ciphertext).decode()
    except:
        return None

# ---------------------- UTILS ----------------------
def send_otp(email):
    """Send OTP via email - Returns OTP and timestamp"""
    otp = str(random.randint(1000, 9999))
    timestamp = time.time()

    try:
        # For development/demo purposes, we'll store the OTP instead of actually sending email
        # Uncomment and configure SMTP settings for actual email sending

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls() 
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        message = f"Subject: LockSafe Password Reset OTP\n\nYour OTP is: {otp}\nThis OTP is valid for next 2 minutes only."
        server.sendmail(SENDER_EMAIL, email, message)
        server.quit()

        # Store OTP temporarily (for demo purposes)
        otp_store[email] = {'otp': otp, 'timestamp': timestamp}
        print(f"DEBUG: OTP for {email}: {otp}")  # For development only

        return {'success': True, 'otp': otp, 'timestamp': timestamp}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def check_password_strength(password):
    if len(password) < 8:
        return {"valid": False, "message": "Password must be at least 8 characters long!"}
    if not re.search(r"[A-Z]", password):
        return {"valid": False, "message": "Password must contain at least one uppercase letter!"}
    if not re.search(r"[a-z]", password):
        return {"valid": False, "message": "Password must contain at least one lowercase letter!"}
    if not re.search(r"\d", password):
        return {"valid": False, "message": "Password must contain at least one digit!"}
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return {"valid": False, "message": "Password must contain at least one special character!"}
    return {"valid": True, "message": "Strong"}

# ---------------------- API ROUTES ----------------------

@app.route('/')
def index():
    return """
    <html>
    <head><title>LockSafe Server</title></head>
    <body>
        <h1>🔐 LockSafe Password Manager Server</h1>
        <p>Backend server is running successfully!</p>
        <p>Use the frontend application to interact with this server.</p>
        <h3>API Endpoints:</h3>
        <ul>
            <li>POST /api/setup-master-password</li>
            <li>POST /api/verify-master-password</li>
            <li>POST /api/create-account</li>
            <li>GET /api/accounts</li>
            <li>POST /api/send-otp</li>
            <li>POST /api/verify-otp</li>
            <li>POST /api/reset-user-password</li>
            <li>POST /api/reset-master-password</li>
        </ul>
    </body>
    </html>
    """

@app.route('/api/setup-master-password', methods=['POST'])
def setup_master_password():
    """Set up the master password"""
    data = request.get_json()
    password = data.get('password')

    if not password:
        return jsonify({'success': False, 'error': 'Password is required'}), 400

    # Check password strength
    strength_check = check_password_strength(password)
    if not strength_check['valid']:
        return jsonify({'success': False, 'error': strength_check['message']}), 400

    # Check if master password already exists
    if os.path.exists(MASTER_PASSWORD_FILE):
        return jsonify({'success': False, 'error': 'Master password already exists'}), 400

    try:
        with open(MASTER_PASSWORD_FILE, "w") as f:
            f.write(hash_password(password))
        return jsonify({'success': True, 'message': 'Master password set successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify-master-password', methods=['POST'])
def verify_master_password():
    """Verify the master password"""
    data = request.get_json()
    password = data.get('password')

    if not password:
        return jsonify({'success': False, 'error': 'Password is required'}), 400

    if not os.path.exists(MASTER_PASSWORD_FILE):
        return jsonify({'success': False, 'error': 'Master password not set'}), 400

    try:
        with open(MASTER_PASSWORD_FILE, "r") as f:
            stored_hash = f.read().strip()

        if hash_password(password) == stored_hash:
            return jsonify({'success': True, 'message': 'Password verified'})
        else:
            return jsonify({'success': False, 'error': 'Incorrect master password'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check-master-password-exists', methods=['GET'])
def check_master_password_exists():
    """Check if master password is already set"""
    exists = os.path.exists(MASTER_PASSWORD_FILE)
    return jsonify({'exists': exists})

@app.route('/api/send-otp', methods=['POST'])
def send_otp_endpoint():
    """Send OTP to email"""
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'error': 'Email is required'}), 400

    result = send_otp(email)
    if result['success']:
        return jsonify({'success': True, 'message': 'OTP sent successfully', 'debug_otp': result['otp']})
    else:
        return jsonify({'success': False, 'error': result['error']}), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP"""
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')

    if not email or not otp:
        return jsonify({'success': False, 'error': 'Email and OTP are required'}), 400

    if email not in otp_store:
        return jsonify({'success': False, 'error': 'No OTP found for this email'}), 400

    stored_data = otp_store[email]

    # Check if OTP has expired (2 minutes)
    if time.time() - stored_data['timestamp'] > 120:
        del otp_store[email]
        return jsonify({'success': False, 'error': 'OTP has expired'}), 400

    # Verify OTP
    if stored_data['otp'] == otp:
        del otp_store[email]  # Remove OTP after successful verification
        return jsonify({'success': True, 'message': 'OTP verified successfully'})
    else:
        return jsonify({'success': False, 'error': 'Incorrect OTP'}), 401

@app.route('/api/create-account', methods=['POST'])
def create_account():
    """Create a new account after OTP verification"""
    data = request.get_json()
    platform = data.get('platform', '').strip().lower()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([platform, username, email, password]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400

    # Check if account already exists
    if os.path.exists(PASSWORDS_FILE):
        try:
            with open(PASSWORDS_FILE, "r") as f:
                for line in f:
                    try:
                        saved_platform, saved_username, _, _ = line.strip().split(",")
                        if saved_platform == platform and saved_username == username:
                            return jsonify({'success': False, 'error': 'This username is already registered on this platform'}), 400
                    except ValueError:
                        continue
        except Exception:
            pass

    # Encrypt password
    encryption_key = "key123"
    encrypted_password = encrypt_password(password, encryption_key)

    try:
        with open(PASSWORDS_FILE, "a") as f:
            f.write(f"{platform},{username},{email},{encrypted_password}\n")
        return jsonify({'success': True, 'message': 'Account created successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accounts', methods=['POST'])
def get_accounts():
    """Get all saved accounts (requires master password verification)"""
    data = request.get_json()
    master_password = data.get('master_password')

    if not master_password:
        return jsonify({'success': False, 'error': 'Master password is required'}), 400

    # Verify master password
    if not os.path.exists(MASTER_PASSWORD_FILE):
        return jsonify({'success': False, 'error': 'Master password not set'}), 400

    try:
        with open(MASTER_PASSWORD_FILE, "r") as f:
            stored_hash = f.read().strip()

        if hash_password(master_password) != stored_hash:
            return jsonify({'success': False, 'error': 'Incorrect master password'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

    # Read and decrypt accounts
    if not os.path.exists(PASSWORDS_FILE):
        return jsonify({'success': True, 'accounts': []})

    accounts = []
    encryption_key = "key123"

    try:
        with open(PASSWORDS_FILE, "r") as f:
            for line in f:
                try:
                    platform, username, email, encrypted_password = line.strip().split(",")
                    decrypted_password = decrypt_password(encrypted_password, encryption_key)
                    if decrypted_password is None:
                        decrypted_password = "(decryption failed)"

                    accounts.append({
                        'platform': platform,
                        'username': username,
                        'email': email,
                        'password': decrypted_password
                    })
                except ValueError:
                    continue

        return jsonify({'success': True, 'accounts': accounts})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reset-user-password', methods=['POST'])
def reset_user_password():
    """Reset user account password"""
    data = request.get_json()
    username = data.get('username')
    new_password = data.get('new_password')

    if not username or not new_password:
        return jsonify({'success': False, 'error': 'Username and new password are required'}), 400

    if not os.path.exists(PASSWORDS_FILE):
        return jsonify({'success': False, 'error': 'No accounts found'}), 400

    # Find user and get email
    user_email = None
    lines = []

    try:
        with open(PASSWORDS_FILE, "r") as f:
            lines = f.readlines()

        for line in lines:
            try:
                _, user, email, _ = line.strip().split(",")
                if user == username:
                    user_email = email
                    break
            except ValueError:
                continue

        if not user_email:
            return jsonify({'success': False, 'error': 'Username not found'}), 404

        # Encrypt new password
        encryption_key = "key123"
        encrypted_password = encrypt_password(new_password, encryption_key)

        # Update password
        with open(PASSWORDS_FILE, "w") as f:
            for line in lines:
                try:
                    platform, user, email, _ = line.strip().split(",")
                    if user == username:
                        f.write(f"{platform},{user},{email},{encrypted_password}\n")
                    else:
                        f.write(line)
                except ValueError:
                    f.write(line)

        return jsonify({'success': True, 'message': 'Password reset successfully', 'email': user_email})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reset-master-password', methods=['POST'])
def reset_master_password():
    """Reset master password"""
    data = request.get_json()
    new_password = data.get('new_password')

    if not new_password:
        return jsonify({'success': False, 'error': 'New password is required'}), 400

    # Check password strength
    strength_check = check_password_strength(new_password)
    if not strength_check['valid']:
        return jsonify({'success': False, 'error': strength_check['message']}), 400

    try:
        with open(MASTER_PASSWORD_FILE, "w") as f:
            f.write(hash_password(new_password))
        return jsonify({'success': True, 'message': 'Master password reset successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("🔐 LockSafe Password Manager Server Starting...")
    print("Server will be available at: http://localhost:5000")
    print("\nIMPORTANT: Configure your email settings in the environment variables:")
    print("- SENDER_EMAIL: Your Gmail address")
    print("- SENDER_PASSWORD: Your Gmail App Password")
    print("\nFor development, OTPs will be printed to console.")
    app.run(debug=True, host='0.0.0.0', port=5000)
