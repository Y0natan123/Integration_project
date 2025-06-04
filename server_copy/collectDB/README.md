# 🔬 Spectrophotometer Data Collection System

![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Architecture](https://img.shields.io/badge/architecture-clean-brightgreen.svg)

A modern, modular data collection system for spectrophotometer measurements with clean architecture and comprehensive testing.

## 🏗️ Architecture Overview

This system follows clean architecture principles with clear separation of concerns:

```
📦 collectDB/
├── 🔧 spectrophotometers/     # Hardware communication layer
│   ├── spectrophotometer_base.py      # Abstract interface
│   ├── real_spectrophotometer.py      # Real hardware implementation  
│   └── mock_spectrophotometer.py      # Mock for testing
├── 📊 providers/              # Data providers
│   ├── task_info_provider.py          # Task information
│   └── time_point_provider.py         # Time point management
├── 💾 database/               # Data persistence
│   └── absorbance_db.py               # Absorbance data operations
├── 🎯 collectors/             # Orchestration layer
│   └── data_collector.py              # Main collection logic
├── 🚀 scripts/                # Command-line interfaces
│   └── collect_data_refactored.py     # Main CLI script
├── 🧪 tests/                  # Test suite
│   └── test_refactored_collector.py   # Comprehensive tests
└── 📚 docs/                   # Documentation
    └── README_REFACTORED.md           # Detailed documentation
```

## ✨ Key Features

### 🔌 Hardware Abstraction
- **Abstract Base Class**: `SpectrophotometerBase` defines consistent interface
- **Real Implementation**: `RealSpectrophotometer` for actual hardware via serial
- **Mock Implementation**: `MockSpectrophotometer` for testing and development

### 📈 Data Management  
- **Task Provider**: Retrieves experiment configurations from database
- **Time Point Provider**: Manages temporal data organization
- **Database Layer**: Handles data storage with proper validation

### 🎛️ Flexible Configuration
- Support for both real and mock devices
- Configurable serial port settings
- Environment-specific database paths
- Comprehensive error handling

### 🧪 Testing & Quality
- Modular design enables comprehensive unit testing
- Mock implementations for hardware-independent testing  
- Extensive test coverage for all components
- Continuous integration ready

## 🚀 Quick Start

### Basic Usage

```bash
# Real spectrophotometer (default settings)
python scripts/collect_data_refactored.py 123

# Mock spectrophotometer for testing
python scripts/collect_data_refactored.py 123 --mock

# Custom configuration
python scripts/collect_data_refactored.py 123 --port COM12 --baud 9600 --verbose
```

### Programmatic Usage

```python
from collectDB import DataCollector

# Create mock collector for testing
collector = DataCollector.create_mock_collector()
success = collector.collect_data("123")

# Create real collector with custom settings
collector = DataCollector.create_real_collector(
    port="COM11", 
    baud=19200, 
    timeout=1.0
)
success = collector.collect_data("123")
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
python tests/test_refactored_collector.py
```

The test suite verifies:
- ✅ Individual component functionality
- ✅ Integration between components  
- ✅ Error handling scenarios
- ✅ Database operations
- ✅ Mock vs real device compatibility

## 📊 Database Structure

### Main Database (`spectrophotometer.db`)
- **Tasks Table**: Experiment definitions with wavelength ranges

### Data Databases (`task_<id>_<name>.db`)
- **Absorbance Table**: Time-series measurement data
- Each experiment gets isolated database file

## 🔧 Configuration

### Serial Port Settings
```python
# Default configuration
PORT = 'COM11'
BAUD_RATE = 19200
TIMEOUT = 1.0

# Custom configuration
collector = DataCollector.create_real_collector(
    port='COM12',
    baud=9600,
    timeout=2.0
)
```

### Database Paths
- Main DB: `../data/spectrophotometer.db`  
- Data DBs: `../data/task_<id>_<name>.db`

## 🛠️ Development

### Adding New Device Types

1. Inherit from `SpectrophotometerBase`
2. Implement required methods
3. Add factory method to `DataCollector`

```python
class NewSpectrophotometer(SpectrophotometerBase):
    def initialize(self) -> bool:
        # Your initialization logic
        pass
    
    def scan_wavelengths(self, start, end, step) -> List[Tuple[float, float]]:
        # Your scanning logic
        pass
```

### Extending Data Providers

```python
class CustomTaskProvider(TaskInfoProvider):
    def get_task_info(self, task_id: str) -> Dict:
        # Your custom logic
        pass
```

## 📈 Performance

- **Concurrent Safe**: Database operations use proper locking
- **Memory Efficient**: Streaming data processing for large scans
- **Fast Startup**: Lazy loading of components
- **Scalable**: Modular design supports horizontal scaling

## 🤝 Error Handling

The system gracefully handles:

- 🔌 **Hardware Issues**: Serial port unavailable, device not responding
- 💾 **Database Errors**: Connection failures, data integrity issues  
- ⚙️ **Configuration Problems**: Invalid task IDs, missing files
- 🔐 **Permission Issues**: Port access denied, file system permissions

## 📋 Requirements

```
Python >= 3.8
pyserial >= 3.5
sqlite3 (built-in)
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙋‍♂️ Support

- 📖 **Documentation**: See `docs/README_REFACTORED.md` for detailed docs
- 🐛 **Issues**: Report bugs via issue tracker
- 💡 **Features**: Submit feature requests
- 🤝 **Contributing**: Follow contribution guidelines

---

**Built with ❤️ for reliable scientific data collection** 