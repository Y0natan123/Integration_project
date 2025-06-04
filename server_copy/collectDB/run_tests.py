#!/usr/bin/env python3
"""
Test runner for the refactored data collection system.

This script properly sets up the Python path and runs all tests.
"""

import sys
import os

# Add the current directory to Python path for package imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Now run the tests
if __name__ == "__main__":
    try:
        # Import and run the test module
        from tests.test_refactored_collector import run_all_tests
        
        print("🧪 Running Data Collection System Tests")
        print("=" * 50)
        
        success = run_all_tests()
        
        if success:
            print("\n✅ All tests passed! The system is working correctly.")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all required modules are available.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1) 