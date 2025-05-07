import sqlite3
import random
import os
import math
import csv
import pathlib
import argparse
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union, Any
# if you gona take this project please edite those tests ^_^
# Configure command line arguments
parser = argparse.ArgumentParser(
    description="Create sample spectrophotometer databases with realistic patterns",
    formatter_class=argparse.ArgumentDefaultsHelpFormatter
)
parser.add_argument("--tasks", type=int, default=3, help="Number of sample tasks to create")
parser.add_argument("--clear", action="store_true", help="Clear existing database files first")
parser.add_argument("--seed", type=int, help="Random seed for reproducible data generation")
parser.add_argument("--visualize", action="store_true", help="Print ASCII visualization of generated data")
parser.add_argument("--export-csv", action="store_true", help="Export data as CSV files alongside databases")
parser.add_argument("--output-dir", type=str, default="data", help="Directory to store generated databases")
parser.add_argument("--pattern", type=str, choices=[
    "all", "growth_curve", "protein_peak", "gradual_decline", 
    "multi_peak", "oscillating", "random"
], default="all", help="Specific data pattern to generate")
parser.add_argument("--batch-prefix", type=str, help="Create a batch of related tasks with this prefix")
parser.add_argument("--time-points", type=int, default=10, help="Number of time points to generate")
args = parser.parse_args()

# Set random seed if specified
if args.seed is not None:
    random.seed(args.seed)
    np.random.seed(args.seed)
    print(f"Using random seed: {args.seed}")

# Paths
DATA_DIR = pathlib.Path(__file__).parent / args.output_dir
DATA_DIR.mkdir(exist_ok=True, parents=True)

# Clear existing databases if requested
if args.clear:
    count = 0
    for f in DATA_DIR.glob("task_*.db"):
        print(f"Removing {f}")
        os.remove(f)
        count += 1
    
    if count > 0:
        print(f"Cleared {count} existing databases")
    else:
        print("No existing databases to clear")

# Helper to sanitize filenames
def sanitize(name: str) -> str:
    """Convert a name to a safe filename component."""
    s = name.strip().lower()
    s = ''.join(c if c.isalnum() else '_' for c in s)
    return s.strip('_')

# Generate filename with encoded metadata
def generate_filename(task_name: str, wavelength_start: int, wavelength_end: int, 
                     wavelength_step: int, batch_id: Optional[str] = None) -> str:
    """Generate a standardized filename encoding the task metadata."""
    timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
    sanitized = sanitize(task_name)
    
    if batch_id:
        return f"task_{sanitized}_{batch_id}_{timestamp}_w{wavelength_start}-{wavelength_end}-{wavelength_step}.db"
    else:
        return f"task_{sanitized}_{timestamp}_w{wavelength_start}-{wavelength_end}-{wavelength_step}.db"

# Sample task templates with different characteristics
STANDARD_PATTERNS = {
    "growth_curve": {
        'task_name': 'Bacterial Growth', 
        'description': 'Optical density increases over time following growth curve',
        'measurement_interval': 15, 
        'wavelength_start': 300, 
        'wavelength_end': 380, 
        'wavelength_step': 5,
    },
    "protein_peak": {
        'task_name': 'Protein Analysis', 
        'description': 'Protein absorbance with strong peak at 280nm',
        'measurement_interval': 10, 
        'wavelength_start': 250, 
        'wavelength_end': 310, 
        'wavelength_step': 3,
    },
    "gradual_decline": {
        'task_name': 'Degradation Study', 
        'description': 'Slow degradation over time with decreasing absorbance',
        'measurement_interval': 60, 
        'wavelength_start': 340, 
        'wavelength_end': 420, 
        'wavelength_step': 10,
    },
    "multi_peak": {
        'task_name': 'Complex Mix', 
        'description': 'Multiple compounds with peaks at different wavelengths',
        'measurement_interval': 30, 
        'wavelength_start': 200, 
        'wavelength_end': 500, 
        'wavelength_step': 15,
    },
    "oscillating": {
        'task_name': 'Reaction Kinetics', 
        'description': 'Oscillating reaction with periodic changes in absorbance',
        'measurement_interval': 5, 
        'wavelength_start': 280, 
        'wavelength_end': 330, 
        'wavelength_step': 2,
    },
    "random": {
        'task_name': 'Random Test', 
        'description': 'Random absorbance values for testing',
        'measurement_interval': 20, 
        'wavelength_start': 300, 
        'wavelength_end': 375, 
        'wavelength_step': 5,
    }
}

