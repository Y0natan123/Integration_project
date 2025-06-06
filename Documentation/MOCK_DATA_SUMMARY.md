# 🧪 Mock Spectrophotometer Data Collection System

## Overview
This system uses the `MockSpectrophotometer` class from `server_copy/collectDB/spectrophotometers/mock_spectrophotometer.py` to generate realistic spectroscopic data for testing and development purposes.

## ✅ What Has Been Implemented

### 1. Mock Spectrophotometer Class
- **Location**: `server_copy/collectDB/spectrophotometers/mock_spectrophotometer.py`
- **Features**:
  - Realistic absorbance curve generation with peaks around 425nm and 675nm
  - Random noise simulation for realistic data
  - Command interface compatible with real spectrophotometer
  - Wavelength scanning capabilities
  - Time delays to simulate real measurement speeds

### 2. Updated Data Collection Script
- **File**: `mock_collect_data.py`
- **Improvements**:
  - Now uses the proper `MockSpectrophotometer` class
  - Better error handling for missing databases
  - Automatic mock task generation when no database exists
  - Time-series data collection support

### 3. Demonstration Scripts

#### `demo_mock_data_collection.py`
Shows various ways to use the MockSpectrophotometer:
- Single wavelength readings
- Range scanning
- Vitamin C analysis simulation
- Chlorophyll analysis simulation
- Data export to JSON

#### `simple_data_analysis.py`
Analyzes collected data using only built-in Python libraries:
- Statistical analysis of collected data
- Time-series comparison
- Peak absorption analysis
- Data export to JSON format

## 📊 Generated Data Characteristics

### Realistic Spectroscopic Features
The MockSpectrophotometer generates data with:
- **Blue region peak (400-450nm)**: Simulates chlorophyll absorption
- **Red region peak (650-700nm)**: Simulates chlorophyll absorption
- **Random noise**: ±0.1 absorbance units for realism
- **Absorbance range**: 0.0 to 2.0 (typical for spectrophotometry)

### Sample Data Points
From the collected data analysis:
```
Time point 0: Peak absorbance 1.2016 at 420nm
Time point 1: Peak absorbance 1.2333 at 430nm
Time point 2: Peak absorbance 1.2144 at 420nm

Wavelength coverage: 400-700nm (31 data points)
Total measurements: 93 data points across 3 time points
```

## 🚀 How to Use the System

### Basic Data Collection
```bash
# Collect data for task 1
python mock_collect_data.py 1

# Collect data for task 2
python mock_collect_data.py 2

# Run multiple times to simulate time-series data
python mock_collect_data.py 1
python mock_collect_data.py 1
python mock_collect_data.py 1
```

### Run Demonstrations
```bash
# See all demonstration examples
python demo_mock_data_collection.py

# Analyze collected data
python simple_data_analysis.py
```

### Direct Python Usage
```python
from mock_spectrophotometer import MockSpectrophotometer

# Initialize
spectro = MockSpectrophotometer()
spectro.initialize()

# Single reading
absorbance = spectro.read_absorbance(450)  # Read at 450nm

# Scan range
results = spectro.scan_wavelengths(400, 700, 10)  # 400-700nm, 10nm steps

spectro.close()
```

## 📁 Generated Files and Structure

### Database Files
- **Location**: `collectDB/data/`
- **Format**: `task_{id}_mock_task_{id}.db`
- **Schema**: 
  ```sql
  CREATE TABLE Absorbance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wavelength INTEGER NOT NULL,
      time_point INTEGER NOT NULL,
      absorbance REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(wavelength, time_point)
  );
  ```

### Export Files
- **JSON Format**: `task_{id}_mock_data.json`
- **Structure**:
  ```json
  {
    "task_info": {
      "task_id": 1,
      "export_timestamp": "2025-06-06T07:36:08.672174",
      "total_measurements": 93
    },
    "measurements": [
      {
        "wavelength_nm": 400,
        "time_point": 0,
        "absorbance": 0.499825,
        "timestamp": "2025-06-06 04:33:53"
      }
    ]
  }
  ```

## 📈 Data Analysis Results

### Task 1 Analysis
- **Total data points**: 93
- **Time points**: 3
- **Wavelength range**: 400-700nm
- **Absorbance range**: 0.4015 - 1.2333
- **Average absorbance**: 0.6102

### Regional Analysis
- **UV region (280-400nm)**: Average 0.50, Peak 0.50 at 400nm
- **Blue region (400-500nm)**: Average 0.64, Peak 1.20 at 420nm
- **Green region (500-600nm)**: Average 0.48, Peak 0.59 at 560nm
- **Red region (600-700nm)**: Average 0.63, Peak 1.04 at 670nm

## 🎯 Use Cases

### 1. Website Demo Data
Perfect for populating the website with realistic spectroscopic data that matches the patterns described in `Website_Demo_Data.md`.

### 2. Development Testing
- Test data collection workflows
- Validate database schemas
- Test data visualization components
- Simulate long-running experiments

### 3. Algorithm Development
- Develop peak detection algorithms
- Test data processing pipelines
- Validate spectral analysis methods

### 4. User Training
- Demonstrate system capabilities
- Train users on data interpretation
- Show typical spectroscopic patterns

## 🔧 Configuration Options

### MockSpectrophotometer Parameters
- **scan_wavelengths(start, end, step, speed, output)**
  - `speed`: 'FAST' (0.2s delay) or 'SLOW' (0.5s delay)
  - `output`: 'TEXT' format
  - Returns: List of (wavelength, absorbance) tuples

### Data Collection Settings
- **Default wavelength range**: 400-700nm
- **Default step size**: 10nm
- **Machine step size**: 2nm (for realistic device simulation)
- **Time point increment**: Automatic

## 📝 Notes

1. **Realistic Data**: The mock data includes characteristic absorption peaks similar to chlorophyll and other biological compounds.

2. **Time Series**: Running the collection script multiple times automatically creates time-series data with incrementing time points.

3. **Error Handling**: The system gracefully handles missing databases by creating mock task configurations.

4. **Export Formats**: Data can be exported to JSON for easy integration with web applications or further analysis.

5. **Compatibility**: The MockSpectrophotometer follows the same interface as the real spectrophotometer for easy switching between mock and real data collection.

## 🎉 Success!

The MockSpectrophotometer system is now fully operational and generating realistic spectroscopic data that can be used for:
- Website demonstrations
- Development testing
- Algorithm validation
- User training
- System integration testing

The generated data shows proper spectroscopic characteristics with realistic absorption peaks and noise patterns, making it suitable for comprehensive testing of the entire spectrophotometry system. 