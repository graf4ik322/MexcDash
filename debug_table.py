#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET

def analyze_xlsx_detailed(filename):
    print(f"=== ДЕТАЛЬНЫЙ АНАЛИЗ {filename} ===")
    
    with zipfile.ZipFile(filename) as z:
        # Read shared strings
        shared_strings_xml = z.read('xl/sharedStrings.xml')
        shared_root = ET.fromstring(shared_strings_xml)
        strings = []
        for si in shared_root.findall('.//{*}si'):
            text_elements = si.findall('.//{*}t')
            if text_elements:
                strings.append(''.join([t.text or '' for t in text_elements]))
        
        print(f"\nВсего строк в shared strings: {len(strings)}")
        print("Первые 20 строк:")
        for i, s in enumerate(strings[:20]):
            print(f"  {i}: {repr(s)}")
        
        # Read sheet data
        sheet_xml = z.read('xl/worksheets/sheet1.xml')
        sheet_root = ET.fromstring(sheet_xml)
        rows = sheet_root.findall('.//{*}row')
        
        print(f"\nВсего строк в листе: {len(rows)}")
        
        # Analyze first 10 rows in detail
        print("\n=== АНАЛИЗ ПЕРВЫХ 10 СТРОК ===")
        for i, row in enumerate(rows[:10]):
            cells = row.findall('.//{*}c')
            print(f"\nСтрока {i+1}:")
            print(f"  Количество ячеек: {len(cells)}")
            
            for j, cell in enumerate(cells):
                cell_value = cell.get('v', '')
                cell_type = cell.get('t', '')
                cell_ref = cell.get('r', '')
                
                # Get actual text value
                actual_value = ''
                if cell_type == 's' and cell_value.isdigit():
                    string_index = int(cell_value)
                    if string_index < len(strings):
                        actual_value = strings[string_index]
                elif cell_type == 'inlineStr':
                    t_elements = cell.findall('.//{*}t')
                    if t_elements:
                        actual_value = ''.join([t.text or '' for t in t_elements])
                else:
                    actual_value = cell_value
                
                print(f"    Ячейка {cell_ref}: type={cell_type}, value={repr(actual_value)}")
        
        # Look for data patterns
        print("\n=== ПОИСК ДАННЫХ ===")
        data_rows = 0
        for i, row in enumerate(rows):
            cells = row.findall('.//{*}c')
            if not cells:
                continue
                
            # Check if this row has any non-empty values
            row_has_data = False
            for cell in cells:
                cell_value = cell.get('v', '')
                cell_type = cell.get('t', '')
                
                actual_value = ''
                if cell_type == 's' and cell_value.isdigit():
                    string_index = int(cell_value)
                    if string_index < len(strings):
                        actual_value = strings[string_index]
                elif cell_type == 'inlineStr':
                    t_elements = cell.findall('.//{*}t')
                    if t_elements:
                        actual_value = ''.join([t.text or '' for t in t_elements])
                else:
                    actual_value = cell_value
                
                if actual_value and actual_value.strip():
                    row_has_data = True
                    break
            
            if row_has_data:
                data_rows += 1
                if data_rows <= 5:  # Show first 5 data rows
                    print(f"\nСтрока с данными {data_rows} (строка {i+1}):")
                    for j, cell in enumerate(cells):
                        cell_value = cell.get('v', '')
                        cell_type = cell.get('t', '')
                        
                        actual_value = ''
                        if cell_type == 's' and cell_value.isdigit():
                            string_index = int(cell_value)
                            if string_index < len(strings):
                                actual_value = strings[string_index]
                        elif cell_type == 'inlineStr':
                            t_elements = cell.findall('.//{*}t')
                            if t_elements:
                                actual_value = ''.join([t.text or '' for t in t_elements])
                        else:
                            actual_value = cell_value
                        
                        if actual_value and actual_value.strip():
                            print(f"  Колонка {j+1}: {repr(actual_value)}")
        
        print(f"\nВсего строк с данными: {data_rows}")

if __name__ == "__main__":
    analyze_xlsx_detailed('TradeHistory06_01_16.xlsx')