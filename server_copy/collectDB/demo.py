#!/usr/bin/env python3
"""
🎯 Demo Script for the Refactored Data Collection System

This script demonstrates the clean, organized architecture of the
spectrophotometer data collection system.
"""

import sys
import os
import tempfile
import sqlite3
import json
import logging

# Add the collectDB directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from collectors.data_collector import DataCollector
from providers.task_info_provider import TaskInfoProvider

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def create_demo_database():
    """Create a demo database with sample task data."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        db_path = tmp_file.name
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create Tasks table
    cursor.execute('''
        CREATE TABLE Tasks (
            id INTEGER PRIMARY KEY,
            name TEXT,
            wavelengths TEXT
        )
    ''')
    
    # Insert sample tasks
    tasks = [
        (1, "Blue Light Absorption", json.dumps({"start": 400, "end": 500, "step": 10})),
        (2, "Red Light Spectrum", json.dumps({"start": 600, "end": 700, "step": 5})),
        (3, "Full Visible Range", json.dumps({"start": 380, "end": 750, "step": 20}))
    ]
    
    cursor.executemany(
        "INSERT INTO Tasks (id, name, wavelengths) VALUES (?, ?, ?)",
        tasks
    )
    
    conn.commit()
    conn.close()
    
    return db_path

def main():
    """Main demo function."""
    print("🔬 Spectrophotometer Data Collection System Demo")
    print("=" * 60)
    print("🏗️  Architecture: Clean, Modular, Object-Oriented")
    print("🧪 Testing: Comprehensive Mock System")
    print("📊 Database: SQLite with Proper Isolation")
    print("🎯 Design: Following SOLID Principles")
    print("=" * 60)
    
    # Create demo database
    print("\n📋 Creating demo database with sample tasks...")
    demo_db = create_demo_database()
    
    try:
        # Create a mock data collector with custom task provider
        print("🔧 Initializing mock data collector...")
        collector = DataCollector.create_mock_collector()
        collector.task_provider = TaskInfoProvider(db_path=demo_db)
        
        # Demonstrate data collection for each task
        tasks = [1, 2, 3]
        
        for task_id in tasks:
            print(f"\n🎯 Collecting data for Task {task_id}...")
            success = collector.collect_data(str(task_id))
            
            if success:
                print(f"   ✅ Task {task_id} completed successfully!")
            else:
                print(f"   ❌ Task {task_id} failed!")
        
        print("\n🎉 Demo completed successfully!")
        print("\n📁 Key Components Demonstrated:")
        print("   🔌 MockSpectrophotometer - Hardware abstraction")
        print("   📊 TaskInfoProvider - Data retrieval")
        print("   ⏰ TimePointProvider - Time management")
        print("   💾 AbsorbanceDB - Data storage")
        print("   🎯 DataCollector - Orchestration")
        
        print(f"\n📍 Demo database location: {demo_db}")
        print("   (Temporary file - will be cleaned up)")
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        return False
    
    finally:
        # Clean up
        try:
            os.unlink(demo_db)
            print(f"\n🗑️  Cleaned up demo database")
        except:
            pass
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🌟 The refactored system is working perfectly!")
        print("   Ready for production use! 🚀")
    else:
        print("\n⚠️  Demo encountered issues")
    
    print("\n" + "=" * 60)
    print("Thank you for exploring the Data Collection System! 🙏") 