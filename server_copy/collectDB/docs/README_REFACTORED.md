# Refactored Data Collection System

This directory contains a refactored data collection system that follows proper object-oriented design principles and the class diagram specification.

## Architecture Overview

The system follows a modular design with clear separation of concerns:

```
classDiagram
    SpectrophotometerBase <|-- RealSpectrophotometer
    SpectrophotometerBase <|-- MockSpectrophotometer
    DataCollector --> SpectrophotometerBase : uses
    DataCollector --> TaskInfoProvider : uses
    DataCollector --> TimePointProvider : uses
    DataCollector --> AbsorbanceDB : uses
```

## Components

### 1. Spectrophotometer Layer
- **`spectrophotometer_base.py`** - Abstract base class defining the interface for all spectrophotometers
- **`real_spectrophotometer.py`** - Implementation for real hardware communication via serial port
- **`mock_spectrophotometer.py`** - Mock implementation for testing and development

### 2. Data Management Layer
- **`task_info_provider.py`** - Handles task information retrieval from the main database
- **`time_point_provider.py`** - Manages time point tracking for experiments
- **`absorbance_db.py`** - Database operations for storing and retrieving absorbance data

### 3. Orchestration Layer
- **`data_collector.py`** - Main orchestrator that coordinates all components for data collection

### 4. Entry Points
- **`collect_data_refactored.py`** - New main script with improved CLI interface
- **`test_refactored_collector.py`** - Comprehensive test suite for all components

## Key Features

### Improved Error Handling
- Comprehensive error checking at each layer
- Graceful failure handling with proper cleanup
- Detailed logging for debugging

### Flexible Configuration
- Support for both real and mock spectrophotometers
- Configurable serial port settings
- Environment-specific database paths

### Better Testing
- Modular design enables unit testing of individual components
- Mock implementations for hardware-independent testing
- Comprehensive test suite covering all scenarios

### Enhanced CLI
- Argument parsing with proper help documentation
- Verbose logging options
- Support for different operation modes

## Usage

### Basic Usage
```bash
# Real spectrophotometer (default settings)
python collect_data_refactored.py 123

# Mock spectrophotometer for testing
python collect_data_refactored.py 123 --mock

# Custom serial port settings
python collect_data_refactored.py 123 --port COM12 --baud 9600

# Verbose logging
python collect_data_refactored.py 123 --verbose
```

### Testing
```bash
# Run all tests
python test_refactored_collector.py

# The test suite will verify:
# - Individual component functionality
# - Integration between components
# - Error handling scenarios
# - Database operations
```

## Database Structure

The system maintains the same database structure as the original:

### Task Database (`absorbanceDB.db`)
- **Tasks table**: Stores task definitions with wavelength ranges

### Data Databases (`task_<id>_<name>.db` in `../data/`)
- **Absorbance table**: Stores collected measurement data
- Each task gets its own database file for isolation

## Migration from Original System

The refactored system is designed to be a drop-in replacement:

1. **Same data format**: Uses identical database schemas
2. **Same file locations**: Stores data in the same `../data/` directory
3. **Compatible CLI**: Basic usage (`script.py <task_id>`) remains the same
4. **Enhanced features**: Additional options for testing and debugging

### Backward Compatibility
- Existing database files are fully compatible
- Original `collect_data.py` can still be used if needed
- Data directory structure is preserved

## Error Scenarios Handled

1. **Hardware Communication**
   - Serial port not available
   - Device not responding
   - Communication timeouts

2. **Database Operations**
   - Missing task information
   - Database connection failures
   - Data integrity issues

3. **Configuration Issues**
   - Invalid task IDs
   - Missing database files
   - Permission problems

## Logging

The system provides comprehensive logging:

- **Console output**: Real-time progress information
- **Log files**: Detailed logs saved to `collect_data_refactored.log`
- **Configurable levels**: INFO (default) or DEBUG with `--verbose`

## Development and Extension

The modular design makes it easy to:

1. **Add new spectrophotometer types**: Inherit from `SpectrophotometerBase`
2. **Modify data storage**: Replace or extend `AbsorbanceDB`
3. **Change task sources**: Implement new `TaskInfoProvider` variants
4. **Add new features**: Extend `DataCollector` with additional functionality

## Files Overview

| File | Purpose | Dependencies |
|------|---------|--------------|
| `spectrophotometer_base.py` | Abstract interface | None |
| `real_spectrophotometer.py` | Hardware implementation | pyserial |
| `mock_spectrophotometer.py` | Testing implementation | None |
| `task_info_provider.py` | Task data retrieval | sqlite3 |
| `time_point_provider.py` | Time point management | sqlite3 |
| `absorbance_db.py` | Data storage | sqlite3 |
| `data_collector.py` | Main orchestrator | All above |
| `collect_data_refactored.py` | CLI entry point | argparse, logging |
| `test_refactored_collector.py` | Test suite | tempfile |

This refactored system provides a solid foundation for reliable, maintainable, and extensible data collection operations. 