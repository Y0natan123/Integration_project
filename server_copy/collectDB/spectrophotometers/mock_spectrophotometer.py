import random
import time
import logging
import sys
import os
from typing import List, Tuple

# Add the spectrophotometers directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from spectrophotometer_base import SpectrophotometerBase

logger = logging.getLogger(__name__)

class MockSpectrophotometer(SpectrophotometerBase):
    """Mock spectrophotometer for testing and development."""
    
    def __init__(self):
        """Initialize the mock spectrophotometer."""
        self.is_initialized = False
        self.current_wavelength = 400.0
    
    def initialize(self) -> bool:
        """Initialize mock connection."""
        logger.info("Mock spectrophotometer: Connected")
        self.is_initialized = True
        return True
    
    def send_command(self, command: str) -> str:
        """Send a mock command and return a mock response."""
        logger.debug(f"Mock send command: {command}")
        
        if not self.is_initialized and command != "CONTROL":
            return "ERROR: Not initialized"
        
        if command == "CONTROL":
            return "E00 ONLINE"
        elif command == "RELEASE":
            return "E00 OFFLINE"
        elif command == "READ?":
            absorbance = self.read_absorbance(self.current_wavelength)
            return f"E00 {absorbance:.4f}"
        elif command.startswith("WAVE"):
            try:
                wavelength = float(command.split()[1])
                self.current_wavelength = wavelength
                return f"E00 WAVELENGTH SET {wavelength}"
            except (IndexError, ValueError):
                return "ERROR: Invalid wavelength"
        else:
            return "E00 OK"
    
    def close(self) -> None:
        """Close mock connection."""
        logger.info("Mock spectrophotometer: Connection closed")
        self.is_initialized = False
    
    def read_absorbance(self, wavelength: float) -> float:
        """
        Generate mock absorbance reading with realistic characteristics.
        
        Args:
            wavelength: Wavelength in nm
            
        Returns:
            Mock absorbance value
        """
        # Simulate realistic absorption peaks
        base = 0.5
        
        # Peak around 425nm (blue region)
        if 400 <= wavelength <= 450:
            peak_intensity = 1 - abs(wavelength - 425) / 25
            base += peak_intensity * 0.8
        
        # Peak around 675nm (red region)  
        if 650 <= wavelength <= 700:
            peak_intensity = 1 - abs(wavelength - 675) / 25
            base += peak_intensity * 0.6
        
        # Add some random noise
        noise = random.uniform(-0.1, 0.1)
        absorbance = max(0, min(2, base + noise))
        
        logger.debug(f"Mock absorbance @ {wavelength}nm: {absorbance:.4f}")
        return absorbance
    
    def scan_wavelengths(
        self, start: float, end: float, step: float,
        speed: str = 'FAST', output: str = 'TEXT'
    ) -> List[Tuple[float, float]]:
        """
        Simulate scanning a range of wavelengths.
        
        Args:
            start: Starting wavelength
            end: Ending wavelength
            step: Step size
            speed: Scan speed ('FAST' or 'SLOW')
            output: Output format ('TEXT')
            
        Returns:
            List of (wavelength, absorbance) tuples
        """
        # Simulate scanning delay
        scan_delay = 0.2 if speed == 'FAST' else 0.5
        time.sleep(scan_delay)
        
        points = []
        num_points = int((end - start) / step) + 1
        
        for i in range(num_points):
            wavelength = start + i * step
            absorbance = self.read_absorbance(wavelength)
            points.append((wavelength, absorbance))
        
        logger.info(f"Mock scan generated {len(points)} data points from {start}nm to {end}nm")
        return points 