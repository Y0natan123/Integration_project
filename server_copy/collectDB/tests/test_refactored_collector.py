#!/usr/bin/env python3
"""
Test script for the refactored data collection system.

This script tests each component individually and then tests the integrated system.
"""

import sys
import os
import logging
import tempfile
import sqlite3
import json

# Add the parent directory to the Python path for package imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from spectrophotometers.mock_spectrophotometer import MockSpectrophotometer
from providers.task_info_provider import TaskInfoProvider  
from providers.time_point_provider import TimePointProvider
from database.absorbance_db import AbsorbanceDB
from collectors.data_collector import DataCollector

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_mock_spectrophotometer():
    """Test the MockSpectrophotometer class."""
    logger.info("Testing MockSpectrophotometer...")
    
    spectro = MockSpectrophotometer()
    
    # Test initialization
    assert spectro.initialize() == True
    
    # Test commands
    response = spectro.send_command("CONTROL")
    assert "E00 ONLINE" in response
    
    # Test absorbance reading
    absorbance = spectro.read_absorbance(450.0)
    assert 0.0 <= absorbance <= 2.0
    
    # Test scanning
    scan_results = spectro.scan_wavelengths(400, 450, 10)
    assert len(scan_results) == 6  # 400, 410, 420, 430, 440, 450
    assert all(isinstance(point[0], (int, float)) and isinstance(point[1], (int, float)) for point in scan_results)
    
    spectro.close()
    logger.info("MockSpectrophotometer tests passed!")

def test_time_point_provider():
    """Test the TimePointProvider class."""
    logger.info("Testing TimePointProvider...")
    
    # Create a temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        tmp_db_path = tmp_file.name
    
    try:
        provider = TimePointProvider()
        
        # Test with non-existent database
        time_point = provider.get_next_time_point(tmp_db_path)
        assert time_point == 0
        
        # Create database with some data
        conn = sqlite3.connect(tmp_db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE Absorbance (
                id INTEGER PRIMARY KEY,
                wavelength INTEGER,
                time_point INTEGER,
                absorbance REAL
            )
        ''')
        cursor.execute("INSERT INTO Absorbance (wavelength, time_point, absorbance) VALUES (400, 0, 1.0)")
        cursor.execute("INSERT INTO Absorbance (wavelength, time_point, absorbance) VALUES (410, 0, 1.1)")
        cursor.execute("INSERT INTO Absorbance (wavelength, time_point, absorbance) VALUES (400, 1, 0.9)")
        conn.commit()
        conn.close()
        
        # Test with existing data
        time_point = provider.get_next_time_point(tmp_db_path)
        assert time_point == 2
        
        logger.info("TimePointProvider tests passed!")
        
    finally:
        os.unlink(tmp_db_path)

def test_absorbance_db():
    """Test the AbsorbanceDB class."""
    logger.info("Testing AbsorbanceDB...")
    
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        tmp_db_path = tmp_file.name
    
    try:
        # Test database creation and data storage
        db = AbsorbanceDB(tmp_db_path)
        
        # Test storing data
        test_data = [(400, 0, 1.0), (410, 0, 1.1), (420, 0, 1.2)]
        stored_count = db.store(test_data)
        assert stored_count == 3
        
        # Test sampling data
        sample = db.sample(0, limit=5)
        assert len(sample) == 3
        assert sample[0][0] == 400  # wavelength
        assert sample[0][1] == 0    # time_point
        assert abs(sample[0][2] - 1.0) < 0.001  # absorbance
        
        logger.info("AbsorbanceDB tests passed!")
        
    finally:
        os.unlink(tmp_db_path)

def create_test_task_db():
    """Create a test database with task information."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        tmp_db_path = tmp_file.name
    
    # Create the database with test task
    conn = sqlite3.connect(tmp_db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE Tasks (
            id INTEGER PRIMARY KEY,
            name TEXT,
            wavelengths TEXT
        )
    ''')
    
    wavelengths_data = {
        "start": 400,
        "end": 450,
        "step": 10
    }
    
    cursor.execute(
        "INSERT INTO Tasks (id, name, wavelengths) VALUES (?, ?, ?)",
        (1, "Test Task", json.dumps(wavelengths_data))
    )
    
    conn.commit()
    conn.close()
    
    return tmp_db_path

def test_task_info_provider():
    """Test the TaskInfoProvider class."""
    logger.info("Testing TaskInfoProvider...")
    
    test_db_path = create_test_task_db()
    
    try:
        provider = TaskInfoProvider(db_path=test_db_path)
        
        # Test getting valid task info
        task_info = provider.get_task_info("1")
        assert task_info is not None
        assert task_info['task_id'] == 1
        assert task_info['name'] == "Test Task"
        assert task_info['wavelength_start'] == 400
        assert task_info['wavelength_end'] == 450
        assert task_info['wavelength_step'] == 10
        assert task_info['sanitized_name'] == "test_task"
        
        # Test getting invalid task info
        task_info = provider.get_task_info("999")
        assert task_info is None
        
        logger.info("TaskInfoProvider tests passed!")
        
    finally:
        os.unlink(test_db_path)

def test_data_collector_integration():
    """Test the complete DataCollector integration."""
    logger.info("Testing DataCollector integration...")
    
    test_db_path = create_test_task_db()
    
    try:
        # Create a mock data collector
        collector = DataCollector.create_mock_collector()
        
        # Override the task provider to use our test database
        collector.task_provider = TaskInfoProvider(db_path=test_db_path)
        
        # Test data collection
        success = collector.collect_data("1")
        assert success == True
        
        logger.info("DataCollector integration tests passed!")
        
    finally:
        os.unlink(test_db_path)

def run_all_tests():
    """Run all tests."""
    logger.info("Starting refactored data collection system tests...")
    logger.info("=" * 50)
    
    try:
        test_mock_spectrophotometer()
        test_time_point_provider()
        test_absorbance_db()
        test_task_info_provider()
        test_data_collector_integration()
        
        logger.info("=" * 50)
        logger.info("All tests passed! The refactored system is working correctly.")
        return True
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        logger.exception("Full traceback:")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1) 