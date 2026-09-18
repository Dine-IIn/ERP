import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from collections import defaultdict

# 1. Vendor mapping reference
VENDORS = {
    'CASTING': 'VEN0000001;VEN0000003', # Aji Castings, Shapar Foundry
    'MACHINING': 'VEN0000002;VEN0000006', # Apex Precision, Sardar Grinding
    'HEAT_TREAT': 'VEN0000004', # Gujarat Heat Treaters
    'GEAR': 'VEN0000005', # Maruti Precision Gear
    'GRINDING': 'VEN0000006', # Sardar Grinding
    'PLATING': 'VEN0000007', # Hard Chrome Plating
    'HYDRAULIC': 'VEN0000008', # Yuken India Hydraulics
    'ELECTRICAL': 'VEN0000009', # Siemens Automation
    'SEAL': 'VEN0000010', # Polymer Seal Industries
    'BOUGHTOUT': 'VEN0000011', # Kabra Extrusion
    'FASTENER': 'VEN0000012', # National Fasteners
}

VENDOR_NAMES = {
    'VEN0000001': 'Aji Castings & Alloys Pvt Ltd',
    'VEN0000002': 'Apex Precision VMC Machinists',
    'VEN0000003': 'Shapar Heavy Foundry & Forging',
    'VEN0000004': 'Gujarat Heat Treaters & Nitriding',
    'VEN0000005': 'Maruti Precision Gear Works',
    'VEN0000006': 'Sardar Cylindrical & Surface Grinding',
    'VEN0000007': 'Hard Chrome Plating Corporation',
    'VEN0000008': 'Yuken India Hydraulics Pvt Ltd',
    'VEN0000009': 'Siemens Automation & Drives Ltd',
    'VEN0000010': 'Polymer Seal & O-Ring Industries',
    'VEN0000011': 'Kabra Extrusion & Machine Tools',
    'VEN0000012': 'National Fasteners & High Tensile Bolts',
}

wb = openpyxl.load_workbook('1-ERP 90-200 TON.xlsx', data_only=True)

raw_rows = []
bom_structure = defaultdict(list) # sheet_title -> list of items

for sname in wb.sheetnames:
    ws = wb[sname]
    max_r = ws.max_row
    max_c = ws.max_column
    
    row1 = [cell.value for cell in list(ws.iter_rows(min_row=1, max_row=1))[0]]
    row2 = [cell.value for cell in list(ws.iter_rows(min_row=2, max_row=2))[0]]
    
    col_idx = 0
    while col_idx < max_c:
        h1 = row1[col_idx]
        h2 = row2[col_idx] if col_idx < len(row2) else None
        
        if h2 and 'SR' in str(h2).upper():
            block_title = h1
            if not block_title:
                for b_idx in range(col_idx, -1, -1):
                    if row1[b_idx]:
                        block_title = row1[b_idx]
                        break
            
            subheaders = []
            for c in range(col_idx, max_c):
                val = row2[c]
                if c > col_idx and (val is None or (row1[c] and 'SR' not in str(val).upper() and row1[c] != block_title)):
                    break
                subheaders.append(str(val).strip().replace('\n', ' ') if val is not None else '')
                if 'CLASS' in subheaders[-1].upper():
                    break
            
            for r in range(3, max_r + 1):
                row_cells = [ws.cell(row=r, column=col_idx + 1 + offset).value for offset in range(len(subheaders))]
                sr_no = row_cells[0]
                if sr_no is None or str(sr_no).strip() == '':
                    continue
                try:
                    sr_num = int(float(str(sr_no).strip()))
                except:
                    continue
                
                row_dict = {'sheet': sname, 'block': str(block_title).strip(), 'row': r, 'sr_no': sr_num}
                for sh, cell_val in zip(subheaders, row_cells):
                    sh_clean = sh.upper()
                    if 'OLD' in sh_clean:
                        row_dict['old_code'] = str(cell_val).strip() if cell_val is not None else ''
                    elif 'NEW' in sh_clean or 'PART CODE' in sh_clean:
                        row_dict['new_code'] = str(cell_val).strip() if cell_val is not None else ''
                    elif 'DECRIPTION' in sh_clean or 'DESCRIPTION' in sh_clean or 'ITEM' in sh_clean:
                        row_dict['name'] = str(cell_val).strip() if cell_val is not None else ''
                    elif 'QTY' in sh_clean:
                        row_dict['qty'] = float(cell_val) if cell_val is not None and str(cell_val).strip() != '' else 1.0
                    elif 'CLASS' in sh_clean:
                        row_dict['class'] = str(cell_val).strip() if cell_val is not None else ''
                
                raw_rows.append(row_dict)
                bom_structure[str(block_title).strip()].append(row_dict)
            
            col_idx += max(1, len(subheaders))
        else:
            col_idx += 1

