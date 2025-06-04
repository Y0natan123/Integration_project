# real_spectrophotometer.py
import time
import serial
import serial.tools.list_ports
import logging
import sys
import os
from typing import List, Tuple

# Add the spectrophotometers directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from spectrophotometer_base import SpectrophotometerBase

logger = logging.getLogger(__name__)

class RealSpectrophotometer(SpectrophotometerBase):
    """Real spectrophotometer using serial communication."""

    # Default settings
    DEFAULT_PORT = 'COM11'
    DEFAULT_BAUD = 19200
    DEFAULT_TIMEOUT = 1.0

    # Commands
    COMMAND_CONTROL = 'CONTROL'
    COMMAND_RELEASE = 'RELEASE'
    COMMAND_READ = 'READ?'
    COMMAND_WAVE = 'WAVE'

    def __init__(self, port: str = None, baud: int = None, timeout: float = None):
        """
        Initialize RealSpectrophotometer.
        
        Args:
            port: Serial port (e.g., 'COM11'). If None, uses default.
            baud: Baud rate. If None, uses default.
            timeout: Timeout in seconds. If None, uses default.
        """
        self._port = port or self.DEFAULT_PORT
        self._baud = baud or self.DEFAULT_BAUD
        self._timeout = timeout or self.DEFAULT_TIMEOUT
        self._ser = None

    @staticmethod
    def list_available_ports() -> List[str]:
        """List all available COM ports."""
        ports = serial.tools.list_ports.comports()
        if not ports:
            logger.warning("No COM ports found")
            return []
        
        logger.info("Available COM ports:")
        available_ports = []
        for port in ports:
            logger.info(f"  {port.device} - {port.description}")
            available_ports.append(port.device)
        
        return available_ports

    def initialize(self) -> bool:
        """Initialize communication with the spectrophotometer."""
        try:
            # List available ports first
            available_ports = self.list_available_ports()
            if not available_ports:
                logger.error("No COM ports available")
                return False
                
            if self._port not in available_ports:
                logger.error(f"Specified port {self._port} not found. Available ports: {available_ports}")
                return False

            # Try to open the port with exclusive access
            self._ser = serial.Serial(
                port=self._port,
                baudrate=self._baud,
                timeout=self._timeout,
                exclusive=True  # Request exclusive access
            )
            
            logger.info(f"Connected to spectrophotometer on {self._port}")
            return True
            
        except serial.SerialException as e:
            logger.error(f"Serial port error: {e}")
            if "Access is denied" in str(e):
                logger.error("Port access denied. Please ensure no other program is using the port and try running with administrator privileges.")
            return False
        except Exception as e:
            logger.error(f"Error connecting to spectrophotometer: {e}")
            return False

    def send_command(self, command: str) -> str:
        """Send a command to the spectrophotometer."""
        try:
            if not self._ser:
                logger.error("Serial connection not initialized")
                return ""
                
            self._ser.write((command + '\n').encode())
            response = self._ser.readline().decode().strip()
            logger.debug(f"Command: {command} -> Response: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error sending command '{command}': {e}")
            return ""

    def close(self) -> None:
        """Close the connection to the spectrophotometer."""
        if self._ser:
            try:
                self.send_command(self.COMMAND_RELEASE)
                self._ser.close()
                logger.info("Spectrophotometer connection closed")
            except Exception as e:
                logger.error(f"Error closing spectrophotometer connection: {e}")
            finally:
                self._ser = None

    def read_absorbance(self, wavelength: float) -> float:
        """
        Read absorbance at specified wavelength.
        
        Args:
            wavelength: Wavelength in nm
            
        Returns:
            Absorbance value or -1.0 on error
        """
        try:
            # Set wavelength
            wave_response = self.send_command(f"{self.COMMAND_WAVE} {wavelength}")
            time.sleep(2)  # Wait for wavelength adjustment
            
            # Read absorbance
            response = self.send_command(self.COMMAND_READ)
            if response and response.startswith('E00'):
                return float(response.split()[1])
            else:
                logger.error(f"Invalid response from spectrophotometer: {response}")
                return -1.0
                
        except Exception as e:
            logger.error(f"Error reading absorbance at wavelength {wavelength}: {e}")
            return -1.0

    def scan_wavelengths(
        self, start: float, end: float, step: float,
        speed: str = 'FAST', output: str = 'TEXT'
    ) -> List[Tuple[float, float]]:
        """
        Scan a range of wavelengths in one command.
        
        Args:
            start: Starting wavelength
            end: Ending wavelength
            step: Step size
            speed: Scan speed ('FAST' or 'SLOW')
            output: Output format ('TEXT')
            
        Returns:
            List of (wavelength, absorbance) tuples
        """
        try:
            if not self._ser:
                logger.error("Serial connection not initialized")
                return []
                
            scan_cmd = f"SCAN {start} {end} {step} {speed} {output}"
            self._ser.write((scan_cmd + '\n').encode())
            
            lines = []
            expected_points = int((end - start) / step) + 1
            start_time = time.time()
            
            # Read response lines with timeout
            while len(lines) < expected_points and (time.time() - start_time) < 15:
                line = self._ser.readline().decode().strip()
                if line:
                    lines.append(line)
            
            logger.info(f"Raw lines from SCAN: {lines[:10]}...")  # Show first 10 lines
            
            results = []
            # Remove the first line if it's a status code (e.g., 'E00')
            if lines and lines[0].startswith('E'):
                lines = lines[1:]
            
            for i, ab_str in enumerate(lines):
                try:
                    absorbance = float(ab_str)
                    wavelength = start + i * step
                    results.append((wavelength, absorbance))
                except ValueError as e:
                    logger.error(f"Error parsing scan value '{ab_str}': {e}")
            
            logger.info(f"Scan completed: {len(results)} data points from {start}nm to {end}nm")
            return results
            
        except Exception as e:
            logger.error(f"Error during scan_wavelengths: {e}")
            return []