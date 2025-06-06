#!/usr/bin/env python3
"""
Debug script for final issues: notes not showing and measurement data problems.
"""

import sqlite3
import os

def debug_notes_issue():
    print("🔍 DEBUGGING NOTES ISSUE")
    print("=" * 50)
    
    conn = sqlite3.connect('absorbanceDB.db')
    cursor = conn.cursor()
    
    # Check all notes
    cursor.execute("SELECT id, task_id, run_id, content FROM Notes")
    notes = cursor.fetchall()
    
    print(f"\n📝 Found {len(notes)} notes in database:")
    for note in notes:
        run_id_display = note[2] if note[2] is not None else "NULL"
        content_preview = note[3][:30] + "..." if len(note[3]) > 30 else note[3]
        print(f"  Note {note[0]}: task_id={note[1]}, run_id={run_id_display}, content='{content_preview}'")
    
    # Check specific query for task 5, run 0
    print(f"\n🔍 Testing query for task_id=5, run_id=0:")
    cursor.execute("SELECT id, content FROM Notes WHERE task_id = ? AND run_id = ?", [5, 0])
    task5_notes = cursor.fetchall()
    print(f"  Found {len(task5_notes)} notes for task 5, run 0")
    
    # Check if there are any notes with run_id = 0
    cursor.execute("SELECT COUNT(*) FROM Notes WHERE run_id = 0")
    run0_count = cursor.fetchone()[0]
    print(f"\n📊 Notes with run_id=0: {run0_count}")
    
    # Check if there are any notes with run_id IS NULL
    cursor.execute("SELECT COUNT(*) FROM Notes WHERE run_id IS NULL")
    null_count = cursor.fetchone()[0]
    print(f"📊 Notes with run_id=NULL: {null_count}")
    
    conn.close()

def debug_measurement_data_issue():
    print("\n\n🔍 DEBUGGING MEASUREMENT DATA ISSUE")
    print("=" * 50)
    
    # Check collectDB files
    collectdb_path = 'collectDB/data'
    if not os.path.exists(collectdb_path):
        print("❌ collectDB/data directory not found")
        return
    
    files = [f for f in os.listdir(collectdb_path) if f.endswith('.db')]
    print(f"\n📁 Found {len(files)} collectDB files:")
    
    for file in files:
        print(f"\n📊 Checking {file}:")
        try:
            conn = sqlite3.connect(os.path.join(collectdb_path, file))
            cursor = conn.cursor()
            
            # Get all runs (time_points)
            cursor.execute('SELECT DISTINCT time_point FROM Absorbance ORDER BY time_point')
            runs = [row[0] for row in cursor.fetchall()]
            print(f"  Available runs: {runs}")
            
            # Check if run 1 exists
            if 1 in runs:
                cursor.execute('SELECT COUNT(*) FROM Absorbance WHERE time_point = 1')
                count = cursor.fetchone()[0]
                print(f"  ✅ Run 1 has {count} measurements")
            else:
                print(f"  ❌ Run 1 NOT FOUND (available: {runs})")
                # Check what the highest run is
                if runs:
                    max_run = max(runs)
                    cursor.execute('SELECT COUNT(*) FROM Absorbance WHERE time_point = ?', [max_run])
                    count = cursor.fetchone()[0]
                    print(f"  ℹ️  Highest run {max_run} has {count} measurements")
            
            conn.close()
            
        except Exception as e:
            print(f"  ❌ Error reading {file}: {e}")

def fix_notes_run_ids():
    print("\n\n🔧 FIXING NOTES RUN_ID ISSUES")
    print("=" * 50)
    
    conn = sqlite3.connect('absorbanceDB.db')
    cursor = conn.cursor()
    
    # Update NULL run_ids to 0
    cursor.execute("UPDATE Notes SET run_id = 0 WHERE run_id IS NULL")
    updated = cursor.rowcount
    print(f"✅ Updated {updated} notes with NULL run_id to run_id=0")
    
    # Commit changes
    conn.commit()
    
    # Verify the fix
    cursor.execute("SELECT task_id, run_id, COUNT(*) FROM Notes GROUP BY task_id, run_id ORDER BY task_id, run_id")
    groups = cursor.fetchall()
    print(f"\n📊 Notes by task and run after fix:")
    for group in groups:
        print(f"  Task {group[0]}, Run {group[1]}: {group[2]} notes")
    
    conn.close()

if __name__ == "__main__":
    debug_notes_issue()
    debug_measurement_data_issue()
    fix_notes_run_ids()
    
    print("\n" + "=" * 50)
    print("🎯 SUMMARY:")
    print("1. Check if notes are now showing properly")
    print("2. For 'No measurement data' error, use available runs (usually 0, not 1)")
    print("3. The frontend might be requesting run 1 when only run 0 exists")
    print("=" * 50) 