wb.close()

print(f"Loaded {len(raw_rows)} total item rows from 1-ERP 90-200 TON.xlsx across {len(bom_structure)} BOM blocks.")

# Build Unique Items Dictionary
# Keyed by Part Code (or Name if Part Code is absent)
items_dict = {}

# Also add Machine Top Assemblies if present in block headers
TOP_MACHINES = [
    {'code': '1000310100', 'old': '10000', 'name': 'NEO PRIME 90 - 280 TON (INJECTION UNIT GUIDE ROD TYPE)', 'class': 'FG', 'loc': 'Dispatch Bay', 'uom': 'SET', 'price': 1500000, 'lead': 30, 'qc': 'ON_GRN'},
    {'code': '1000310400', 'old': '10001', 'name': 'NEO PRIME 110 - 420 TON (INJECTION UNIT GUIDE ROD TYPE)', 'class': 'FG', 'loc': 'Dispatch Bay', 'uom': 'SET', 'price': 1800000, 'lead': 30, 'qc': 'ON_GRN'},
    {'code': '1000310700', 'old': '10002', 'name': 'NEO PRIME 140 - 635 TON (INJECTION UNIT GUIDE ROD TYPE)', 'class': 'FG', 'loc': 'Dispatch Bay', 'uom': 'SET', 'price': 2200000, 'lead': 30, 'qc': 'ON_GRN'},
    {'code': '1000311000', 'old': '10003', 'name': 'NEO PRIME 170 - 905 TON (INJECTION UNIT GUIDE ROD TYPE)', 'class': 'FG', 'loc': 'Dispatch Bay', 'uom': 'SET', 'price': 2600000, 'lead': 35, 'qc': 'ON_GRN'},
    {'code': '1000311300', 'old': '10004', 'name': 'NEO PRIME 200 - 1520 TON (INJECTION UNIT GUIDE ROD TYPE)', 'class': 'FG', 'loc': 'Dispatch Bay', 'uom': 'SET', 'price': 3100000, 'lead': 35, 'qc': 'ON_GRN'},
]

for m in TOP_MACHINES:
    items_dict[m['code']] = {
        'old_code': m['old'],
        'part_code': m['code'],
        'name': m['name'],
        'category': m['class'],
        'sources': 'In-house',
        'vendors': '',
        'unit': m['uom'],
        'purchase_uom': m['uom'],
        'conv_factor': 1,
        'in_house_stock': 1,
        'external_stock': 0,
        'min_stock': 1,
        'min_order': 1,
        'unit_price': m['price'],
        'lead_time': m['lead'],
        'location': m['loc'],
        'qc_trigger': m['qc']
    }

