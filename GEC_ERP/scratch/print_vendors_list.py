import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd

df_ven = pd.read_excel('data/vendor/Vendor_Master_Generated.xlsx')
for idx, r in df_ven.iterrows():
    print(f"{r['Vendor Code']}: {r['Vendor Name']}")
