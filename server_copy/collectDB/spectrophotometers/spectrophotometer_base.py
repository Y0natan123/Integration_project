# spectrophotometer_base.py
from abc import ABC, abstractmethod
from typing import List, Tuple

class SpectrophotometerBase(ABC):
    """abstract base class for spectrophotometer devices"""
    
    @abstractmethod
    def initialize(self) -> bool:
        """initialize communication, return True on success"""
        pass

    @abstractmethod
    def send_command(self, command: str) -> str:
        """send a raw command, return raw response"""
        pass

    @abstractmethod
    def close(self) -> None:
        """close communication"""
        pass

    @abstractmethod
    def read_absorbance(self, wavelength: float) -> float:
        """set wavelength, read absorbance value"""
        pass

    @abstractmethod
    def scan_wavelengths(
        self, start: float, end: float, step: float,
        speed: str='FAST', output: str='TEXT'
    ) -> List[Tuple[float, float]]:
        """scan a range, return list of (wavelength,absorbance)"""
        pass