for r in raw_rows:
    p_code = r.get('new_code', '').strip()
    name = r.get('name', '').strip()
    old_c = r.get('old_code', '').strip()
    cls = r.get('class', '').strip().upper()
    
    if not p_code and not name:
        continue
    if p_code == '-' and not name:
        continue
    
    item_key = p_code if (p_code and p_code != '-') else name
    
    # Category / Class mapping
    cat = cls if cls else 'MC'
    if cat == 'PTN':
        cat = 'PTN' # Pattern
    elif cat == 'RM':
        cat = 'RM' # Raw Material Casting
    elif cat == 'AS' or cat == 'SA':
        cat = 'SA' # Sub-Assembly
    elif cat == 'MF' or cat == 'MC':
        cat = 'MC' # Machined Component
    elif cat == 'BO':
        cat = 'BO' # Bought out
    elif cat == 'EL':
        cat = 'EL' # Electrical
    elif cat == 'HY':
        cat = 'HY' # Hydraulic
    elif cat == 'HD':
        cat = 'HD' # Hardware
    elif cat == 'SL':
        cat = 'SL' # Seal
    
    # Process sources & Preferred Vendors
    name_lower = name.lower()
    if cat == 'RM' or 'casting' in name_lower:
        sources = 'Bought out'
        vendors = VENDORS['CASTING']
        loc = 'Raw Material Yard'
        uom = 'NOS'
        lead = 18
        qc = 'ON_GRN'
        price = 18500
    elif cat == 'PTN' or 'pattern' in name_lower:
        sources = 'Bought out'
        vendors = VENDORS['CASTING']
        loc = 'Pattern Store'
        uom = 'NOS'
        lead = 25
        qc = 'NO_QC'
        price = 35000
    elif cat == 'SA' or 'assy' in name_lower or 'unit' in name_lower or cat == 'AS':
        sources = 'In-house'
        vendors = ''
        loc = 'Sub-Assembly Area'
        uom = 'SET'
        lead = 14
        qc = 'DURING_ASSEMBLY'
        price = 85000
    elif 'gear' in name_lower or 'sun gear' in name_lower:
        sources = 'In-house;Job work'
        vendors = VENDORS['GEAR']
        loc = 'WIP Rack - Gears'
        uom = 'NOS'
        lead = 14
        qc = 'ON_GRN'
        price = 12500
    elif 'valve' in name_lower or 'pump' in name_lower or 'manifold' in name_lower or cat == 'HY' or 'yuken' in name_lower or 'rexroth' in name_lower:
        sources = 'Bought out'
        vendors = VENDORS['HYDRAULIC']
        loc = 'Hydraulics Bay H-01'
        uom = 'NOS'
        lead = 12
        qc = 'ON_GRN'
        price = 14500
    elif 'plc' in name_lower or 'sensor' in name_lower or 'motor' in name_lower or 'linear' in name_lower or cat == 'EL' or 'b&r' in name_lower or 'panel' in name_lower or 'servo' in name_lower:
        sources = 'Bought out'
        vendors = VENDORS['ELECTRICAL']
        loc = 'Electrical Store E-01'
        uom = 'NOS'
        lead = 14
        qc = 'ON_GRN'
        price = 28000
    elif 'seal' in name_lower or 'o-ring' in name_lower or 'wiper' in name_lower or cat == 'SL':
        sources = 'Bought out'
        vendors = VENDORS['SEAL']
        loc = 'Standard Bought-out Store'
        uom = 'NOS'
        lead = 7
        qc = 'ON_GRN'
        price = 850
    elif 'bolt' in name_lower or 'screw' in name_lower and 'assy' not in name_lower or 'pin' in name_lower or 'nut' in name_lower or cat == 'HD':
        sources = 'Bought out'
        vendors = VENDORS['FASTENER']
        loc = 'Hardware Bins'
        uom = 'NOS'
        lead = 5
        qc = 'NO_QC'
        price = 150
    elif 'barrel' in name_lower or 'screw' in name_lower or 'tie bar' in name_lower or 'plate' in name_lower or 'cross head' in name_lower or 'link' in name_lower or cat == 'MC':
        sources = 'In-house;Job work'
        vendors = VENDORS['MACHINING']
        loc = 'Machining WIP Bay'
        uom = 'NOS'
        lead = 15
        qc = 'ON_GRN'
        price = 24000
    else:
        sources = 'Bought out'
        vendors = VENDORS['BOUGHTOUT']
        loc = 'Central Store'
        uom = 'NOS'
        lead = 10
        qc = 'ON_GRN'
        price = 2500

    if item_key not in items_dict:
        items_dict[item_key] = {
            'old_code': old_c if old_c != '-' else '',
            'part_code': p_code if p_code != '-' else '',
            'name': name,
            'category': cat,
            'sources': sources,
            'vendors': vendors,
            'unit': uom,
            'purchase_uom': uom,
            'conv_factor': 1,
            'in_house_stock': 10 if cat in ['HD', 'BO'] else 4,
            'external_stock': 2 if 'Job work' in sources else 0,
            'min_stock': 5 if cat in ['HD', 'BO'] else 2,
            'min_order': 10 if cat in ['HD'] else 1,
            'unit_price': price,
            'lead_time': lead,
            'location': loc,
            'qc_trigger': qc
        }
    else:
        # Update existing record if new info is richer
        if not items_dict[item_key]['old_code'] and old_c and old_c != '-':
            items_dict[item_key]['old_code'] = old_c
        if not items_dict[item_key]['part_code'] and p_code and p_code != '-':
            items_dict[item_key]['part_code'] = p_code

