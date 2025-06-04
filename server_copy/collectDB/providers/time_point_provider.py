import sqlite3
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class TimePointProvider:
    """Provider for managing time points in the absorbance database."""
    
    def get_next_time_point(self, db_path: str) -> int:
        """
        Get the next time point for the given database.
        
        Args:
            db_path: Path to the task-specific database
            
        Returns:
            The next time point number (0-based)
        """
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