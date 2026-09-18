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

wb = openpyxl.load_workbook('1-ERP BOM 90-200 TON.xlsx', data_only=True)

raw_rows = []
bom_structure = defaultdict(list) # block_title -> list of items

for sname in wb.sheetnames:
    ws = wb[sname]
    max_r = ws.max_row
    max_c = ws.max_column
    
    row1 = [cell.value for cell in list(ws.iter_rows(min_row=1, max_row=1))[0]]
    row2 = [cell.value for cell in list(ws.iter_rows(min_row=2, max_row=2))[0]]
    
    if sname == 'Valve 90-200 TON':
        for col_start, blk, ton_model in [(1, 'HYDRAULIC VALVE GROUP - 90/110 TON', '90 / 110 TON'), (6, 'HYDRAULIC VALVE GROUP - 140/200 TON', '140 / 200 TON')]:
            sr_idx = 1
            for r in range(5, max_r + 1):
                sr = ws.cell(r, col_start+1).value
                desc = ws.cell(r, col_start+2).value
                qty = ws.cell(r, col_start+3).value
                sub_unit = ws.cell(r, col_start+4).value
                if desc and str(desc).strip():
                    name_clean = str(desc).strip()
                    # Assign a distinct part code for valves based on name hash/slug
                    code_slug = f"5000{abs(hash(name_clean)) % 900000 + 100000}"
                    row_dict = {
                        'sheet': sname,
                        'block': blk,
                        'row': r,
                        'sr_no': sr_idx,
                        'old_code': '',
                        'new_code': code_slug,
                        'name': name_clean,
                        'qty': float(qty) if qty and str(qty).replace('.','').isdigit() else 1.0,
                        'class': 'HY',
                        'sub_unit': str(sub_unit).strip() if sub_unit else ''
                    }
                    raw_rows.append(row_dict)
                    bom_structure[blk].append(row_dict)
                    sr_idx += 1
        continue

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

print(f"Loaded {len(raw_rows)} total item rows from 1-ERP BOM 90-200 TON.xlsx across {len(bom_structure)} BOM blocks.")

# Build Unique Items Dictionary
items_dict = {}

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
        cat = 'PTN'
    elif cat == 'RM':
        cat = 'RM'
    elif cat in ['AS', 'SA', 'FAS']:
        cat = 'SA'
    elif cat in ['MF', 'MC']:
        cat = 'MC'
    elif cat == 'BO':
        cat = 'BO'
    elif cat == 'EL':
        cat = 'EL'
    elif cat == 'HY':
        cat = 'HY'
    elif cat == 'HD':
        cat = 'HD'
    elif cat == 'SL':
        cat = 'SL'
    
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
    elif cat == 'SA' or 'assy' in name_lower or 'unit' in name_lower:
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
    elif 'bolt' in name_lower or ('screw' in name_lower and 'assy' not in name_lower and 'barrel' not in name_lower) or 'pin' in name_lower or 'nut' in name_lower or cat == 'HD':
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
        if not items_dict[item_key]['old_code'] and old_c and old_c != '-':
            items_dict[item_key]['old_code'] = old_c
        if not items_dict[item_key]['part_code'] and p_code and p_code != '-':
            items_dict[item_key]['part_code'] = p_code

print(f"Total Unique Items resolved for Item Master: {len(items_dict)}")

# Helper styles for Excel
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

os.makedirs('data/item_master', exist_ok=True)
os.makedirs('data/process_master', exist_ok=True)
os.makedirs('data/bom', exist_ok=True)
os.makedirs('data/inventory', exist_ok=True)

# ==============================================================================
# 1. GENERATE new4_Item_Master_Generated.xlsx & new4_items_template.csv
# ==============================================================================
wb_item = openpyxl.Workbook()
ws_item = wb_item.active
ws_item.title = "Item Master (Production)"

item_headers = [
    "Item Code", "Part Code", "Old Item Code", "Item Name", "Category",
    "Material Process Sources", "Preferred Vendors", "Preferred Vendor Names",
    "Unit", "Purchase UOM", "Conversion Factor", "In-House Stock", "External Stock",
    "Min Stock Qty", "Min Order Qty", "Unit Price", "Lead Time in Days", "Location",
    "QC Trigger", "Test Report Required", "Weight (Kg)", "Specification"
]

ws_item.append(item_headers)
for col_num in range(1, len(item_headers) + 1):
    cell = ws_item.cell(row=1, column=col_num)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

csv_item_rows = []
csv_item_rows.append(item_headers)