print(f"Total Unique Items resolved for Item Master: {len(items_dict)}")

# ==============================================================================
# 1. GENERATE mew3_Item_Master_Generated.xlsx
# ==============================================================================
header_font = Font(name='Segoe UI', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
center_align = Alignment(horizontal='center', vertical='center')
left_align = Alignment(horizontal='left', vertical='center')
right_align = Alignment(horizontal='right', vertical='center')
border_thin = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)

wb_item = openpyxl.Workbook()
ws_item = wb_item.active
ws_item.title = 'Item Master'

item_headers = [
    'Old Code', 'Part Code', 'Item Name', 'Category', 'MaterialProcessSources', 
    'Preferred Vendors', 'Unit', 'PurchaseUnit', 'ConversionFactor', 
    'InHouseStock', 'ExternalStock', 'MinStockQty', 'MinOrderQty', 
    'UnitPrice', 'Lead Time in Days', 'Location', 'QCTrigger'
]

ws_item.append(item_headers)
for col_num, h in enumerate(item_headers, 1):
    cell = ws_item.cell(row=1, column=col_num)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

for it in items_dict.values():
    row_vals = [
        it['old_code'],
        it['part_code'],
        it['name'],
        it['category'],
        it['sources'],
        it['vendors'],
        it['unit'],
        it['purchase_uom'],
        it['conv_factor'],
        it['in_house_stock'],
        it['external_stock'],
        it['min_stock'],
        it['min_order'],
        it['unit_price'],
        it['lead_time'],
        it['location'],
        it['qc_trigger']
    ]
    ws_item.append(row_vals)

# Auto-adjust column widths
for col in ws_item.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws_item.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb_item.save('mew3_Item_Master_Generated.xlsx')
os.makedirs('data/item_master', exist_ok=True)
wb_item.save('data/item_master/mew3_Item_Master_Generated.xlsx')
print("✓ Saved mew3_Item_Master_Generated.xlsx (Root & data/item_master)")

# ==============================================================================
# 2. GENERATE mew3_Inventory_Master_Generated.xlsx
# ==============================================================================
wb_inv = openpyxl.Workbook()
ws_inv = wb_inv.active
ws_inv.title = 'Inventory Stock'

inv_headers = [
    'Item Code', 'Part Code', 'Item Name', 'In-House Stock', 
    'External Stock', 'Location', 'Unit Price (₹)', 'Min Stock Qty'
]
ws_inv.append(inv_headers)
for col_num, h in enumerate(inv_headers, 1):
    cell = ws_inv.cell(row=1, column=col_num)
    cell.font = header_font
    cell.fill = PatternFill(start_color='1E6B37', end_color='1E6B37', fill_type='solid')
    cell.alignment = center_align

for it in items_dict.values():
    code = it['part_code'] or it['name']
    row_vals = [
        code,
        it['old_code'] or it['part_code'] or '-',
        it['name'],
        it['in_house_stock'],
        it['external_stock'],
        it['location'],
        it['unit_price'],
        it['min_stock']
    ]
    ws_inv.append(row_vals)

for col in ws_inv.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws_inv.column_dimensions[col_letter].width = max(max_len + 3, 14)

wb_inv.save('mew3_Inventory_Master_Generated.xlsx')
os.makedirs('data/inventory', exist_ok=True)
wb_inv.save('data/inventory/mew3_Inventory_Master_Generated.xlsx')
print("✓ Saved mew3_Inventory_Master_Generated.xlsx (Root & data/inventory)")

