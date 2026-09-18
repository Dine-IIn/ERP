import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd

df_ven = pd.read_excel('data/vendor/Vendor_Master_Generated.xlsx')
print("=== VENDOR MASTER ===")
print(df_ven)
