import os
import sqlite3
import json
import re
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class TaskInfoProvider:
    """Provider for task information from the main database."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize TaskInfoProvider.
        
        Args:
            db_path: Path to the main database. If None, uses default path.
        """
        if db_path is None:
            # Path to main DB in the server folder - use absorbanceDB.db
            self.db_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                'absorbanceDB.db'
            )
        else:
            self.db_path = db_path
    
    def get_task_info(self, task_id: str) -> Optional[Dict]:
        """
        Get task information from the main database.
        
        Args:
            task_id: The task ID to look up
            
        Returns:
            Dictionary with task information or None if not found
        """
        try:
            task_id_int = int(task_id)
        except ValueError:
            logger.error(f"Invalid task ID (not integer): {task_id}")
            return None
            
        try:
            conn = sqlite3.connect(self.db_path)
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