# ==============================================================================
# 3. GENERATE mew3_Process_Master_Generated.xlsx
# ==============================================================================
# Load casting sheet to map finished parts to raw castings
ws_c = wb['CASTING-90-200 TON']
casting_map = {} # finished_part_code / finished_name -> raw_casting_dict

# Scan casting tables
row1_c = [cell.value for cell in list(ws_c.iter_rows(min_row=1, max_row=1))[0]]
row2_c = [cell.value for cell in list(ws_c.iter_rows(min_row=2, max_row=2))[0]]
c_idx = 0
while c_idx < ws_c.max_column:
    h2 = row2_c[c_idx] if c_idx < len(row2_c) else None
    if h2 and 'SR' in str(h2).upper():
        subh = []
        for c in range(c_idx, ws_c.max_column):
            val = row2_c[c]
            if c > c_idx and (val is None or (row1_c[c] and 'SR' not in str(val).upper())):
                break
            subh.append(str(val).strip().replace('\n', ' ') if val is not None else '')
            if 'CLASS' in subh[-1].upper():
                break
        
        for r in range(3, ws_c.max_row + 1):
            rc = [ws_c.cell(row=r, column=c_idx + 1 + off).value for off in range(len(subh))]
            if not rc[0]: continue
            
            c_dict = {}
            for sh, val in zip(subh, rc):
                if 'OLD' in sh.upper(): c_dict['old'] = str(val).strip() if val else ''
                elif 'NEW' in sh.upper(): c_dict['code'] = str(val).strip() if val else ''
                elif 'DEC' in sh.upper() or 'DESC' in sh.upper() or 'ITEM' in sh.upper(): c_dict['name'] = str(val).strip() if val else ''
            
            if c_dict.get('code') and c_dict.get('name'):
                # Extract the base component name by removing (CASTING)
                base_name = c_dict['name'].replace('(CASTING)', '').replace('CASTING', '').strip()
                casting_map[base_name.upper()] = c_dict
                if c_dict.get('old') and c_dict['old'] != '-':
                    casting_map[c_dict['old'].upper()] = c_dict
        c_idx += max(1, len(subh))
    else:
        c_idx += 1