for it_key, it in sorted(items_dict.items(), key=lambda x: (x[1]['category'], x[1]['name'])):
    pcode = it['part_code']
    oldcode = it['old_code']
    name = it['name']
    cat = it['category']
    sources = it['sources']
    v_ids = it['vendors']
    v_names = "; ".join([VENDOR_NAMES.get(vid, vid) for vid in v_ids.split(';') if vid])
    uom = it['unit']
    puom = it['purchase_uom']
    cf = it['conv_factor']
    ihs = it['in_house_stock']
    exs = it['external_stock']
    mins = it['min_stock']
    mino = it['min_order']
    price = it['unit_price']
    lead = it['lead_time']
    loc = it['location']
    qc = it['qc_trigger']
    tr = "TRUE" if qc == 'ON_GRN' else "FALSE"
    wt = 45.0 if cat == 'RM' else (38.0 if cat == 'MC' else 1.5)
    spec = f"Standard {cat} specification for {name}"
    
    row_data = [
        pcode if pcode else f"ITEM-{abs(hash(name)) % 900000 + 100000}",
        pcode,
        oldcode,
        name,
        cat,
        sources,
        v_ids,
        v_names,
        uom,
        puom,
        cf,
        ihs,
        exs,
        mins,
        mino,
        price,
        lead,
        loc,
        qc,
        tr,
        wt,
        spec
    ]
    ws_item.append(row_data)
    csv_item_rows.append(row_data)
    
    r_idx = ws_item.max_row
    for c_idx in range(1, len(row_data) + 1):
        cell = ws_item.cell(row=r_idx, column=c_idx)
        cell.border = border_thin
        if c_idx in [1, 2, 3, 5, 9, 10, 17, 19, 20]:
            cell.alignment = center_align
        elif c_idx in [11, 12, 13, 14, 15, 16, 21]:
            cell.alignment = right_align
        else:
            cell.alignment = left_align

# Adjust column widths
for col in ws_item.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws_item.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb_item.save('data/item_master/new4_Item_Master_Generated.xlsx')
pd.DataFrame(csv_item_rows[1:], columns=csv_item_rows[0]).to_csv('data/item_master/new4_items_template.csv', index=False, encoding='utf-8')
print("Generated data/item_master/new4_Item_Master_Generated.xlsx & new4_items_template.csv")

# ==============================================================================
# 2. GENERATE new4_Process_Master_Generated.xlsx & new4_processes_template.csv
# ==============================================================================
wb_proc = openpyxl.Workbook()

# Sheet 1: Standard Process Operations
ws_pdef = wb_proc.active
ws_pdef.title = "Process Definitions"
pdef_headers = ["Process Code", "Process Short Code", "Operation Name", "Default Rate (INR)", "Default UOM", "Preferred Vendors", "Description"]
ws_pdef.append(pdef_headers)
for c in range(1, len(pdef_headers) + 1):
    cell = ws_pdef.cell(1, c)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

PROC_DEFS = [
    ("PROC-001", "MCH", "VMC Heavy Face Milling & Edge Truing", 850, "HOURS", "VEN0000002", "Rough and finish top/bottom platen faces to 0.02mm flatness"),
    ("PROC-002", "BOR", "Precision CNC Boring (Tie Bar & Bush Bores)", 1200, "HOURS", "VEN0000002", "Bore 4x Tie bar holes to H7 tolerance with high-speed boring bar"),
    ("PROC-003", "LAT", "CNC Heavy Turning & Precision Threading", 750, "HOURS", "VEN0000002", "Turn tie bar diameters, piston rods and thread cutting"),
    ("PROC-004", "DRL", "CNC Drilling & Tapping (PCD Clamp Holes)", 600, "HOURS", "VEN0000002", "M16/M20 mould clamp tapped holes and lubrication channels"),
    ("PROC-005", "HT", "Stress Relieving & Normalizing Heat Treatment", 18, "KG", "VEN0000004", "Thermal stress relieving at 550°C to prevent machining distortion"),
    ("PROC-006", "IND", "Induction Hardening & Gas Nitriding", 35, "KG", "VEN0000004", "Surface case hardening up to 55-60 HRC for wear surfaces"),
    ("PROC-007", "GRD", "Cylindrical & Precision Surface Grinding", 950, "HOURS", "VEN0000006", "Mirror finish grinding to Ra 0.2 micron surface roughness"),
    ("PROC-008", "PLT", "Hard Chrome Plating & Micro-Polishing", 120, "SQ_DM", "VEN0000007", "Hard chrome plating (25-30 microns) on tie bars & piston rods"),
    ("PROC-009", "HOB", "Gear Hobbing & Teeth Cutting", 800, "HOURS", "VEN0000005", "Precision hobbing of mould height adjustment sun gears & pinions"),
    ("PROC-010", "GGRD", "Precision Gear Teeth Profile Grinding", 1100, "HOURS", "VEN0000005", "DIN Class 6 gear teeth profile grinding for silent operation"),
    ("PROC-011", "ASM", "Sub-Assembly Fitting & Torque Tightening", 500, "HOURS", "", "In-house mechanical fitting, bearing mounting & torque tightening"),
    ("PROC-012", "QC", "Final Dimensional CMM & Alignment QC", 650, "HOURS", "", "Quality control inspection using Coordinate Measuring Machine"),
]

