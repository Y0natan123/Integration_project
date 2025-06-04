import sys
import os
import time
import sqlite3
import json
import re
import logging
import random
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("mock_collect_data.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("mock_collect_data")

class MockSpectrophotometer:
    """Mock class that simulates a spectrophotometer by generating random data."""
    
    def __init__(self):
        self.connected = False
        logger.info("Initialized mock spectrophotometer")
    
    def initialize(self):
        """Initialize mock communication with the spectrophotometer."""
        self.connected = True
        logger.info("Connected to mock spectrophotometer")
        return True
        
    def send_command(self, command):
        """Simulate sending a command to the spectrophotometer."""
        logger.info(f"Mock command sent: {command}")
        if command.startswith("CONTROL"):
            return "E00 ONLINE"
        elif command.startswith("RELEASE"):
            return "E00 OFFLINE"
        elif command.startswith("READ?"):
            # Generate a random absorbance value between 0.0 and 2.0
            return f"E00 {random.uniform(0.0, 2.0):.4f}"
        elif command.startswith("WAVE"):
            # Extract wavelength from command
            parts = command.split()
            if len(parts) > 1:
                wavelength = parts[1]
                return f"E00 WAVELENGTH SET {wavelength}"
            return "E00 WAVELENGTH ERROR"
        else:
            return "E00 UNKNOWN COMMAND"
    
    def close(self):
        """Close the mock connection."""
        self.connected = False
        logger.info("Mock spectrophotometer connection closed")
    
    def read_absorbance(self, wavelength):
        """Generate a mock absorbance reading for the given wavelength."""
        # Create a more realistic absorbance curve
        # Higher values around 400-450nm and 650-700nm to simulate peaks
        base_value = 0.5
        
        # First peak around 400-450nm
        if 400 <= wavelength <= 450:
            peak_contribution = 1.0 - abs(wavelength - 425) / 25.0
            base_value += peak_contribution * 0.8
        
        # Second peak around 650-700nm
        if 650 <= wavelength <= 700:
            peak_contribution = 1.0 - abs(wavelength - 675) / 25.0
            base_value += peak_contribution * 0.6
        
        # Add some noise
        noise = random.uniform(-0.1, 0.1)
        
        # Ensure absorbance is between 0 and 2
        absorbance = max(0, min(2, base_value + noise))
        
        logger.info(f"Mock absorbance at {wavelength}nm: {absorbance:.4f}")
        return absorbance
    
    def scan_wavelengths(self, start, end, step, speed='FAST', output='TEXT'):
        """Generate mock scan data across a wavelength range."""
        results = []
        
        # Calculate how many data points to generate
        num_points = int((end - start) / step) + 1
        
        # Simulate a processing delay based on speed
        if speed == 'SLOW':
            time.sleep(0.5)
        else:  # FAST
            time.sleep(0.2)
        
        # Generate data points
        for i in range(num_points):
            wavelength = start + i * step
            absorbance = self.read_absorbance(wavelength)
            results.append((wavelength, absorbance))
        
        logger.info(f"Generated {len(results)} mock data points from {start}nm to {end}nm")
        return results

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
            
            # For testing purposes, create mock task data when DB doesn't have entries
            mock_name = f"Mock Task {task_id_int}"
            mock_wavelengths = json.dumps({
                'start': 400,
                'end': 700,
                'step': 10
            })
            
            sanitized = mock_name.strip().lower()
            sanitized = re.sub(r'[^a-z0-9]+', '_', sanitized)
            sanitized = re.sub(r'^_+|_+$', '', sanitized)
            
            logger.info(f"Created mock task data for ID {task_id_int}")
            return {
                'task_id': task_id_int,
                'name': mock_name,
                'sanitized_name': sanitized,
                'wavelength_start': 400,
                'wavelength_end': 700,
                'wavelength_step': 10
            }
        
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
    """Collect mock data for the given task and save to database."""
    logger.info(f"Starting mock data collection for task {task_id}")
    
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
    
    # Initialize mock spectrophotometer
    spectro = MockSpectrophotometer()
    if not spectro.initialize():
        logger.error("Failed to initialize mock spectrophotometer")
        spectro.close()
        return False

    try:
        # Enter control mode
        spectro.send_command("CONTROL")
        
        # Get the next time point
        time_point = get_next_time_point(db_path)
        logger.info(f"Collecting mock data for time point {time_point}")
        
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
        
        for wl, _, ab in data_points[:5]:  # Just log a few points
            logger.info(f"Generated mock data point: wavelength={wl}, time_point={time_point}, absorbance={ab:.4f}")
        
        if not data_points:
            logger.error("No mock data points were generated from scan (after filtering)")
            return False
        
        logger.info(f"Generated {len(data_points)} mock data points, storing in database...")
        
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
        logger.info(f"Verified {count} mock data points stored in database for time point {time_point}")
        
        # Verify data format and log sample
        cursor.execute("""
            SELECT wavelength, time_point, absorbance, timestamp 
            FROM Absorbance 
            WHERE time_point = ? 
            ORDER BY wavelength
        """, (time_point,))
        rows = cursor.fetchall()
        logger.info("Sample of stored mock data:")
        for row in rows[:5]:  # Log first 5 rows
            logger.info(f"  Wavelength: {row[0]}, Time: {row[1]}, Absorbance: {row[2]:.4f}, Timestamp: {row[3]}")
        
        # Commit and close
        conn.commit()
        conn.close()
        
        logger.info(f"Successfully collected and stored {len(data_points)} mock data points for task {task_id} at time point {time_point}")
        return True
        
    except Exception as e:
        logger.error(f"Error collecting mock data for task {task_id}: {e}")
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