# Process Routing Steps Template for major machine parts
PROCESS_ROUTING_TEMPLATES = {
    'STATIONARY PLATE': [
        (1, 'Rough & Finish VMC Planing', 'LC-VMC', 4, 'Apex Precision VMC Machinists (VEN0000002)', 'Rough & finish top/bottom platen face to 0.02mm flatness'),
        (2, 'Line Boring 4x Tie Bar Holes', 'BORING', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Bore 4x Tie bar holes to H7 tolerance with chamfering'),
        (3, 'Drilling & Tapping Mold Pattern', 'DRILLING', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'M16 mold clamp tapped holes as per Euromap / SPI drawing'),
        (4, 'Stress Relieving / Heat Treatment', 'HEAT_TREAT', 2, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Normalize stress at 550°C and slow cool in furnace'),
        (5, 'Precision Surface Grinding', 'GRINDING', 2, 'Sardar Cylindrical & Surface Grinding (VEN0000006)', 'Precision surface grind & rust preventive oil coating')
    ],
    'MOVING PLATE': [
        (1, 'Platen Face & Profile Milling', 'LC-VMC', 4, 'Apex Precision VMC Machinists (VEN0000002)', 'Platen front & toggle rear face machining with chamfers'),
        (2, 'Line Boring for Bushings & Tie Bars', 'BORING', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Precision line bore for bronze bushings to H7 fit'),
        (3, 'Center Bore & Ejector Pattern Drilling', 'DRILLING', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Center hole & pattern drilling for mold mounting'),
        (4, 'Final Surface Grinding & Inspection', 'GRINDING', 2, 'Sardar Cylindrical & Surface Grinding (VEN0000006)', 'Surface protection treatment & 0.015mm flatness inspection')
    ],
    'END PLATE': [
        (1, 'Square Face & Profile Sizing', 'LC-VMC', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Square face and profile sizing on 5-axis horizontal VMC'),
        (2, 'Toggle Pivot Bore Machining', 'BORING', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Toggle pin pivot bores to H7 tolerance with lubrication grooves'),
        (3, 'Buttress Thread Bore Machining', 'THREADING', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Die-height adjustment buttress thread bore machining'),
        (4, 'Surface Grinding & Deburring', 'GRINDING', 1, 'Sardar Cylindrical & Surface Grinding (VEN0000006)', 'Final grinding and edge deburring')
    ],
    'CROSS HEAD': [
        (1, '4-Face Milling & Pocketing', 'LC-VMC', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Machining all 4 faces and cylinder attachment pockets'),
        (2, 'Twin Link Pin Boring', 'BORING', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Twin link pin bores to H7 finish for hardened pins'),
        (3, 'Piston Rod Thread & Guide Bush Fitting', 'FITTING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'Piston rod thread and guide bush fitting inspection')
    ],
    'CROSS HEAD LINK': [
        (1, 'Face Milling & Pin Bore Roughing', 'LC-VMC', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Face milling and center pin hole roughing on CNC'),
        (2, 'Precision Boring & Reaming', 'BORING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'Pin holes reamed to H7 tolerance'),
        (3, 'Bronze Bushing Press Fitting & Honing', 'HONING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'Phosphor bronze bushing press fit and ID diamond honing')
    ],
    'BINARY LINK': [
        (1, 'CNC Link Profile & Face Milling', 'LC-VMC', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Side faces and pivot bosses milled on 4-axis CNC'),
        (2, 'Twin Pivot Hole Precision Boring', 'BORING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'Bore twin holes with 0.015mm center-to-center pitch accuracy'),
        (3, 'Gas Nitriding & Bushing Fitting', 'HEAT_TREAT', 2, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Gas nitriding 500HV case depth 0.3mm & bushing press-fit')
    ],
    'TERNARY LINK': [
        (1, 'Heavy Duty 3-Point Link Machining', 'LC-VMC', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Heavy duty 3-point link triangular profile milling'),
        (2, 'Tri-Axis Line Boring', 'BORING', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Tri-axis line boring for toggle pivot pins'),
        (3, 'Induction Hardening & Honing', 'HEAT_TREAT', 2, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Pivot bore induction hardening and diamond honing')
    ],
    'SUN GEAR': [
        (1, 'CNC Turning & Face Facing', 'CNC_LATHE', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'CNC turning OD, ID bore and mounting face'),
        (2, 'Gear Hobbing (Module-3)', 'GEAR_HOBBING', 3, 'Maruti Precision Gear Works (VEN0000005)', 'Precision gear hobbing as per DIN Class 8 standard'),
        (3, 'Gear Teeth Case Hardening & Nitriding', 'HEAT_TREAT', 2, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Case hardening teeth to 58-62 HRC, core 32 HRC')
    ],
    'BARREL PLATE': [
        (1, 'Barrel Plate Face Milling & Center Bore', 'LC-VMC', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Heavy face milling and barrel spigot locating bore'),
        (2, 'Guide Rod & Cylinder Bores', 'BORING', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Line boring guide rod holes to H7 tolerance'),
        (3, 'Heater Band & Thermocouple Drilling', 'DRILLING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'Drill and tap mounting holes')
    ],
    'BEARING HOUSING': [
        (1, 'Bearing Housing Turning & Facing', 'CNC_LATHE', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'CNC turning bearing register bore to P7 tolerance'),
        (2, 'Oil Seal & Circlip Groove Machining', 'GROOVING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'Precision oil seal register and circlip grooving'),
        (3, 'Flange Drilling & Greasing Holes', 'DRILLING', 1, 'Apex Precision VMC Machinists (VEN0000002)', 'PCD drilling and 1/4 BSP greasing tapped ports')
    ],
    'SCREW': [
        (1, 'CNC Rough Turning & Deep Hole Boring', 'CNC_LATHE', 4, 'Apex Precision VMC Machinists (VEN0000002)', 'Rough turning EN41B round bar, internal cooling bore'),
        (2, 'CNC Screw Flight Milling (Variable Pitch)', 'SCREW_MILL', 5, 'Apex Precision VMC Machinists (VEN0000002)', 'CNC flight milling compression, metering & barrier zones'),
        (3, 'Gas Nitriding & Stress Relieving', 'HEAT_TREAT', 3, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Ion/Gas nitriding to 65-68 HRC, 0.55mm case depth'),
        (4, 'Hard Chrome Plating', 'PLATING', 3, 'Hard Chrome Plating Corporation (VEN0000007)', 'Flash hard chrome plating 0.025mm for wear & chemical resistance'),
        (5, 'Precision Mirror Polish & Grinding', 'GRINDING', 2, 'Sardar Cylindrical & Surface Grinding (VEN0000006)', 'Super-finish flight polish to Ra 0.2 µm')
    ],
    'BARREL': [
        (1, 'Deep Hole Gun Drilling & Rough Turning', 'GUN_DRILL', 4, 'Apex Precision VMC Machinists (VEN0000002)', 'Gun drill seamless forged EN41B cylinder bar to rough ID'),
        (2, 'Deep Hole Honing', 'HONING', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Vertical deep-hole diamond honing to H7 tolerance'),
        (3, 'Gas Nitriding & Bimetallic Treatment', 'HEAT_TREAT', 4, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Deep nitriding ID surface to 68 HRC, 0.6mm case depth'),
        (4, 'OD Finish Turning, Flange & Ports', 'CNC_LATHE', 2, 'Apex Precision VMC Machinists (VEN0000002)', 'Feed throat opening, thermocouple wells and flange threading'),
        (5, 'Internal Super Mirror Honing', 'HONING', 2, 'Sardar Cylindrical & Surface Grinding (VEN0000006)', 'Final mirror honing to Ra 0.1 µm')
    ],
    'TIE BAR': [
        (1, 'EN8D / 42CrMo4 Round Bar Peeling & Rough Turning', 'CNC_LATHE', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Rough turn OD leaving 0.8mm grinding allowance'),
        (2, 'Thread Whirling / Buttress Thread Cutting', 'THREADING', 3, 'Apex Precision VMC Machinists (VEN0000002)', 'Precision buttress thread whirling for split nut clamping'),
        (3, 'Medium Frequency Induction Hardening', 'HEAT_TREAT', 3, 'Gujarat Heat Treaters & Nitriding (VEN0000004)', 'Induction hardening full length to 52-56 HRC, 2.5mm depth'),
        (4, 'Centerless Cylindrical Grinding', 'GRINDING', 3, 'Sardar Cylindrical & Surface Grinding (VEN0000006)', 'Cylindrical grinding to h6 tolerance, straightness 0.02/m'),
        (5, 'Hard Chrome Plating & Mirror Polishing', 'PLATING', 3, 'Hard Chrome Plating Corporation (VEN0000007)', 'Hard chrome plating 0.04mm & mirror polish to Ra 0.15 µm')
    ]
}

wb_proc = openpyxl.Workbook()
ws_proc = wb_proc.active
ws_proc.title = 'Process Routing Master'

proc_headers = [
    'Finished Part Code', 'Finished Old Code', 'Finished Item Name', 
    'Raw Casting Part Code', 'Raw Casting Old Code', 'Raw Casting Name', 
    'Step No', 'Process Name', 'Process Short Code', 'Estimated Days', 
    'Vendors', 'Remarks / Specs'
]
ws_proc.append(proc_headers)
for col_num, h in enumerate(proc_headers, 1):
    cell = ws_proc.cell(row=1, column=col_num)
    cell.font = header_font
    cell.fill = PatternFill(start_color='7030A0', end_color='7030A0', fill_type='solid')
    cell.alignment = center_align

# Generate Process Routing rows for all machined parts in items_dict
for it_code, it_data in items_dict.items():
    name = it_data['name']
    name_u = name.upper()
    cat = it_data['category']
    
    if cat not in ['MC', 'MF'] and 'assy' in name.lower():
        continue
    
    # Check if a routing template matches
    matched_template = None
    for t_key, steps in PROCESS_ROUTING_TEMPLATES.items():
        if t_key in name_u:
            matched_template = steps
            break
    
    if matched_template:
        # Find raw casting if applicable
        raw_info = None
        for c_key, c_val in casting_map.items():
            if c_key in name_u:
                raw_info = c_val
                break
        
        raw_code = raw_info.get('code', '') if raw_info else ''
        raw_old = raw_info.get('old', '') if raw_info else ''
        raw_name = raw_info.get('name', '') if raw_info else f"RAW FORGING / ROUND BAR FOR {name}"
        
        for step in matched_template:
            row_vals = [
                it_data['part_code'] or it_code,
                it_data['old_code'] or '-',
                name,
                raw_code or '-',
                raw_old or '-',
                raw_name,
                step[0],
                step[1],
                step[2],
                step[3],
                step[4],
                step[5]
            ]
            ws_proc.append(row_vals)

for col in ws_proc.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws_proc.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb_proc.save('mew3_Process_Master_Generated.xlsx')
os.makedirs('data/process_master', exist_ok=True)
wb_proc.save('data/process_master/mew3_Process_Master_Generated.xlsx')
print(f"✓ Saved mew3_Process_Master_Generated.xlsx (Root & data/process_master)")

# ==============================================================================
# 4. GENERATE mew3_BOM_Master_Generated.xlsx
# ==============================================================================
wb_bom = openpyxl.Workbook()
# remove default sheet
wb_bom.remove(wb_bom.active)

# Create BOM sheet for each table block in bom_structure
for block_title, b_items in bom_structure.items():
    if not b_items: continue
    
    # sanitize sheet title (max 31 chars, no invalid chars)
    s_title = block_title
    # Simplify sheet title
    for token in ['(INJECTION UNIT GUIDE ROD TYPE)', 'GUIDE ROD TYPE', 'TOGGLE TYPE', '(STOCK-150)', '(STOCK-175)', '(STOCK-295)', '(STOCK-325)']:
        s_title = s_title.replace(token, '')
    s_title = s_title.replace('[', '').replace(']', '').replace('(', '').replace(')', '').strip()
    s_title = s_title.replace('SCREW BARREL ASSY -', 'SCREW ASSY').replace('TOGGLE TYPE LOCKING UNIT-', 'LOCKING UNIT-')
    s_title = s_title.replace('NEO PRIME ', '').strip()
    
    # Ensure length <= 31
    if len(s_title) > 31:
        s_title = s_title[:31].strip()
    
    # Avoid duplicate sheet names
    orig_title = s_title
    dup_cnt = 1
    while s_title in wb_bom.sheetnames:
        s_title = f"{orig_title[:28]}_{dup_cnt}"
        dup_cnt += 1
    
    ws_b = wb_bom.create_sheet(title=s_title)
    
    # Title Row
    ws_b.append([block_title, '', '', ''])
    cell_t = ws_b.cell(row=1, column=1)
    cell_t.font = Font(name='Segoe UI', size=11, bold=True, color='1F4E78')
    
    # Header Row
    b_headers = ['Part Code', 'Old Part Code', 'Item Description', 'QTY']
    ws_b.append(b_headers)
    for col_num, h in enumerate(b_headers, 1):
        c_cell = ws_b.cell(row=2, column=col_num)
        c_cell.font = header_font
        c_cell.fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
        c_cell.alignment = center_align
    
    for it in b_items:
        p_c = it.get('new_code', '').strip()
        o_c = it.get('old_code', '').strip()
        d_n = it.get('name', '').strip()
        q_v = it.get('qty', 1.0)
        
        ws_b.append([
            p_c if p_c != '-' else '',
            o_c if o_c != '-' else '',
            d_n,
            q_v
        ])
    
    for col in ws_b.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_b.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb_bom.save('mew3_BOM_Master_Generated.xlsx')
os.makedirs('data/bom', exist_ok=True)
wb_bom.save('data/bom/mew3_BOM_Master_Generated.xlsx')
print(f"✓ Saved mew3_BOM_Master_Generated.xlsx with {len(wb_bom.sheetnames)} BOM sheets (Root & data/bom)")