# Generate the tasks to create based on user args
def generate_task_list() -> List[Dict[str, Any]]:
    """Generate the list of tasks to create based on command line arguments."""
    task_list = []
    
    # Filter patterns based on user choice
    patterns = list(STANDARD_PATTERNS.keys()) if args.pattern == "all" else [args.pattern]
    
    # Create task configs
    for i in range(args.tasks):
        # Cycle through patterns based on index
        pattern_key = patterns[i % len(patterns)]
        task_template = STANDARD_PATTERNS[pattern_key].copy()
        
        # Add batch prefix if specified
        if args.batch_prefix:
            task_template['task_name'] = f"{args.batch_prefix} - {task_template['task_name']}"
        
        # Add task-specific info
        task_template['pattern'] = pattern_key
        task_template['active'] = (i % 2 == 0)  # Alternate active status
        
        # Add randomness to some parameters if not the first item of a pattern
        if i >= len(patterns):
            # Add small variations to wavelength params for more variety
            task_template['wavelength_start'] += random.randint(-10, 10)
            task_template['wavelength_end'] += random.randint(-15, 15)
            # Ensure end is always greater than start
            if task_template['wavelength_end'] <= task_template['wavelength_start'] + 10:
                task_template['wavelength_end'] = task_template['wavelength_start'] + 20
            # Vary the measurement interval
            task_template['measurement_interval'] = max(5, task_template['measurement_interval'] + 
                                                      random.randint(-5, 5))
        
        task_list.append(task_template)
    
    return task_list[:args.tasks]  # Ensure we only return the requested number

# Generate data with different scientific patterns
def generate_absorbance(wavelength: int, time_point: int, pattern: str, seed: Optional[int] = None) -> float:
    """Generate realistic absorbance values with various scientific patterns."""
    if seed is not None:
        random.seed(seed + wavelength + time_point)
    
    # Base random noise (lowered for more realistic values)
    noise = random.uniform(-0.02, 0.02)
    
    if pattern == 'growth_curve':
        # Modified logistic growth curve (more accurate for bacterial growth)
        # OD600 is typical for bacterial growth monitoring
        lag_phase = 30  # minutes
        log_phase_rate = 0.015
        max_absorbance = 0.8 + (wavelength % 10) * 0.02  # Some wavelength dependency
        
        # No growth during lag phase
        if time_point < lag_phase:
            base = 0.1 + (time_point / lag_phase) * 0.05
        else:
            # Logistic growth after lag phase
            adjusted_time = time_point - lag_phase
            base = max_absorbance / (1 + math.exp(-log_phase_rate * adjusted_time + 2))
        
        # Higher absorbance at lower wavelengths for cells
        wavelength_factor = 1.0 + max(0, (420 - wavelength) / 200)
        return round(base * wavelength_factor + noise, 3)
    
    elif pattern == 'protein_peak':
        # More accurate model of protein absorbance spectra
        # Proteins have peak at 280nm due to aromatic amino acids
        aromatic_peak = 280
        peptide_bond_peak = 205
        
        # 280nm peak (tyrosine, tryptophan)
        aromatic_width = 12
        aromatic_intensity = 1.2 * (1 + time_point / 400)  # Slight increase over time
        aromatic_factor = math.exp(-((wavelength - aromatic_peak) ** 2) / (2 * aromatic_width ** 2))
        
        # 205nm peak (peptide bonds)
        peptide_width = 10
        peptide_intensity = 1.5 * (1 - 0.1 * math.sin(time_point / 100))  # Slight oscillation
        peptide_factor = math.exp(-((wavelength - peptide_bond_peak) ** 2) / (2 * peptide_width ** 2))
        
        value = 0.1 + aromatic_intensity * aromatic_factor + peptide_intensity * peptide_factor
        # For wavelengths we typically can't see in this range, reduce the value
        if wavelength < 220:
            value *= (wavelength / 220) ** 2
            
        return round(min(2.0, value + noise), 3)  # Cap at reasonable max
    
    elif pattern == 'gradual_decline':
        # Exponential decay with wavelength dependency (like a degrading compound)
        start_value = 1.5
        decay_rate = 0.003  # Slower decay
        
        # Calculate wavelength dependency - peak centered on 380nm
        wavelength_factor = math.exp(-((wavelength - 380) ** 2) / (2 * 50 ** 2))
        # Add a secondary peak at 280nm
        secondary_factor = 0.3 * math.exp(-((wavelength - 280) ** 2) / (2 * 20 ** 2))
        
        # Decay function
        time_decay = math.exp(-decay_rate * time_point)
        
        # As main peak decays, secondary byproduct increases slightly then decays
        secondary_growth = 0.2 * (1 - math.exp(-0.01 * time_point)) * math.exp(-0.001 * time_point)
        
        return round(start_value * time_decay * wavelength_factor + 
                    secondary_growth * secondary_factor + 0.1 + noise, 3)
    
    elif pattern == 'multi_peak':
        # Realistic multiple compound mixture spectra
        # Define peaks for different compounds with realistic wavelengths
        compounds = [
            {"peak": 250, "height": 0.8, "width": 20},  # DNA/RNA
            {"peak": 280, "height": 0.6, "width": 15},  # Protein
            {"peak": 410, "height": 1.1, "width": 25},  # Heme/chlorophyll
            {"peak": 340, "height": 0.5, "width": 30}   # NADH/NADPH
        ]
        
        value = 0.1  # baseline
        for compound in compounds:
            # Calculate peak based on gaussian distribution
            peak_contribution = compound["height"] * math.exp(
                -((wavelength - compound["peak"]) ** 2) / (2 * compound["width"] ** 2)
            )
            
            # Add time-dependent behavior for each compound
            if compound["peak"] == 250:  # DNA/RNA degrading
                peak_contribution *= math.exp(-0.002 * time_point)
            elif compound["peak"] == 280:  # Protein stable
                peak_contribution *= 1.0
            elif compound["peak"] == 410:  # Heme/chlorophyll slowly increasing
                peak_contribution *= (1 + 0.3 * (1 - math.exp(-0.005 * time_point)))
            elif compound["peak"] == 340:  # NADH oscillating
                peak_contribution *= (1 + 0.2 * math.sin(time_point / 60))
                
            value += peak_contribution
            
        return round(value + noise, 3)
    
    elif pattern == 'oscillating':
        # Chemical oscillating reaction (like Belousov–Zhabotinsky)
        # Multiple frequency components with wavelength-dependent phase
        phase1 = wavelength / 40
        phase2 = wavelength / 20
        
        # Primary oscillation - longer period
        primary_period = 80  # minutes
        primary_amp = 0.4
        
        # Secondary oscillation - shorter period
        secondary_period = 25  # minutes
        secondary_amp = 0.2
        
        # Wavelength-dependent amplitude
        amplitude_factor = math.exp(-((wavelength - 300) ** 2) / (2 * 40 ** 2))
        
        # Damping over time - oscillations gradually decrease
        damping = math.exp(-0.0005 * time_point)
        
        oscillation = (
            primary_amp * math.sin(2 * math.pi * time_point / primary_period + phase1) +
            secondary_amp * math.sin(2 * math.pi * time_point / secondary_period + phase2)
        )
        
        return round(0.7 + damping * amplitude_factor * oscillation + noise, 3)
    
    else:  # Default random with more realistic bounds
        # Random data but with wavelength-dependent baseline
        baseline = 0.3 + 0.4 * math.exp(-((wavelength - 320) ** 2) / (2 * 80 ** 2))
        random_factor = random.uniform(0.2, 0.8)
        
        return round(baseline + random_factor + noise, 3)

