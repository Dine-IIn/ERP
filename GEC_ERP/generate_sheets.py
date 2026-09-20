#!/usr/bin/env python3
"""
================================================================================
GEC ERP - Master Excel & CSV Generator Tool
================================================================================
Generates:
1. Item Master (Excel & CSV) with auto-generated sequential GEC0000001 codes
2. Process Master (Excel & CSV) with accurate tonnage-aware routing & 15 standard processes
3. BOM Master (Multi-Sheet Excel with all 46 BOMs & Flat CSV)
4. Inventory Master (Opening Stock & Location Templates)

Usage:
  python generate_sheets.py --source "1-ERP BOM 90-200 TON.xlsx" --prefix "new7_"
  or run interactively:
  python generate_sheets.py
"""

import sys, os, re, argparse
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from collections import defaultdict

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# 1. Vendor mapping reference
VENDORS = {
    'CASTING': 'VEN0000001;VEN0000003',
    'MACHINING': 'VEN0000002;VEN0000006',
    'HEAT_TREAT': 'VEN0000004',
    'GEAR': 'VEN0000005',
    'GRINDING': 'VEN0000006',
    'PLATING': 'VEN0000007',
    'HYDRAULIC': 'VEN0000008',
    'ELECTRICAL': 'VEN0000009',
    'SEAL': 'VEN0000010',
    'BOUGHTOUT': 'VEN0000011',
    'FASTENER': 'VEN0000012',
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

def parse_arguments():
    parser = argparse.ArgumentParser(description="GEC ERP Master Dataset Generator")
    parser.add_argument("--source", "-s", type=str, default=None, help="Path to source Excel workbook")
    parser.add_argument("--prefix", "-p", type=str, default=None, help="Output file prefix (e.g. new7_)")
    parser.add_argument("--outdir", "-o", type=str, default=".", help="Output directory path")
    args = parser.parse_args()

    source = args.source
    prefix = args.prefix
    outdir = args.outdir

    if not source:
        default_src = "1-ERP BOM 90-200 TON.xlsx"
        print("=" * 70)
        print("          GEC ERP MASTER SHEET GENERATOR (INTERACTIVE MODE)          ")
        print("=" * 70)
        user_src = input(f"Enter Source Master Excel path [Default: {default_src}]: ").strip()
        source = user_src if user_src else default_src

    if not prefix:
        default_pfx = "new7_"
        user_pfx = input(f"Enter Output Filename Prefix [Default: {default_pfx}]: ").strip()
        prefix = user_pfx if user_pfx else default_pfx

    return source, prefix, outdir

def main():
    source_file, prefix, outdir = parse_arguments()

    if not os.path.exists(source_file):
        print(f"❌ Error: Source file not found at '{source_file}'")
        sys.exit(1)

    print(f"\n📂 Loading source workbook: {source_file}")
    wb = openpyxl.load_workbook(source_file, data_only=True)

    font_title = Font(name='Segoe UI', size=11, bold=True, color='1F4E78')
    header_font = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
    border_thin = Border(
        left=Side(style='thin', color='D3D3D3'),
        right=Side(style='thin', color='D3D3D3'),
        top=Side(style='thin', color='D3D3D3'),
        bottom=Side(style='thin', color='D3D3D3')
    )
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')
    right_align = Alignment(horizontal='right', vertical='center')

    all_boms = []
    raw_items = []
    castings_map = {}

    # Extract Castings from CASTING sheets
    if 'CASTING-90-200 TON' in wb.sheetnames:
        ws_cast = wb['CASTING-90-200 TON']
        for start_col in [2, 8, 14, 20, 26, 32]:
            sec_title = ws_cast.cell(1, start_col).value or ''
            for r in range(3, 20):
                sr = ws_cast.cell(r, start_col).value
                old_c = ws_cast.cell(r, start_col + 1).value
                new_c = ws_cast.cell(r, start_col + 2).value
                desc = ws_cast.cell(r, start_col + 3).value
                cls = ws_cast.cell(r, start_col + 4).value
                if new_c and desc:
                    pcode = str(new_c).strip()
                    name = str(desc).strip()
                    old = str(old_c).strip() if old_c and str(old_c) != '-' else ''
                    cast_dict = {
                        'new_code': pcode,
                        'old_code': old,
                        'name': name,
                        'class': 'RM',
                        'section': sec_title
                    }
                    castings_map[pcode] = cast_dict
                    castings_map[name] = cast_dict
                    raw_items.append(cast_dict)

    for sname in wb.sheetnames:
        ws = wb[sname]
        if sname.startswith('PATTERN') or sname.startswith('CASTING'):
            continue

        header_rows = []
        for r in range(1, ws.max_row + 1):
            for c in range(1, ws.max_column + 1):
                val = ws.cell(r, c).value
                if val and 'SR' in str(val).upper():
                    header_rows.append(r)
                    break

        for hr in header_rows:
            title_r = hr - 1 if hr > 1 else 1
            col_indices = []
            for c in range(1, ws.max_column + 1):
                v = ws.cell(hr, c).value
                if v and 'SR' in str(v).upper():
                    col_indices.append(c)

            for idx, start_c in enumerate(col_indices):
                end_c = col_indices[idx + 1] - 1 if idx + 1 < len(col_indices) else ws.max_column
                title_val = None
                for tc in range(start_c, end_c + 1):
                    tv = ws.cell(title_r, tc).value
                    if tv and str(tv).strip() and not str(tv).strip().isdigit():
                        title_val = str(tv).strip()
                        break

                if not title_val:
                    for tc in range(start_c, 0, -1):
                        tv = ws.cell(title_r, tc).value
                        if tv and str(tv).strip() and not str(tv).strip().isdigit():
                            title_val = str(tv).strip()
                            break

                if not title_val or str(title_val).isdigit():
                    continue

                if title_val == 'BEARING HOUSING ASSY-280 [2000210200]' and start_c == 9 and sname == 'INJECTION UNIT-280':
                    title_val = '(B-10083) BEARING HOUSING ASSY - 420 [2000210500]'

                subheaders = []
                for c in range(start_c, end_c + 1):
                    sh = ws.cell(hr, c).value
                    if sh and str(sh).strip():
                        subheaders.append((c, str(sh).strip().replace('\n', ' ')))

                items = []
                for r in range(hr + 1, ws.max_row + 1):
                    if r in header_rows and r > hr:
                        break
                    item_dict = {}
                    for col_idx_val, sh_name in subheaders:
                        val = ws.cell(r, col_idx_val).value
                        val_str = str(val).strip() if val is not None else ''
                        sh_clean = sh_name.upper()
                        if 'OLD' in sh_clean: item_dict['old_code'] = val_str
                        elif 'NEW' in sh_clean or 'PART CODE' in sh_clean: item_dict['new_code'] = val_str
                        elif 'DECRIPTION' in sh_clean or 'DESCRIPTION' in sh_clean or 'NAME' in sh_clean: item_dict['name'] = val_str
                        elif 'QTY' in sh_clean:
                            try: item_dict['qty'] = float(val) if val is not None else 1.0
                            except: item_dict['qty'] = 1.0
                        elif 'UNIT' in sh_clean: item_dict['unit'] = val_str or 'NOS'
                        elif 'CLASS' in sh_clean: item_dict['class'] = val_str
                        elif 'REMARK' in sh_clean: item_dict['remarks'] = val_str

                    p_c = item_dict.get('new_code', '').strip()
                    n_m = item_dict.get('name', '').strip()
                    if (p_c and p_c != '-') or (n_m and n_m != '-'):
                        if not item_dict.get('unit'): item_dict['unit'] = 'NOS'
                        if not item_dict.get('qty'): item_dict['qty'] = 1.0
                        items.append(item_dict)
                        raw_items.append(item_dict)

                if len(items) > 0:
                    all_boms.append({
                        'sheet': sname,
                        'title': title_val,
                        'items': items
                    })

    print(f"✅ Total BOM blocks extracted: {len(all_boms)}")

    def get_category(cls, name):
        cls_u = (cls or '').upper().strip()
        if cls_u in ['AS', 'SA']: return 'AS'
        if cls_u in ['MC', 'MF', 'MACHINED']: return 'MC'
        if cls_u in ['RM', 'RAW', 'CASTING']: return 'RM'
        if cls_u in ['BO', 'BOUGHTOUT']: return 'BO'
        if cls_u in ['HY', 'HYDRAULIC']: return 'HY'
        if cls_u in ['EL', 'ELEC', 'ELECTRICAL']: return 'EL'
        if cls_u in ['FST', 'FASTENER']: return 'FST'
        if cls_u in ['PTN', 'PATTERN']: return 'PTN'
        name_l = (name or '').lower()
        if 'pattern' in name_l: return 'PTN'
        if 'casting' in name_l: return 'RM'
        if 'assy' in name_l or 'unit' in name_l: return 'AS'
        if 'valve' in name_l or 'pump' in name_l or 'cylinder' in name_l or 'manifold' in name_l: return 'HY'
        if 'bolt' in name_l or 'screw' in name_l or 'nut' in name_l or 'washer' in name_l or 'fastener' in name_l: return 'FST'
        if 'seal' in name_l or 'o-ring' in name_l: return 'BO'
        if 'plc' in name_l or 'sensor' in name_l or 'switch' in name_l or 'heater' in name_l: return 'EL'
        return 'MC'

    def get_qc_trigger(cat, name):
        cat = (cat or '').upper()
        name_l = (name or '').lower()
        if cat in ['BO', 'HY', 'EL', 'RM', 'PTN', 'FST']: return 'ON_GRN'
        if cat in ['AS']: return 'DURING_ASSEMBLY'
        if 'fastener' in name_l or 'washer' in name_l: return 'NO_QC'
        return 'ON_GRN'

    def get_lead_time(cat, name):
        cat = (cat or '').upper()
        if cat == 'PTN': return 25
        if cat == 'RM': return 20
        if cat == 'MC': return 10
        if cat == 'HY': return 15
        if cat == 'EL': return 15
        if cat == 'BO': return 10
        if cat == 'FST': return 3
        if cat == 'AS': return 5
        return 10

    def get_item_vendors(cat, name):
        cat = (cat or '').upper()
        name_l = (name or '').lower()
        if cat == 'RM' or 'casting' in name_l or cat == 'PTN': return VENDORS['CASTING']
        if cat == 'HY' or 'valve' in name_l or 'manifold' in name_l: return VENDORS['HYDRAULIC']
        if cat == 'EL' or 'plc' in name_l or 'sensor' in name_l: return VENDORS['ELECTRICAL']
        if cat == 'FST' or 'bolt' in name_l or 'nut' in name_l: return VENDORS['FASTENER']
        if 'seal' in name_l or 'o-ring' in name_l: return VENDORS['SEAL']
        if 'gear' in name_l: return VENDORS['GEAR']
        if cat == 'MC': return VENDORS['MACHINING']
        return VENDORS['BOUGHTOUT']

    items_dict = {}

    # Register Parent Assemblies
    for bom in all_boms:
        t = bom['title']
        m_part = re.search(r'\[([^\]]+)\]', t)
        m_old = re.search(r'\(([^)]+)\)', t)
        p_code = m_part.group(1).strip() if m_part else ''
        o_code = m_old.group(1).strip() if m_old else ''
        c_name = t
        if m_part: c_name = c_name.replace(f"[{m_part.group(1)}]", "")
        if m_old: c_name = c_name.replace(f"({m_old.group(1)})", "")
        c_name = c_name.strip()
        key = p_code if p_code else c_name

        if key not in items_dict:
            items_dict[key] = {
                'part_code': p_code if p_code else f"GEN-{len(items_dict)+1:06d}",
                'old_code': o_code,
                'name': c_name,
                'category': 'AS',
                'unit': 'NOS',
                'lead_time': 5,
                'qc_trigger': 'DURING_ASSEMBLY',
                'vendors': VENDORS['MACHINING'],
                'unit_price': 50000.0,
                'in_house': 0,
                'external': 0,
                'min_stock': 0,
                'min_order': 1,
                'location': 'BAY-ASSY-01',
                'spec': 'Complete Sub-Assembly'
            }

    # Register all Components
    for it in raw_items:
        p_code = it.get('new_code', '').strip()
        o_code = it.get('old_code', '').strip()
        name = it.get('name', '').strip()
        cls = it.get('class', '').strip()
        if not p_code and not name: continue
        key = p_code if (p_code and p_code != '-') else name
        if key not in items_dict:
            cat = get_category(cls, name)
            items_dict[key] = {
                'part_code': p_code if (p_code and p_code != '-') else f"GEN-{len(items_dict)+1:06d}",
                'old_code': o_code if o_code != '-' else '',
                'name': name,
                'category': cat,
                'unit': 'NOS',
                'lead_time': get_lead_time(cat, name),
                'qc_trigger': get_qc_trigger(cat, name),
                'vendors': get_item_vendors(cat, name),
                'unit_price': 1500.0 if cat == 'MC' else (5000.0 if cat == 'HY' else 250.0),
                'in_house': 10 if cat in ['BO', 'FST'] else 0,
                'external': 0,
                'min_stock': 5 if cat in ['BO', 'FST'] else 1,
                'min_order': 10 if cat in ['BO', 'FST'] else 1,
                'location': 'STORE-RACK-A1' if cat in ['BO', 'FST'] else 'SHOP-FLOOR',
                'spec': f"{cat} Component"
            }

    print(f"📦 Total Unique Items in Master: {len(items_dict)}")

    # Assign sequential GEC0000001 Item Codes
    for idx, (k, it) in enumerate(items_dict.items(), 1):
        it['item_code'] = f"GEC{idx:07d}"

    # =========================================================================
    # 1. GENERATE Item Master Excel & CSV
    # =========================================================================
    wb_items = openpyxl.Workbook()
    ws_items = wb_items.active
    ws_items.title = "Item Master"

    item_headers = [
        "Item Code", "Part Code", "Old Item Code", "Item Name", "Category",
        "Material / Process Sources", "Preferred Vendors", "Unit", "Purchase UOM", "Conversion Factor",
        "In-House Stock", "External Stock", "Min Stock Qty", "Min Order Qty", "Unit Price",
        "Lead Time Days", "Location", "QC Trigger", "Test Report Required", "Weight (Kg)", "Specification"
    ]
    ws_items.append(item_headers)
    for c in range(1, len(item_headers) + 1):
        cell = ws_items.cell(1, c)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    csv_item_rows = [item_headers]
    for k, it in items_dict.items():
        row_data = [
            it['item_code'],
            it['part_code'],
            it['old_code'],
            it['name'],
            it['category'],
            'In-House' if it['category'] == 'AS' else 'Outsourced Jobwork',
            it['vendors'],
            it['unit'],
            it['unit'],
            1.0,
            it['in_house'],
            it['external'],
            it['min_stock'],
            it['min_order'],
            it['unit_price'],
            it['lead_time'],
            it['location'],
            it['qc_trigger'],
            'YES' if it['qc_trigger'] == 'ON_GRN' else 'NO',
            0.0,
            it['spec']
        ]
        ws_items.append(row_data)
        csv_item_rows.append(row_data)
        r_idx = ws_items.max_row
        for c_idx in range(1, len(row_data) + 1):
            cell = ws_items.cell(r_idx, c_idx)
            cell.border = border_thin
            cell.alignment = center_align if c_idx in [1, 2, 3, 5, 8, 9, 10, 16, 17, 18, 19] else (right_align if c_idx in [11, 12, 13, 14, 15, 20] else left_align)

    for col in ws_items.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_items.column_dimensions[col_letter].width = max(max_len + 3, 12)

    item_xlsx = os.path.join(outdir, f"{prefix}Item_Master_Generated.xlsx")
    item_csv = os.path.join(outdir, f"{prefix}items_template.csv")
    wb_items.save(item_xlsx)
    pd.DataFrame(csv_item_rows[1:], columns=csv_item_rows[0]).to_csv(item_csv, index=False, encoding='utf-8')
    print(f"✨ Generated: {item_xlsx} & {item_csv}")

    # =========================================================================
    # 2. GENERATE Process Master Excel & CSV
    # =========================================================================
    wb_proc = openpyxl.Workbook()
    ws_pdef = wb_proc.active
    ws_pdef.title = "Process Definitions"

    pdef_headers = ["Process ID", "Short Code", "Process Name", "Base Cost", "Cost Unit", "Default Vendor", "Description"]
    ws_pdef.append(pdef_headers)
    for c in range(1, len(pdef_headers) + 1):
        cell = ws_pdef.cell(1, c)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    PROC_DEFS = [
        ("PROC-001", "CST", "Sand / Shell Mould Casting", 120, "KG", "VEN0000001", "Heavy SG Iron and Cast Iron foundry casting with test certificates"),
        ("PROC-002", "MCH", "Heavy VMC Face & Profile Milling", 1200, "HOURS", "VEN0000002", "Heavy platen face milling, edge truing and reference surface finishing"),
        ("PROC-003", "BOR", "Precision CNC Line Boring (H7)", 1500, "HOURS", "VEN0000002", "High precision 4-axis boring of tie bar holes and pivot pin bores to H7"),
        ("PROC-004", "DRL", "CNC Pattern Drilling & Tapping (PCD)", 850, "HOURS", "VEN0000002", "Drilling and tapping of mould clamp holes, ejector holes and oil ports"),
        ("PROC-005", "HT", "Stress Relieving & Normalizing Heat Treatment", 25, "KG", "VEN0000004", "Thermal stress relieving in controlled furnace at 550-600°C"),
        ("PROC-006", "NIT", "Deep Gas Nitriding & Hardening (65-68 HRC)", 45, "KG", "VEN0000004", "Deep gas nitriding surface hardening to 65-68 HRC, case depth 0.5-0.6mm"),
        ("PROC-007", "IND", "Medium Frequency Induction Hardening", 35, "KG", "VEN0000004", "Surface case hardening up to 52-56 HRC for tie bars & piston rods"),
        ("PROC-008", "GRD", "Precision Cylindrical & Surface Grinding", 950, "HOURS", "VEN0000006", "Mirror finish cylindrical and surface grinding to Ra 0.2 micron"),
        ("PROC-009", "PLT", "Hard Chrome Plating (25-30 Microns)", 120, "SQ_DM", "VEN0000007", "Hard chrome plating (25-30 microns) and micro-polishing for corrosion resistance"),
        ("PROC-010", "HOB", "Precision Gear Hobbing & Pinion Cutting", 800, "HOURS", "VEN0000005", "Precision hobbing of mould height adjustment sun gears & pinions (DIN Class 8)"),
        ("PROC-011", "GGRD", "DIN Class 6 Gear Teeth Profile Grinding", 1100, "HOURS", "VEN0000005", "DIN Class 6 gear teeth profile grinding for silent operation"),
        ("PROC-012", "GNDR", "Deep Hole Gun Drilling & Trepanning", 1400, "HOURS", "VEN0000002", "Deep hole gun drilling and trepanning for plasticizing injection barrels"),
        ("PROC-013", "HON", "Deep Hole Diamond Honing (Ra 0.1 µm)", 1000, "HOURS", "VEN0000006", "Precision vertical diamond honing to H7 tolerance and Ra 0.1 micron"),
        ("PROC-014", "SCRM", "CNC Variable Pitch Screw Flight Whirling", 1600, "HOURS", "VEN0000002", "CNC flight whirling of feed, compression, metering and mixing barrier zones"),
        ("PROC-015", "BSH", "Phosphor Bronze Bushing Press-Fit & Honing", 600, "HOURS", "VEN0000002", "Phosphor bronze bushing hydraulic press-fitting and finish diamond honing"),
    ]

    for p in PROC_DEFS:
        ws_pdef.append(list(p))
        r_idx = ws_pdef.max_row
        for c_idx in range(1, len(p) + 1):
            cell = ws_pdef.cell(r_idx, c_idx)
            cell.border = border_thin
            cell.alignment = center_align if c_idx in [1, 2, 4, 5, 6] else left_align

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

    def map_raw_material(item):
        name = str(item['name']).upper()
        if 'STATIONARY PLATE' in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    for cp, c in castings_map.items():
                        if 'STATIONARY PLATE' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'MOVING PLATE' in name and 'WIPER' not in name and 'BUSH' not in name and 'SLIDING' not in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    for cp, c in castings_map.items():
                        if 'MOVING PLATE' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'END PLATE' in name and 'HEAT' not in name and 'CAP' not in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    for cp, c in castings_map.items():
                        if 'END PLATE' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'CROSS HEAD' in name or 'CROSSHEAD' in name:
            if 'LINK' not in name and 'PIN' not in name and 'GUIDE' not in name and 'BUSH' not in name and 'BRACKET' not in name and 'STOP' not in name:
                for t in ['200', '170', '140', '110', '90']:
                    if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                        for cp, c in castings_map.items():
                            if 'CROSS HEAD' in c['name'].upper() and 'LINK' not in c['name'].upper() and f'{t} TON' in c['name'].upper():
                                return c.get('new_code', ''), c.get('old_code', ''), c['name']
            elif 'LINK' in name:
                for t in ['200', '170', '140', '110', '90']:
                    if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                        for cp, c in castings_map.items():
                            if 'CROSS HEAD LINK' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                                return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'BINARY LINK' in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    for cp, c in castings_map.items():
                        if 'BINARY LINK' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'TERNARY LINK' in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    target_t = '140' if t == '170' else t
                    for cp, c in castings_map.items():
                        if 'TERNARY LINK' in c['name'].upper() and f'{target_t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'SUN GEAR' in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    for cp, c in castings_map.items():
                        if 'SUN GEAR' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'GEAR NUT RETAINER' in name:
            for t in ['200', '170', '140', '110', '90']:
                if f'{t} TON' in name or f'{t}-' in name or f'{t} ' in name:
                    for cp, c in castings_map.items():
                        if 'GEAR NUT RETAINER' in c['name'].upper() and f'{t} TON' in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'DIE HEIGHT MOTOR MTG BRACKET' in name:
            for cp, c in castings_map.items():
                if 'DIE HEIGHT MOTOR MTG BRACKET' in c['name'].upper():
                    return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'BARREL PLATE' in name and 'ASSY' not in name:
            for sz in ['2350', '1520', '905', '635', '420', '280']:
                if f'PLATE - {sz}' in name or f'PLATE -{sz}' in name or f' {sz}' in name:
                    for cp, c in castings_map.items():
                        if 'BARREL PLATE' in c['name'].upper() and sz in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'BEARING HOUSING' in name:
            for sz in ['2350', '1520', '905', '635', '280']:
                if sz in name:
                    for cp, c in castings_map.items():
                        if 'BEARING HOUSING' in c['name'].upper() and sz in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'INJECTION CYLINDER ROD NUT RETAINER' in name:
            for sz in ['2350', '1520', '905', '635', '280']:
                if sz in name:
                    for cp, c in castings_map.items():
                        if 'INJECTION CYLINDER ROD NUT RETAINER' in c['name'].upper() and sz in c['name'].upper():
                            return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'INJECTION GUIDE ROD SUPPORT' in name:
            if '905' in name or '70' in name:
                for cp, c in castings_map.items():
                    if 'INJECTION GUIDE ROD SUPPORT' in c['name'].upper() and ('905' in c['name'] or '70' in c['name']):
                        return c.get('new_code', ''), c.get('old_code', ''), c['name']
            else:
                for cp, c in castings_map.items():
                    if 'INJECTION GUIDE ROD SUPPORT' in c['name'].upper() and ('280' in c['name'] or '60' in c['name']):
                        return c.get('new_code', ''), c.get('old_code', ''), c['name']
        if 'EJECTOR PLATE' in name and 'GUIDE' not in name and 'TOGGLE' in name:
            for cp, c in castings_map.items():
                if 'EJECTOR PLATE' in c['name'].upper():
                    return c.get('new_code', ''), c.get('old_code', ''), c['name']

        raw_desc = item['name']
        if 'TIE BAR' in name and 'NUT' not in name and 'PLATE' not in name:
            return '', '', f"EN19 / 42CrMo4 ROUND BAR (FORGED & PEEL-TURNED) FOR {raw_desc}"
        elif 'SCREW' in name and ('BARREL' not in name or 'SCREW' in name) and 'KEY' not in name and 'TIP' not in name and 'COUPLING' not in name and 'SHAFT' not in name:
            return '', '', f"EN41B / 38CrMoAl ALLOY STEEL ROUND BAR (GAS NITRIDING GRADE) FOR {raw_desc}"
        elif 'BARREL' in name and 'NUT' not in name and 'PLATE' not in name and 'LOCK' not in name and 'ADAPT' not in name:
            return '', '', f"EN41B FORGED SEAMLESS CYLINDER BARREL FOR {raw_desc}"
        elif 'GEAR NUT' in name:
            return '', '', f"20MnCr5 CASE HARDENING STEEL BILLET FOR {raw_desc}"
        elif 'BUSH' in name:
            return '', '', f"SAE 660 / CuSn7ZnPb CONTINUOUS CAST BRONZE HOLLOW BAR FOR {raw_desc}"
        elif 'PISTON' in name:
            return '', '', f"EN8D / C45 FORGED ROUND BILLET FOR {raw_desc}"
        elif 'CYLINDER FRONT CAP' in name or 'CYLINDER END CAP' in name:
            return '', '', f"EN8D / C45 FORGED FLANGE FOR {raw_desc}"
        elif 'CYLINDER ROD' in name or 'GUIDE ROD' in name:
            return '', '', f"EN8D / CK45 INDUCTION HARDENED CHROME STEEL ROD FOR {raw_desc}"
        elif 'MANIFOLD' in name:
            return '', '', f"C45 / HYDRAULIC STEEL MANIFOLD BLOCK FOR {raw_desc}"
        else:
            return '', '', f"RAW STOCK / FORGING FOR {raw_desc}"

    for it_key, it in items_dict.items():
        if it['category'] != 'MC':
            continue
        f_pcode = it['part_code']
        f_old = it['old_code']
        f_name = it['name']
        name_u = f_name.upper()
        r_pcode, r_old, r_name = map_raw_material(it)

        if r_pcode and ('PLATE' in name_u):
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 2, "VEN0000002", "Apex Precision VMC Machinists", "Rough & finish top/bottom platen face to 0.02mm flat"),
                (2, "BOR", "Precision CNC Line Boring (H7)", 3, "VEN0000002", "Apex Precision VMC Machinists", "Bore 4x Tie bar holes to H7 tolerance"),
                (3, "DRL", "CNC Pattern Drilling & Tapping (PCD)", 1, "VEN0000002", "Apex Precision VMC Machinists", "M16/M20 mould clamp tapped holes as per drawing"),
                (4, "HT", "Stress Relieving & Normalizing Heat Treatment", 2, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Normalize thermal stress at 550°C"),
                (5, "GRD", "Precision Cylindrical & Surface Grinding", 1, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Precision surface grind to Ra 0.4 µm & rust preventive oil")
            ]
        elif r_pcode and ('LINK' in name_u or 'CROSS' in name_u):
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 2, "VEN0000002", "Apex Precision VMC Machinists", "Side faces, triangular profile and pivot bosses milled on 4-axis CNC"),
                (2, "BOR", "Precision CNC Line Boring (H7)", 2, "VEN0000002", "Apex Precision VMC Machinists", "Line bore pivot pin holes with 0.015mm center-to-center pitch accuracy"),
                (3, "NIT", "Deep Gas Nitriding & Hardening (65-68 HRC)", 2, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Gas nitriding 500-600 HV case depth 0.3mm"),
                (4, "BSH", "Phosphor Bronze Bushing Press-Fit & Honing", 1, "VEN0000002", "Apex Precision VMC Machinists", "Phosphor bronze bushing press fit and ID diamond honing")
            ]
        elif 'SUN GEAR' in name_u:
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 2, "VEN0000002", "Apex Precision VMC Machinists", "CNC turning OD, ID bore and mounting face"),
                (2, "HOB", "Precision Gear Hobbing & Pinion Cutting", 3, "VEN0000005", "Maruti Precision Gear Works", "Precision gear hobbing as per DIN Class 8 standard"),
                (3, "HT", "Stress Relieving & Normalizing Heat Treatment", 2, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Case hardening teeth to 58-62 HRC, core 32 HRC"),
                (4, "GGRD", "DIN Class 6 Gear Teeth Profile Grinding", 2, "VEN0000005", "Maruti Precision Gear Works", "DIN Class 6 profile grinding for silent operation")
            ]
        elif 'SCREW' in name_u and 'BARREL' not in name_u and 'FEED' not in name_u and 'TIP' not in name_u and 'KEY' not in name_u and 'COUPLING' not in name_u and 'SHAFT' not in name_u:
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 3, "VEN0000002", "Apex Precision VMC Machinists", "Rough turning EN41B round bar, internal cooling bore"),
                (2, "SCRM", "CNC Variable Pitch Screw Flight Whirling", 4, "VEN0000002", "Apex Precision VMC Machinists", "CNC flight whirling compression, metering & barrier zones"),
                (3, "NIT", "Deep Gas Nitriding & Hardening (65-68 HRC)", 3, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Gas nitriding to 65-68 HRC, 0.55mm case depth"),
                (4, "PLT", "Hard Chrome Plating (25-30 Microns)", 2, "VEN0000007", "Hard Chrome Plating Corporation", "Flash hard chrome plating 0.025mm for wear & chemical resistance"),
                (5, "GRD", "Precision Cylindrical & Surface Grinding", 2, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Super-finish flight polish to Ra 0.2 µm")
            ]
        elif 'BARREL' in name_u and 'PLATE' not in name_u and 'ASSY' not in name_u and 'ADAPT' not in name_u and 'NUT' not in name_u and 'LOCK' not in name_u:
            steps = [
                (1, "GNDR", "Deep Hole Gun Drilling & Trepanning", 4, "VEN0000002", "Apex Precision VMC Machinists", "Gun drill seamless forged EN41B cylinder bar to rough ID"),
                (2, "HON", "Deep Hole Diamond Honing (Ra 0.1 µm)", 3, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Vertical deep-hole diamond honing to H7 tolerance"),
                (3, "NIT", "Deep Gas Nitriding & Hardening (65-68 HRC)", 4, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Deep nitriding ID surface to 68 HRC, 0.6mm case depth"),
                (4, "MCH", "Heavy VMC Face & Profile Milling", 2, "VEN0000002", "Apex Precision VMC Machinists", "Feed throat opening, thermocouple wells and flange threading"),
                (5, "HON", "Deep Hole Diamond Honing (Ra 0.1 µm)", 2, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Final internal mirror honing to Ra 0.1 µm")
            ]
        elif 'TIE BAR' in name_u or 'GUIDE ROD' in name_u or 'PISTON ROD' in name_u or 'CYLINDER ROD' in name_u:
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 3, "VEN0000002", "Apex Precision VMC Machinists", "Rough turn OD leaving 0.8mm grinding allowance"),
                (2, "MCH", "Heavy VMC Face & Profile Milling", 2, "VEN0000002", "Apex Precision VMC Machinists", "Precision buttress thread whirling for split nut clamping"),
                (3, "IND", "Medium Frequency Induction Hardening", 3, "VEN0000004", "Gujarat Heat Treaters & Nitriding", "Full length induction hardening to 52-56 HRC, 2.5mm depth"),
                (4, "GRD", "Precision Cylindrical & Surface Grinding", 2, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Centerless cylindrical grinding to h6 tolerance, straightness 0.02/m"),
                (5, "PLT", "Hard Chrome Plating (25-30 Microns)", 3, "VEN0000007", "Hard Chrome Plating Corporation", "Hard chrome plating (25-30 microns) & mirror polish to Ra 0.15 µm")
            ]
        elif 'BUSH' in name_u:
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 1, "VEN0000002", "Apex Precision VMC Machinists", "Rough & finish turning OD/ID and lubrication grooves"),
                (2, "HON", "Deep Hole Diamond Honing (Ra 0.1 µm)", 1, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Diamond honing internal bore to H7 tolerance"),
                (3, "GRD", "Precision Cylindrical & Surface Grinding", 1, "VEN0000006", "Sardar Cylindrical & Surface Grinding", "Finish OD grinding to m6 fit")
            ]
        else:
            steps = [
                (1, "MCH", "Heavy VMC Face & Profile Milling", 2, "VEN0000002", "Apex Precision VMC Machinists", "CNC turning and facing register bore to tolerance"),
                (2, "BOR", "Precision CNC Line Boring (H7)", 2, "VEN0000002", "Apex Precision VMC Machinists", "Line boring spigot and locating bores to H7"),
                (3, "DRL", "CNC Pattern Drilling & Tapping (PCD)", 1, "VEN0000002", "Apex Precision VMC Machinists", "PCD drilling and tapped mounting ports")
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

    for ws_curr in [ws_pdef, ws_rcard]:
        for col in ws_curr.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws_curr.column_dimensions[col_letter].width = max(max_len + 3, 12)

    proc_xlsx = os.path.join(outdir, f"{prefix}Process_Master_Generated.xlsx")
    proc_csv = os.path.join(outdir, f"{prefix}processes_template.csv")
    wb_proc.save(proc_xlsx)
    pd.DataFrame(csv_proc_rows[1:], columns=csv_proc_rows[0]).to_csv(proc_csv, index=False, encoding='utf-8')
    print(f"✨ Generated: {proc_xlsx} & {proc_csv}")

    # =========================================================================
    # 3. GENERATE BOM Master Multi-Sheet Excel & Flat CSV
    # =========================================================================
    wb_bom = openpyxl.Workbook()
    wb_bom.remove(wb_bom.active)

    flat_bom_headers = [
        "BOMCode", "MachineModel", "Version", "ItemCode", "ItemName",
        "SubAssemblyTag", "QtyPerMachine", "Unit", "ScrapPercent", "EstHoursPerUnit"
    ]
    csv_flat_bom_rows = [flat_bom_headers]

    print(f"🔨 Generating {len(all_boms)} individual BOM sheets...")

    for blk_idx, bom in enumerate(all_boms, 1):
        block_title = bom['title']
        b_items = bom['items']
        s_title = block_title
        for token in ['(INJECTION UNIT GUIDE ROD TYPE)', 'GUIDE ROD TYPE', 'TOGGLE TYPE', '(STOCK-150)', '(STOCK-175)', '(STOCK-210)', '(STOCK-245)', '(STOCK-280)', '(STOCK-295)', '(STOCK-315)', '(STOCK-325)']:
            s_title = s_title.replace(token, '')
        s_title = re.sub(r'\[.*?\]', '', s_title)
        s_title = re.sub(r'\(.*?\)', '', s_title)
        s_title = re.sub(r'[^A-Za-z0-9\-\s]', '', s_title).strip()
        s_title = re.sub(r'\s+', ' ', s_title)

        m_code = re.search(r'\[(.*?)\]', block_title)
        p_code = m_code.group(1).strip() if m_code else ''
        sheet_name_clean = f"{s_title[:20]} {p_code}" if p_code else s_title[:28]
        sheet_name_clean = sheet_name_clean[:31]

        if sheet_name_clean in wb_bom.sheetnames:
            sheet_name_clean = f"{sheet_name_clean[:27]}_{blk_idx}"[:31]

        ws_b = wb_bom.create_sheet(title=sheet_name_clean)
        ws_b.cell(1, 1, block_title).font = font_title

        bom_headers = ["Part Code", "Old Part Code", "Item Description", "QTY", "Unit", "Class", "Lead Time Days"]
        ws_b.append([])
        ws_b.append(bom_headers)
        for c in range(1, len(bom_headers) + 1):
            cell = ws_b.cell(3, c)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align

        bom_code = f"BOM-{blk_idx:04d}"
        for it in b_items:
            p_c = it.get('new_code', '').strip()
            o_c = it.get('old_code', '').strip()
            n_m = it.get('name', '').strip()
            qty = it.get('qty', 1.0)
            u = it.get('unit', 'NOS')
            cls = it.get('class', 'MC')
            lead = 10 if cls in ['MC', 'RM'] else (15 if cls in ['HY', 'EL'] else 5)

            ws_b.append([p_c, o_c if o_c != '-' else '', n_m, qty, u, cls, lead])
            r_idx = ws_b.max_row
            for c_idx in range(1, 8):
                cell = ws_b.cell(r_idx, c_idx)
                cell.border = border_thin
                cell.alignment = center_align if c_idx in [1, 2, 4, 5, 6, 7] else left_align

            csv_flat_bom_rows.append([
                bom_code,
                block_title,
                "v1.0",
                p_c,
                n_m,
                "Main Assembly",
                qty,
                u,
                0.0,
                0.5
            ])

        for col in ws_b.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws_b.column_dimensions[col_letter].width = max(max_len + 3, 12)

    bom_xlsx = os.path.join(outdir, f"{prefix}BOM_Master_Generated.xlsx")
    bom_csv = os.path.join(outdir, f"{prefix}boms_template.csv")
    wb_bom.save(bom_xlsx)
    pd.DataFrame(csv_flat_bom_rows[1:], columns=csv_flat_bom_rows[0]).to_csv(bom_csv, index=False, encoding='utf-8')
    print(f"✨ Generated: {bom_xlsx} & {bom_csv}")

    # =========================================================================
    # 4. GENERATE Inventory Master Excel & CSV
    # =========================================================================
    wb_inv = openpyxl.Workbook()
    ws_inv = wb_inv.active
    ws_inv.title = "Inventory Master"

    inv_headers = [
        "Item Code", "Part Code", "Old Item Code", "Item Name", "Category",
        "Opening In-House Stock", "Opening External Stock", "Unit",
        "Warehouse Location", "Min Stock Level", "Max Stock Level",
        "Standard Cost", "Valuation Method"
    ]
    ws_inv.append(inv_headers)
    for c in range(1, len(inv_headers) + 1):
        cell = ws_inv.cell(1, c)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    csv_inv_rows = [inv_headers]
    for k, it in items_dict.items():
        row_data = [
            it['item_code'],
            it['part_code'],
            it['old_code'],
            it['name'],
            it['category'],
            it['in_house'],
            it['external'],
            it['unit'],
            it['location'],
            it['min_stock'],
            it['min_stock'] * 10,
            it['unit_price'],
            "FIFO"
        ]
        ws_inv.append(row_data)
        csv_inv_rows.append(row_data)
        r_idx = ws_inv.max_row
        for c_idx in range(1, len(row_data) + 1):
            cell = ws_inv.cell(r_idx, c_idx)
            cell.border = border_thin
            cell.alignment = center_align if c_idx in [1, 2, 3, 5, 8, 9, 13] else (right_align if c_idx in [6, 7, 10, 11, 12] else left_align)

    for col in ws_inv.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_inv.column_dimensions[col_letter].width = max(max_len + 3, 12)

    inv_xlsx = os.path.join(outdir, f"{prefix}Inventory_Master_Generated.xlsx")
    inv_csv = os.path.join(outdir, f"{prefix}inventory_template.csv")
    wb_inv.save(inv_xlsx)
    pd.DataFrame(csv_inv_rows[1:], columns=csv_inv_rows[0]).to_csv(inv_csv, index=False, encoding='utf-8')
    print(f"✨ Generated: {inv_xlsx} & {inv_csv}")

    print("\n" + "=" * 70)
    print("🎉 ALL MASTER WORKBOOKS & CSV TEMPLATES GENERATED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
