"""
Data Collection Orchestration Package

This package contains the main orchestration logic for data collection:
- DataCollector: Main class that coordinates all components to perform data collection

The DataCollector acts as the central coordinator, bringing together spectrophotometers,
data providers, and database operations to perform complete data collection workflows.
"""

from .data_collector import DataCollector

__all__ = [
    'DataCollector'
] 