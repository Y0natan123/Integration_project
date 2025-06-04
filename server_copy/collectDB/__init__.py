"""
Data Collection System for Spectrophotometer

A modular, object-oriented system for collecting absorbance data from spectrophotometers.
This package follows clean architecture principles with proper separation of concerns.

Main Components:
- spectrophotometers: Hardware communication layer
- providers: Data providers for tasks and time points  
- database: Database operations for data storage
- collectors: Main data collection orchestration
- scripts: Command-line interfaces
- tests: Comprehensive test suite
"""

__version__ = "2.0.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

# Import main classes for easy access
from .collectors.data_collector import DataCollector
from .spectrophotometers.spectrophotometer_base import SpectrophotometerBase
from .spectrophotometers.real_spectrophotometer import RealSpectrophotometer
from .spectrophotometers.mock_spectrophotometer import MockSpectrophotometer

__all__ = [
    'DataCollector',
    'SpectrophotometerBase', 
    'RealSpectrophotometer',
    'MockSpectrophotometer'
] 