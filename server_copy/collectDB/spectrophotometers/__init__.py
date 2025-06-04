"""
Spectrophotometer Hardware Communication Layer

This package contains classes for communicating with spectrophotometer devices:
- SpectrophotometerBase: Abstract base class defining the interface
- RealSpectrophotometer: Implementation for real hardware via serial communication
- MockSpectrophotometer: Mock implementation for testing and development

The abstract base class ensures all implementations provide consistent interfaces
for initialization, command sending, data reading, and wavelength scanning.
"""

from .spectrophotometer_base import SpectrophotometerBase
from .real_spectrophotometer import RealSpectrophotometer
from .mock_spectrophotometer import MockSpectrophotometer

__all__ = [
    'SpectrophotometerBase',
    'RealSpectrophotometer', 
    'MockSpectrophotometer'
] 