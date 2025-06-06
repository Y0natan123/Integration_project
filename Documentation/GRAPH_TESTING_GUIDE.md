# 📈 Spectrophotometer Graph Testing Guide

## 🔧 What Was Fixed

### ❌ Original Problems
1. **Missing Server**: The frontend was trying to connect to `http://localhost:8000` but no server was running
2. **No Database Tasks**: The main database had no tasks for the API to serve
3. **Missing Data Files**: The server couldn't find data files for the tasks
4. **JavaScript Errors**: The frontend had several DOM element reference errors
5. **Missing Task ID**: The graph page needs a `taskId` parameter in the URL

### ✅ Solutions Implemented
1. **✅ Server Setup**: Set up Node.js server with proper API endpoints
2. **✅ Database Integration**: Created mock tasks in the main database
3. **✅ Data Linking**: Copied mock spectrophotometer data to the server's data directory
4. **✅ Frontend Fixes**: Fixed JavaScript errors and DOM element references
5. **✅ Test Interface**: Created test page with proper URLs

## 🚀 How to Test the Graphs

### Step 1: Start the Server
```bash
cd server_copy
npm start
```
You should see the server starting on port 8000.

### Step 2: Open the Test Page
Open `test_graph.html` in your browser. This page will:
- Check if the server is running
- Show available mock tasks
- Provide direct links to test each graph

### Step 3: Test the Graphs
Click on any of the test links:
- **Task 1**: Most comprehensive data (93 points across 3 time points)
- **Task 2**: Basic data (31 points, 1 time point)  
- **Task 3**: Basic data (31 points, 1 time point)

### Step 4: Verify Graph Display
Each graph page should show:
1. **Chart View**: Line chart showing absorbance over time for different wavelengths
2. **Spectrum View**: Spectrum chart showing absorbance vs wavelength
3. **Raw Data Table**: Tabular view of all measurements
4. **Download Excel**: Export functionality

## 📊 Available Mock Data

### Task 1 - Most Complete Dataset
- **93 total data points**
- **3 time points** (0, 1, 2)
- **31 wavelengths** (400-700nm in 10nm steps)
- **Realistic absorption peaks** around 420nm and 670nm

### Tasks 2 & 3 - Basic Datasets
- **31 data points each**
- **1 time point each**
- **Same wavelength range** (400-700nm)

## 🛠️ Technical Details

### API Endpoints Working
- `GET /api/tasks` - Returns list of all tasks
- `GET /api/tasks/{id}/status` - Returns task information
- `GET /api/tasks/{id}/data` - Returns spectrophotometer data

### Data Format
```json
[
  {
    "wavelength": 400,
    "time_point": 0,
    "absorbance": 0.4998
  },
  {
    "wavelength": 410,
    "time_point": 0,
    "absorbance": 0.7210
  }
]
```

### Database Structure
- **Main DB**: `server_copy/absorbanceDB.db` contains task definitions
- **Data DBs**: `server_copy/collectDB/data/task_X_mock_task_X.db` contain measurements

## 🔍 Troubleshooting

### If Server Won't Start
1. Make sure you're in the `server_copy` directory
2. Run `npm install` if dependencies are missing
3. Check if port 8000 is available

### If Graphs Don't Load
1. Open browser developer tools (F12)
2. Check the Console tab for JavaScript errors
3. Check the Network tab for failed API requests
4. Verify the URL includes `?taskId=1` parameter

### If No Data Shows
1. Check server console for database errors
2. Verify data files exist in `server_copy/collectDB/data/`
3. Test API endpoints directly: `http://localhost:8000/api/tasks/1/data`

## 🎯 Expected Results

### Working Chart View
- Line chart with multiple colored lines (one per wavelength)
- X-axis: Time (minutes)
- Y-axis: Absorbance (0-2 range)
- Legend popup with wavelength controls
- Realistic absorption peaks around 420nm and 670nm

### Working Spectrum View  
- Line chart showing absorption spectrum
- X-axis: Wavelength (nm)
- Y-axis: Absorbance
- Different lines for different time points or days

### Working Data Table
- Sortable table with columns: Time, Wavelength, Absorbance
- All measurement data visible
- Scroll functionality for large datasets

## 🎉 Success Indicators

✅ **Server running** on http://localhost:8000  
✅ **API returning data** (test with test_graph.html)  
✅ **Graphs displaying** with realistic spectroscopic data  
✅ **Interactive features** working (view switching, legend, export)  
✅ **Multiple datasets** available for testing  

## 📝 Next Steps

Once the graphs are working:
1. **Integrate with main website**: Add proper navigation from the main site
2. **Real-time updates**: Connect to live data collection
3. **Advanced features**: Add peak detection, analysis tools
4. **Styling improvements**: Match the site's design theme

The mock spectrophotometer data provides realistic absorption curves with peaks characteristic of biological compounds like chlorophyll, making it perfect for testing and demonstration purposes! 