for p in PROC_DEFS:
    ws_pdef.append(list(p))
    r_idx = ws_pdef.max_row
    for c_idx in range(1, len(p) + 1):
        cell = ws_pdef.cell(r_idx, c_idx)
        cell.border = border_thin
        cell.alignment = center_align if c_idx in [1, 2, 4, 5, 6] else left_align

# Sheet 2: Sequential Process Routing Cards (Finished Item -> Raw Casting -> Steps)
ws_rcard = wb_proc.create_sheet(title="Item Process Cards (Routing)")
rcard_headers = [
    "Finished Part Code", "Finished Old Code", "Finished Item Name",
    "Raw Casting Part Code", "Raw Casting Old Code", "Raw Casting Name",
    "Step No", "Process Short Code", "Process Name", "Estimated Days", "Vendors", "Vendor Names", "Remarks"
]
ws_rcard.append(rcard_headers)
for c in range(1, len(rcard_headers) + 1):
    cell = ws_rcard.cell(1, c)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

csv_proc_rows = [rcard_headers]

# Build routing for machined items that have casting counterparts
for it_key, it in items_dict.items():
    if it['category'] == 'MC' or 'plate' in it['name'].lower() or 'bar' in it['name'].lower() or 'link' in it['name'].lower() or 'cross head' in it['name'].lower() or 'bracket' in it['name'].lower():
        f_pcode = it['part_code']
        f_old = it['old_code']
        f_name = it['name']
        
        # Find raw casting match
        raw_match = None
        for rk, ritem in items_dict.items():
            if ritem['category'] == 'RM' and (f_name.split('-')[0].strip().lower() in ritem['name'].lower() or (f_old and ritem['old_code'] and f_old[-3:] == ritem['old_code'][-3:])):
                raw_match = ritem
                break
        
        r_pcode = raw_match['part_code'] if raw_match else ""
        r_old = raw_match['old_code'] if raw_match else ""
        r_name = raw_match['name'] if raw_match else f"{f_name} (CASTING/RAW MATERIAL)"
        
        # 5 standard sequential steps
        steps = [
            (1, "MCH", "VMC Heavy Face Milling & Edge Truing", 2, "VEN0000002", "Apex Precision VMC Machinists", "Rough & finish top/bottom platen face to 0.02mm flat"),
            (2, "BOR", "Precision CNC Boring (Tie Bar & Bush Bores)", 3, "VEN0000002", "Apex Precision VMC Machinists", "Bore 4x Tie bar holes to H7 tolerance"),
            (3, "DRL", "CNC Drilling & Tapping (PCD Clamp Holes)", 1, "VEN0000002", "Apex Precision VMC Machinists", "M16 mould clamp tapped holes as per drawing"),
            (4, "HT", "Stress Relieving & Normalizing Heat Treatment", 2, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Normalize thermal stress at 550°C"),
            (5, "GRD", "Cylindrical & Precision Surface Grinding", 1, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Precision surface grind & rust preventive oil")
        ]
        
        for s in steps:
            row_data = [
                f_pcode, f_old, f_name,
                r_pcode, r_old, r_name,
                s[0], s[1], s[2], s[3], s[4], s[5], s[6]
            ]
            ws_rcard.append(row_data)
            csv_proc_rows.append(row_data)
            r_idx = ws_rcard.max_row
            for c_idx in range(1, len(row_data) + 1):
                cell = ws_rcard.cell(r_idx, c_idx)
                cell.border = border_thin
                cell.alignment = center_align if c_idx in [1, 2, 4, 5, 7, 8, 10, 11] else left_align

wb_proc.save('data/process_master/new4_Process_Master_Generated.xlsx')
pd.DataFrame(csv_proc_rows[1:], columns=csv_proc_rows[0]).to_csv('data/process_master/new4_processes_template.csv', index=False, encoding='utf-8')
print("Generated data/process_master/new4_Process_Master_Generated.xlsx & new4_processes_template.csv")

# ==============================================================================
# 3. GENERATE new4_BOM_Master_Generated.xlsx & new4_boms_template.csv
# ==============================================================================
wb_bom = openpyxl.Workbook()
ws_bom = wb_bom.active
ws_bom.title = "Master Multi-Level BOM"

bom_headers = [
    "BOM Code", "Machine Model / Assembly Name", "Version", "Sub-Assembly Block",
    "Item / Part Code", "Old Item Code", "Item Description", "Category",
    "BOM Qty Per Machine", "Unit", "Lead Time Days", "Scrap %", "Estimated Assembly Hours"
]

ws_bom.append(bom_headers)
for c in range(1, len(bom_headers) + 1):
    cell = ws_bom.cell(1, c)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

csv_bom_rows = [bom_headers]

bom_counter = 1
for blk_name, items in bom_structure.items():
    # Model name detection
    model_name = blk_name
    bom_code = f"BOM-GEC-{bom_counter:04d}"
    bom_counter += 1
    
    for it_row in items:
        p_code = it_row.get('new_code', '').strip()
        old_c = it_row.get('old_code', '').strip()
        name = it_row.get('name', '').strip()
        cls = it_row.get('class', '').strip().upper()
        qty = it_row.get('qty', 1.0)
        
        # Lookup lead time & category from resolved items_dict
        it_info = items_dict.get(p_code) or items_dict.get(name) or {}
        lead_val = it_info.get('lead_time', 10)
        cat_val = it_info.get('category', cls if cls else 'MC')
        uom_val = it_info.get('unit', 'NOS')
        
        row_data = [
            bom_code,
            model_name,
            "Rev 1.0",
            blk_name,
            p_code,
            old_c,
            name,
            cat_val,
            qty,
            uom_val,
            lead_val,
            0,
            2.5
        ]
        ws_bom.append(row_data)
        csv_bom_rows.append(row_data)
        r_idx = ws_bom.max_row
        for c_idx in range(1, len(row_data) + 1):
            cell = ws_bom.cell(r_idx, c_idx)
            cell.border = border_thin
            cell.alignment = center_align if c_idx in [1, 3, 5, 6, 8, 10, 11, 12] else (right_align if c_idx in [9, 13] else left_align)

for col in ws_bom.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws_bom.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb_bom.save('data/bom/new4_BOM_Master_Generated.xlsx')
pd.DataFrame(csv_bom_rows[1:], columns=csv_bom_rows[0]).to_csv('data/bom/new4_boms_template.csv', index=False, encoding='utf-8')
print("Generated data/bom/new4_BOM_Master_Generated.xlsx & new4_boms_template.csv")

# ==============================================================================
# 4. GENERATE new4_Inventory_Master_Generated.xlsx & new4_inventory_template.csv
# ==============================================================================
wb_inv = openpyxl.Workbook()
ws_inv = wb_inv.active
ws_inv.title = "Inventory Master & Stock"

inv_headers = [
    "Item Code", "Part Code", "Old Item Code", "Item Description", "Category",
    "In-House Physical Stock", "External Vendor Stock", "Total Current Stock",
    "Min Safety Stock Qty", "Min Order Qty", "Lead Time Days", "Warehouse Location",
    "Standard Valuation Rate (INR)", "Total Stock Asset Value (INR)", "QC Trigger"
]

ws_inv.append(inv_headers)
for c in range(1, len(inv_headers) + 1):
    cell = ws_inv.cell(1, c)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align

csv_inv_rows = [inv_headers]

for it_key, it in sorted(items_dict.items(), key=lambda x: (x[1]['category'], x[1]['name'])):
    pcode = it['part_code']
    oldcode = it['old_code']
    name = it['name']
    cat = it['category']
    ihs = it['in_house_stock']
    exs = it['external_stock']
    tot = ihs + exs
    mins = it['min_stock']
    mino = it['min_order']
    lead = it['lead_time']
    loc = it['location']
    price = it['unit_price']
    asset_val = tot * price
    qc = it['qc_trigger']
    
    row_data = [
        pcode if pcode else f"ITEM-{abs(hash(name)) % 900000 + 100000}",
        pcode,
        oldcode,
        name,
        cat,
        ihs,
        exs,
        tot,
        mins,
        mino,
        lead,
        loc,
        price,
        asset_val,
        qc
    ]
    ws_inv.append(row_data)
    csv_inv_rows.append(row_data)
    r_idx = ws_inv.max_row
    for c_idx in range(1, len(row_data) + 1):
        cell = ws_inv.cell(r_idx, c_idx)
        cell.border = border_thin
        cell.alignment = center_align if c_idx in [1, 2, 3, 5, 11, 15] else (right_align if c_idx in [6, 7, 8, 9, 10, 13, 14] else left_align)

for col in ws_inv.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws_inv.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb_inv.save('data/inventory/new4_Inventory_Master_Generated.xlsx')
pd.DataFrame(csv_inv_rows[1:], columns=csv_inv_rows[0]).to_csv('data/inventory/new4_inventory_template.csv', index=False, encoding='utf-8')
print("Generated data/inventory/new4_Inventory_Master_Generated.xlsx & new4_inventory_template.csv")

print("\n============================================================")
print("[SUCCESS] All 4 new sheets & CSV templates generated cleanly!")
print("============================================================")
