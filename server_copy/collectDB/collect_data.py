#!/usr/bin/env python3
"""
Simple entry point for data collection using DataCollector class.

Usage:
    python collect_data.py <task_id> [mock]
"""

import sys
import os
import logging

# Add the collectDB directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from collectors.data_collector import DataCollector

# Set up basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    if len(sys.argv) < 2:
        print("Usage: python collect_data.py <task_id> [mock]")
        sys.exit(1)
    
    task_id = sys.argv[1]
    use_mock = len(sys.argv) > 2 and sys.argv[2].lower() == 'mock'
    
    logger = logging.getLogger(__name__)
    logger.info(f"Starting data collection for task {task_id} (mode: {'mock' if use_mock else 'real'})")
    
    try:
        # Create data collector
        if use_mock:
            collector = DataCollector.create_mock_collector()
        else:
            collector = DataCollector.create_real_collector()
        
        # Collect data
        success = collector.collect_data(task_id)
        
        if success:
            logger.info("Data collection completed successfully")
            print("SUCCESS")
            sys.exit(0)
        else:
            logger.error("Data collection failed")
            print("FAILED")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Error during data collection: {e}")
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 