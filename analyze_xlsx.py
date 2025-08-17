#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET
import re

def analyze_xlsx(filename):
    print(f"Analyzing {filename}...")
    
    with zipfile.ZipFile(filename) as z:
        # List all files
        print("\nFiles in XLSX:")
        for f in z.namelist():
            print(f"  {f}")
        
        # Read shared strings
        try:
            shared_strings_xml = z.read('xl/sharedStrings.xml')
            shared_root = ET.fromstring(shared_strings_xml)
            strings = []
            for si in shared_root.findall('.//{*}si'):
                text_elements = si.findall('.//{*}t')
                if text_elements:
                    strings.append(''.join([t.text or '' for t in text_elements]))
            
            print(f"\nShared strings ({len(strings)}):")
            for i, s in enumerate(strings):
                print(f"  {i}: {repr(s)}")
        except Exception as e:
            print(f"Error reading shared strings: {e}")
        
        # Read sheet data
        try:
            sheet_xml = z.read('xl/worksheets/sheet1.xml')
            sheet_root = ET.fromstring(sheet_xml)
            
            print(f"\nSheet data:")
            rows = sheet_root.findall('.//{*}row')
            print(f"Total rows: {len(rows)}")
            
            # Look for rows with actual data
            data_found = False
            for i, row in enumerate(rows):
                cells = row.findall('.//{*}c')
                if not cells:
                    continue
                    
                # Check if this row has any non-empty values
                row_has_data = False
                cell_values = []
                
                for j, cell in enumerate(cells):
                    cell_value = cell.get('v', '')
                    cell_type = cell.get('t', '')
                    
                    # Get actual text value
                    actual_value = ''
                    if cell_type == 's' and cell_value.isdigit():
                        string_index = int(cell_value)
                        if string_index < len(strings):
                            actual_value = strings[string_index]
                    elif cell_type == 'inlineStr':
                        # Get inline string value
                        t_elements = cell.findall('.//{*}t')
                        if t_elements:
                            actual_value = ''.join([t.text or '' for t in t_elements])
                    else:
                        actual_value = cell_value
                    
                    cell_values.append(actual_value)
                    if actual_value and actual_value.strip():
                        row_has_data = True
                
                if row_has_data:
                    print(f"\nRow {i+1} (has data):")
                    for j, value in enumerate(cell_values):
                        if value and value.strip():
                            print(f"  Cell {j+1}: {repr(value)}")
                    data_found = True
                    
                    # Show first 10 data rows
                    if i >= 10:
                        break
                        
            if not data_found:
                print("No data rows found!")
                
        except Exception as e:
            print(f"Error reading sheet data: {e}")

if __name__ == "__main__":
    analyze_xlsx('TradeHistory06_01_16.xlsx')