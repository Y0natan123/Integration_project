import logging
import sys
import os
from typing import Optional

# Add the collectDB directory to the path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

from spectrophotometers.spectrophotometer_base import SpectrophotometerBase
from spectrophotometers.real_spectrophotometer import RealSpectrophotometer
from spectrophotometers.mock_spectrophotometer import MockSpectrophotometer
from providers.task_info_provider import TaskInfoProvider
from providers.time_point_provider import TimePointProvider
from database.absorbance_db import AbsorbanceDB

logger = logging.getLogger(__name__)

class DataCollector:
    """Main data collection orchestrator."""
    
    def __init__(self, spectro: Optional[SpectrophotometerBase] = None, 
                 task_provider: Optional[TaskInfoProvider] = None,
                 time_provider: Optional[TimePointProvider] = None,
                 use_mock: bool = False):
        """
        Initialize DataCollector.
        
        Args:
            spectro: Spectrophotometer instance. If None, creates one based on use_mock.
            task_provider: Task info provider. If None, creates default.
            time_provider: Time point provider. If None, creates default.
            use_mock: Whether to use mock spectrophotometer if spectro is None.
        """
        # Initialize spectrophotometer
        if spectro is not None:
            self.spectro = spectro
        elif use_mock:
            self.spectro = MockSpectrophotometer()
        else:
            self.spectro = RealSpectrophotometer()
        
        # Initialize providers
        self.task_provider = task_provider or TaskInfoProvider()
        self.time_provider = time_provider or TimePointProvider()
    
    def collect_data(self, task_id: str) -> bool:
        """
        Collect data for the given task and save to database.
        
        Args:
            task_id: The task ID to collect data for
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Starting data collection for task {task_id}")
        
        # Get task information
        task_info = self.task_provider.get_task_info(task_id)
        if task_info is None:
            logger.error(f"Could not get task information for {task_id}")
            return False
        
        logger.info(f"Task info: {task_info['name']} - Wavelengths: {task_info['wavelength_start']}-{task_info['wavelength_end']} nm (step: {task_info['wavelength_step']})")
        
        # Get database path and initialize DB
        db_path = AbsorbanceDB.get_db_path(task_info)
        logger.info(f"Using database file: {db_path}")
        
        absorbance_db = AbsorbanceDB(db_path)
        
        # Get the next time point
        time_point = self.time_provider.get_next_time_point(db_path)
        logger.info(f"Collecting data for time point {time_point}")
        
        # Initialize spectrophotometer
        if not self.spectro.initialize():
            logger.error("Failed to initialize spectrophotometer")
            return False

        try:
            # Enter control mode
            control_response = self.spectro.send_command(self.spectro.COMMAND_CONTROL if hasattr(self.spectro, 'COMMAND_CONTROL') else 'CONTROL')
            logger.debug(f"Control response: {control_response}")
            
            # Perform wavelength scan
            wavelength_start = task_info['wavelength_start']
            wavelength_end = task_info['wavelength_end']
            display_step = task_info['wavelength_step']  # Step requested by the site
            machine_step = 2.0  # Always use a valid step for the device
            
            logger.info(f"Scanning wavelengths from {wavelength_start} to {wavelength_end} with machine step {machine_step}")
            scan_results = self.spectro.scan_wavelengths(wavelength_start, wavelength_end, machine_step)
            
            if not scan_results:
                logger.error("No data points were collected from scan")
                return False
            
            # Filter results to only keep wavelengths matching the site's requested step
            filtered_points = []
            for wl, ab in scan_results:
                # Only keep wavelengths that match the display step (within a small tolerance)
                if (abs((wl - wavelength_start) % display_step) < 1e-6 or 
                    abs((wl - wavelength_start) % display_step - display_step) < 1e-6):
                    filtered_points.append((int(round(wl)), time_point, ab))
            
            data_points = filtered_points
            
            if not data_points:
                logger.error("No data points were collected from scan (after filtering)")
                return False
            
            # Log sample of collected data
            for wl, tp, ab in data_points[:5]:  # Show first 5 points
                logger.info(f"Collected data point: wavelength={wl}, time_point={tp}, absorbance={ab:.4f}")
            
            logger.info(f"Collected {len(data_points)} data points, storing in database...")
            
            # Store data in database
            stored_count = absorbance_db.store(data_points)
            if stored_count == 0:
                logger.error("Failed to store data in database")
                return False
            
            # Get sample of stored data for verification
            sample_data = absorbance_db.sample(time_point)
            logger.info("Sample of stored data:")
            for row in sample_data:
                logger.info(f"  Wavelength: {row[0]}, Time: {row[1]}, Absorbance: {row[2]:.4f}, Timestamp: {row[3]}")
            
            logger.info(f"Successfully collected and stored {len(data_points)} data points for task {task_id} at time point {time_point}")
            return True
            
        except Exception as e:
            logger.error(f"Error collecting data for task {task_id}: {e}")
            return False
        finally:
            # Always close the spectrophotometer connection
            try:
                self.spectro.close()
            except Exception as e:
                logger.error(f"Error closing spectrophotometer: {e}")
    
    @staticmethod
    def create_mock_collector() -> 'DataCollector':
        """Create a DataCollector with mock spectrophotometer for testing."""
        return DataCollector(use_mock=True)
    
    @staticmethod  
    def create_real_collector(port: str = None, baud: int = None, timeout: float = None) -> 'DataCollector':
        """Create a DataCollector with real spectrophotometer."""
        spectro = RealSpectrophotometer(port=port, baud=baud, timeout=timeout)
        return DataCollector(spectro=spectro) 