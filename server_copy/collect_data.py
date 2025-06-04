import sys
import os
import time
import sqlite3
import json
import re
import logging
from datetime import datetime
import serial
import serial.tools.list_ports

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("collect_data.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("collect_data")

# Spectrophotometer settings
SERIAL_PORT = 'COM11'  # USB Serial Port
BAUD_RATE = 19200
TIMEOUT = 1

# Spectrophotometer commands
COMMAND_CONTROL = 'CONTROL'  # Enter control mode
COMMAND_RELEASE = 'RELEASE'  # Release control mode
COMMAND_READ = 'READ?'  # Read absorbance
COMMAND_WAVE = 'WAVE'  # Set wavelength

def list_available_ports():
    """List all available COM ports."""
    ports = serial.tools.list_ports.comports()
    if not ports:
        logger.warning("No COM ports found")
        return []
    
    logger.info("Available COM ports:")
    for port in ports:
        logger.info(f"  {port.device} - {port.description}")
    return [port.device for port in ports]

class Spectrophotometer:
    def __init__(self):
        self.ser = None

    def initialize(self):
        """Initialize communication with the spectrophotometer."""
        try:
            # List available ports first
            available_ports = list_available_ports()
            if not available_ports:
                logger.error("No COM ports available")
                return False
                
            if SERIAL_PORT not in available_ports:
                logger.error(f"Specified port {SERIAL_PORT} not found. Available ports: {available_ports}")
                return False

            # Try to open the port with exclusive access
            self.ser = serial.Serial(
                port=SERIAL_PORT,
                baudrate=BAUD_RATE,
                timeout=TIMEOUT,
                exclusive=True  # Request exclusive access
            )
            
            logger.info(f"Connected to spectrophotometer on {SERIAL_PORT}")
            return True
        except serial.SerialException as e:
            logger.error(f"Serial port error: {e}")
            if "Access is denied" in str(e):
                logger.error("Port access denied. Please ensure no other program is using the port and try running with administrator privileges.")
            return False
        except Exception as e:
            logger.error(f"Error connecting to spectrophotometer: {e}")
            return False

    def send_command(self, command):
        """Send a command to the spectrophotometer."""
        try:
            self.ser.write((command + '\n').encode())
            response = self.ser.readline().decode().strip()
            return response
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            return None

    def close(self):
        """Close the connection to the spectrophotometer."""
        if self.ser:
            try:
                self.send_command(COMMAND_RELEASE)
                self.ser.close()
                logger.info("Spectrophotometer connection closed.")
            except Exception as e:
                logger.error(f"Error closing spectrophotometer connection: {e}")

    def read_absorbance(self, wavelength):
        """Read absorbance at specified wavelength."""
        try:
            # Set wavelength
            self.send_command(f"{COMMAND_WAVE} {wavelength}")
            time.sleep(2)  # Wait for wavelength adjustment
            
            # Read absorbance
            response = self.send_command(COMMAND_READ)
            if response and response.startswith('E00'):
                return float(response.split()[1])
            else:
                logger.error(f"Invalid response from spectrophotometer: {response}")
                return None
        except Exception as e:
            logger.error(f"Error reading absorbance at wavelength {wavelength}: {e}")
            return None

    def scan_wavelengths(self, start, end, step, speed='FAST', output='TEXT'):
        """Scan a range of wavelengths in one command and return a list of (wavelength, absorbance) tuples."""
        try:
            scan_cmd = f"SCAN {start} {end} {step} {speed} {output}"
            self.ser.write((scan_cmd + '\n').encode())
            lines = []
            expected_points = int((end - start) / step) + 1
            start_time = time.time()
            while len(lines) < expected_points and (time.time() - start_time) < 15:
                line = self.ser.readline().decode().strip()
                if line:
                    lines.append(line)
            logger.info(f"Raw lines from SCAN: {lines[:10]}")
            results = []
            # Remove the first line if it's a status code (e.g., 'E00')
            if lines and lines[0].startswith('E'):
                lines = lines[1:]
            for i, ab_str in enumerate(lines):
                try:
                    ab = float(ab_str)
                    wl = start + i * step
                    results.append((wl, ab))
                except Exception as e:
                    logger.error(f"Error parsing scan value '{ab_str}': {e}")
            return results
        except Exception as e:
            logger.error(f"Error during scan_wavelengths: {e}")
            return []

def get_task_info(task_id):
    """Get task information from the main database (name and wavelengths)."""
    try:
        task_id_int = int(task_id)
    except ValueError:
        logger.error(f"Invalid task ID (not integer): {task_id}")
        return None
    # Path to main DB in this server folder
    main_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'absorbanceDB.db')
    try:
        conn = sqlite3.connect(main_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name, wavelengths FROM Tasks WHERE id = ?", (task_id_int,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            logger.error(f"Task ID {task_id_int} not found in main database")
            return None
        name, wavelengths_json = row
        # Parse wavelengths JSON
        data = json.loads(wavelengths_json)
        wavelength_start = data.get('start')
        wavelength_end = data.get('end')
        wavelength_step = data.get('step')
        # Sanitize name for filename
        sanitized = name.strip().lower()
        sanitized = re.sub(r'[^a-z0-9]+', '_', sanitized)
        sanitized = re.sub(r'^_+|_+$', '', sanitized)
        return {
            'task_id': task_id_int,
            'name': name,
            'sanitized_name': sanitized,
            'wavelength_start': wavelength_start,
            'wavelength_end': wavelength_end,
            'wavelength_step': wavelength_step
        }
    except Exception as e:
        logger.error(f"Error getting task info for {task_id}: {e}")
        return None

def get_next_time_point(db_path):
    """Get the next time point for the task."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Absorbance'")
        if not cursor.fetchone():
            logger.info("Absorbance table doesn't exist yet, starting at time point 0")
            conn.close()
            return 0
        
        # Get the maximum time point
        cursor.execute("SELECT MAX(time_point) FROM Absorbance")
        result = cursor.fetchone()
        conn.close()
        
        if result[0] is None:
            return 0
        else:
            return result[0] + 1
        
    except Exception as e:
        logger.error(f"Error getting next time point: {e}")
        return 0

def collect_data(task_id):
    """Collect data for the given task and save to database."""
    logger.info(f"Starting data collection for task {task_id}")
    
    # Get task information
    task_info = get_task_info(task_id)
    if task_info is None:
        logger.error(f"Could not get task information for {task_id}")
        return False
    
    # Database path (collectDB/data directory for consistency with existing real data)
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'collectDB', 'data')
    os.makedirs(data_dir, exist_ok=True)  # Ensure data directory exists
    
    # Construct per-task DB filename using the sanitized name
    db_filename = f"task_{task_info['task_id']}_{task_info['sanitized_name']}.db"
    db_path = os.path.join(data_dir, db_filename)
    
    logger.info(f"Using database file: {db_path}")
    
    # Initialize spectrophotometer
    spectro = Spectrophotometer()
    if not spectro.initialize():
        logger.error("Failed to initialize spectrophotometer")
        spectro.close()  # Only close if initialization failed
        return False

    try:
        # Enter control mode
        spectro.send_command(COMMAND_CONTROL)
        
        # Get the next time point
        time_point = get_next_time_point(db_path)
        logger.info(f"Collecting data for time point {time_point}")
        
        # Use scan_wavelengths for all data collection
        wavelength_start = task_info['wavelength_start']
        wavelength_end = task_info['wavelength_end']
        display_step = task_info['wavelength_step']  # This is the step requested by the site
        machine_step = 2.0  # Always use a valid step for the device
        logger.info(f"Scanning wavelengths from {wavelength_start} to {wavelength_end} with machine step {machine_step}")
        scan_results = spectro.scan_wavelengths(wavelength_start, wavelength_end, machine_step)
        # Filter results to only keep wavelengths matching the site's requested step
        filtered_points = []
        for wl, ab in scan_results:
            # Only keep wavelengths that match the display step (within a small tolerance)
            if abs((wl - wavelength_start) % display_step) < 1e-6 or abs((wl - wavelength_start) % display_step - display_step) < 1e-6:
                filtered_points.append((int(round(wl)), time_point, ab))
        data_points = filtered_points
        for wl, _, ab in data_points:
            logger.info(f"Collected data point: wavelength={wl}, time_point={time_point}, absorbance={ab}")
        if not data_points:
            logger.error("No data points were collected from scan (after filtering)")
            return False
        logger.info(f"Collected {len(data_points)} data points, storing in database...")
        
        # Connect to database and insert data
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Absorbance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wavelength INTEGER NOT NULL,
                time_point INTEGER NOT NULL,
                absorbance REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(wavelength, time_point)
            )
        ''')
        
        # Insert data
        cursor.executemany(
            "INSERT OR REPLACE INTO Absorbance (wavelength, time_point, absorbance) VALUES (?, ?, ?)", 
            data_points
        )
        
        # Verify data was inserted
        cursor.execute("SELECT COUNT(*) FROM Absorbance WHERE time_point = ?", (time_point,))
        count = cursor.fetchone()[0]
        logger.info(f"Verified {count} data points stored in database for time point {time_point}")
        
        # Verify data format and log sample
        cursor.execute("""
            SELECT wavelength, time_point, absorbance, timestamp 
            FROM Absorbance 
            WHERE time_point = ? 
            ORDER BY wavelength
        """, (time_point,))
        rows = cursor.fetchall()
        logger.info("Sample of stored data:")
        for row in rows[:5]:  # Log first 5 rows
            logger.info(f"  Wavelength: {row[0]}, Time: {row[1]}, Absorbance: {row[2]}, Timestamp: {row[3]}")
        
        # Commit and close
        conn.commit()
        conn.close()
        
        logger.info(f"Successfully collected and stored {len(data_points)} data points for task {task_id} at time point {time_point}")
        return True
        
    except Exception as e:
        logger.error(f"Error collecting data for task {task_id}: {e}")
        spectro.close()  # Only close on error
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("Task ID not provided")
        sys.exit(1)
    
    task_id = sys.argv[1]
    success = collect_data(task_id)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
