import os
import sqlite3
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

class AbsorbanceDB:
    """Database manager for absorbance data."""
    
    def __init__(self, db_path: str):
        """
        Initialize AbsorbanceDB.
        
        Args:
            db_path: Path to the database file
        """
        self.db_path = db_path
        self._ensure_data_directory()
        self._create_table_if_not_exists()
    
    def _ensure_data_directory(self):
        """Ensure the data directory exists."""
        data_dir = os.path.dirname(self.db_path)
        os.makedirs(data_dir, exist_ok=True)
    
    def _create_table_if_not_exists(self):
        """Create the Absorbance table if it doesn't exist."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
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
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error creating table: {e}")
    
    def store(self, data_points: List[Tuple[int, int, float]]) -> int:
        """
        Store data points in the database.
        
        Args:
            data_points: List of tuples (wavelength, time_point, absorbance)
            
        Returns:
            Number of data points stored
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Insert data
            cursor.executemany(
                "INSERT OR REPLACE INTO Absorbance (wavelength, time_point, absorbance) VALUES (?, ?, ?)", 
                data_points
            )
            
            # Get the time point from first data point for verification
            if data_points:
                time_point = data_points[0][1]
                
                # Verify data was inserted
                cursor.execute("SELECT COUNT(*) FROM Absorbance WHERE time_point = ?", (time_point,))
                count = cursor.fetchone()[0]
                logger.info(f"Verified {count} data points stored in database for time point {time_point}")
            
            conn.commit()
            conn.close()
            
            logger.info(f"Successfully stored {len(data_points)} data points")
            return len(data_points)
            
        except Exception as e:
            logger.error(f"Error storing data points: {e}")
            return 0
    
    def sample(self, time_point: int, limit: int = 5) -> List[Tuple]:
        """
        Get a sample of data points for verification.
        
        Args:
            time_point: Time point to sample from
            limit: Maximum number of rows to return
            
        Returns:
            List of tuples (wavelength, time_point, absorbance, timestamp)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT wavelength, time_point, absorbance, timestamp 
                FROM Absorbance 
                WHERE time_point = ? 
                ORDER BY wavelength
                LIMIT ?
            """, (time_point, limit))
            
            rows = cursor.fetchall()
            conn.close()
            
            return rows
            
        except Exception as e:
            logger.error(f"Error sampling data: {e}")
            return []
    
    @staticmethod
    def get_db_path(task_info: dict, data_dir: Optional[str] = None) -> str:
        """
        Generate database path for a task.
        
        Args:
            task_info: Task information dictionary
            data_dir: Data directory path. If None, uses default.
            
        Returns:
            Full path to the database file
        """
        if data_dir is None:
            # Default to collectDB/data directory (same directory as this module)
            data_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                'data'
            )
        
        # Construct per-task DB filename using the sanitized name
        db_filename = f"task_{task_info['task_id']}_{task_info['sanitized_name']}.db"
        return os.path.join(data_dir, db_filename) 