# Create a single task database
def create_task_database(task_config: Dict[str, Any], batch_id: Optional[str] = None) -> Dict[str, Any]:
    """Create a single task database with the given configuration."""
    # Generate database filename with encoded metadata
    filename = generate_filename(
        task_config['task_name'], 
        task_config['wavelength_start'], 
        task_config['wavelength_end'], 
        task_config['wavelength_step'],
        batch_id
    )
    
    db_path = DATA_DIR / filename
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create a simple Absorbance table with (wavelength, time_point) as primary key
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Absorbance (
        wavelength INTEGER NOT NULL,
        time_point INTEGER NOT NULL,
        absorbance REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (wavelength, time_point)
    )
    """)
    
    # Create a metadata table to store task info
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    # Store key metadata
    metadata = {
        "measurement_interval": str(task_config['measurement_interval']),
        "description": task_config.get('description', ""),
        "pattern": task_config['pattern']
    }
    for key, value in metadata.items():
        cursor.execute("INSERT INTO Metadata (key, value) VALUES (?, ?)", (key, value))
    
    # Process data for insertion
    wavelengths = list(range(
        task_config['wavelength_start'], 
        task_config['wavelength_end'] + 1, 
        task_config['wavelength_step']
    ))
    
    # Time points based on measurement interval
    time_points = [i * task_config['measurement_interval'] for i in range(args.time_points)]
    
    # Seed for reproducible randomness per task
    pattern_seed = args.seed if args.seed is not None else hash(task_config['task_name']) % 10000
    
    # For CSV export
    csv_data = []
    if args.export_csv:
        # Add header row with time points
        header = ["Wavelength"] + [f"{t}" for t in time_points]
        csv_data.append(header)
    
    # Generate timestamps for each time point
    timestamps = []
    now = datetime.now()
    
    absorbance_data = []  # For visualization
    
    # Generate data in the Excel-like format
    for i, time_pt in enumerate(time_points):
        # Create timestamp for this measurement (going backwards from now)
        measurement_time = now - timedelta(minutes=(len(time_points) - i) * task_config['measurement_interval'])
        timestamp_str = measurement_time.strftime('%Y-%m-%d %H:%M:%S')
        timestamps.append(timestamp_str)
        
        # Create a row of absorbance values for visualization
        row_data = []
        
        # For each wavelength at this time point
        for w in wavelengths:
            # Generate absorbance based on the pattern
            ab = generate_absorbance(w, time_pt, task_config['pattern'], pattern_seed)
            row_data.append(ab)
            
            # Insert into database
            cursor.execute(
                "INSERT INTO Absorbance (wavelength, time_point, absorbance, timestamp) VALUES (?, ?, ?, ?)",
                (w, time_pt, ab, timestamp_str)
            )
        
        absorbance_data.append(row_data)
    
    # Prepare CSV data by wavelength (transpose from time-based to wavelength-based)
    if args.export_csv:
        for i, wavelength in enumerate(wavelengths):
            row = [wavelength]
            for time_idx in range(len(time_points)):
                row.append(absorbance_data[time_idx][i])
            csv_data.append(row)
    
    conn.commit()
    conn.close()

    # Write CSV file if requested
    if args.export_csv:
        csv_path = db_path.with_suffix('.csv')
        with open(csv_path, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(csv_data)
    
    # Store task info for reporting
    task_info = {
        'filename': filename,
        'name': task_config['task_name'],
        'measurements': len(time_points),
        'wavelengths': len(wavelengths),
        'datapoints': len(time_points) * len(wavelengths),
        'pattern': task_config['pattern'],
        'active': task_config.get('active', False),
        'data': absorbance_data if args.visualize else None,
        'wavelength_values': wavelengths,
        'time_points': time_points,
        'csv_path': str(csv_path) if args.export_csv else None
    }
    
    return task_info

# Main function to create all tasks
def main():
    """Main function to create all requested task databases."""
    # Generate task list
    task_list = generate_task_list()
    created_tasks = []
    
    # Create batch ID if specified
    batch_id = None
    if args.batch_prefix:
        timestamp = datetime.now().strftime('%m%d%H%M')
        batch_id = f"batch_{sanitize(args.batch_prefix)}_{timestamp}"
    
    # Create each task database
    for i, task_config in enumerate(task_list):
        print(f"Creating task {i+1}/{len(task_list)}: {task_config['task_name']} ({task_config['pattern']})")
        task_info = create_task_database(task_config, batch_id)
        created_tasks.append(task_info)
        
        output = f"✓ Created {task_info['filename']} with {task_info['datapoints']} datapoints"
        if args.export_csv and task_info['csv_path']:
            output += f" (CSV: {os.path.basename(task_info['csv_path'])})"
        print(output)
    
    # Display a tabular visualization if requested
    if args.visualize and created_tasks:
        for task in created_tasks:
            print(f"\n\nVisualization for {task['name']} ({task['pattern']})")
            print("=" * 80)
            
            # Print the table header with time points
            header = "Wavelength | " + " | ".join(f"{t:>6}m" for t in task['time_points'])
            print(header)
            print("-" * len(header))
            
            # Print each wavelength row with its absorbance values
            for i, wavelength in enumerate(task['wavelength_values']):
                row_values = []
                for j in range(len(task['time_points'])):
                    value = task['data'][j][i]  # Time point j, wavelength i
                    row_values.append(f"{value:>6.3f}")
                
                print(f"{wavelength:>9} | " + " | ".join(row_values))
    
    # Summary
    print(f"\nCreated {len(created_tasks)} sample task databases in {DATA_DIR}")
    if args.batch_prefix and batch_id:
        print(f"Batch ID: {batch_id}")
    
    if args.export_csv:
        print(f"CSV exports created alongside each database file")
    
    if len(created_tasks) <= 6:  # Only show details for a reasonable number of tasks
        for task in created_tasks:
            status = "ACTIVE" if task['active'] else "inactive"
            print(f"- {task['filename']} - {task['datapoints']} points - {task['pattern']} - {status}")

if __name__ == '__main__':
    main()
