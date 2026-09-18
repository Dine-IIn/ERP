import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
import openpyxl

df_proc = pd.read_excel('data/process_master/new2_Process_Master_Generated.xlsx')
print(f"new2_Process_Master_Generated has {len(df_proc)} rows.")
print(df_proc.head(15))
print("\nUnique finished parts in new2_Process_Master:", df_proc['Finished Part Code'].nunique())
print(df_proc[['Finished Part Code', 'Finished Item Name', 'Raw Casting Part Code', 'Raw Casting Name']].drop_duplicates())
