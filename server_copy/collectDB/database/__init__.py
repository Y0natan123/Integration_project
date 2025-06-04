"""
Database Operations Package

This package contains classes for database operations:
- AbsorbanceDB: Handles storage and retrieval of absorbance measurement data

The database layer provides a clean abstraction for data persistence,
ensuring proper table creation, data validation, and transaction management.
"""

from .absorbance_db import AbsorbanceDB

__all__ = [
    'AbsorbanceDB'
] 