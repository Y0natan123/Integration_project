#!/usr/bin/env python3
"""
Refactored data collection script using the new class structure.

This script follows the class diagram design with proper separation of concerns:
- SpectrophotometerBase/RealSpectrophotometer/MockSpectrophotometer for device communication
- TaskInfoProvider for task information management
- TimePointProvider for time point management  
- AbsorbanceDB for database operations
- DataCollector for orchestrating the collection process

Usage:
    python collect_data_refactored.py <task_id> [--mock]
"""

import sys
import os
import logging
import argparse
from datetime import datetime

# Add the parent directory to the Python path for package imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from collectors.data_collector import DataCollector

# Set up logging
def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("collect_data_refactored.log"),
            logging.StreamHandler()
        ]
    )

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Collect spectrophotometer data for a specific task',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        'task_id',
        type=str,
        help='Task ID to collect data for'
    )
    
    parser.add_argument(
        '--mock',
        action='store_true',
        help='Use mock spectrophotometer instead of real device'
    )
    
    parser.add_argument(
        '--port',
        type=str,
        default='COM11',
        help='Serial port for real spectrophotometer (default: COM11)'
    )
    
    parser.add_argument(
        '--baud',
        type=int,
        default=19200,
        help='Baud rate for serial communication (default: 19200)'
    )
    
    parser.add_argument(
        '--timeout',
        type=float,
        default=1.0,
        help='Serial timeout in seconds (default: 1.0)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose (debug) logging'
    )
    
    return parser.parse_args()

def main():
    """Main entry point."""
    args = parse_arguments()
    
    # Set up logging
    setup_logging()
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger = logging.getLogger("collect_data_refactored")
    
    logger.info("=" * 60)
    logger.info(f"Starting data collection for task {args.task_id}")
    logger.info(f"Timestamp: {datetime.now()}")
    logger.info(f"Mode: {'Mock' if args.mock else 'Real'}")
    if not args.mock:
        logger.info(f"Serial settings: {args.port}, {args.baud} baud, {args.timeout}s timeout")
    logger.info("=" * 60)
    
    try:
        # Create the appropriate data collector
        if args.mock:
            logger.info("Creating mock data collector for testing")
            collector = DataCollector.create_mock_collector()
        else:
            logger.info(f"Creating real data collector with port {args.port}")
            collector = DataCollector.create_real_collector(
                port=args.port,
                baud=args.baud, 
                timeout=args.timeout
            )
        
        # Collect data
        success = collector.collect_data(args.task_id)
        
        if success:
            logger.info("Data collection completed successfully")
            sys.exit(0)
        else:
            logger.error("Data collection failed")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.warning("Data collection interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error during data collection: {e}")
        logger.exception("Full traceback:")
        sys.exit(1)

if __name__ == "__main__":
    main() 