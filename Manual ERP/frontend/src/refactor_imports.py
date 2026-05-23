import re

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix socket.io-client
content = content.replace("import {\n  Wrench,\n  Factory,\n  ShoppingCart,\n  Box, io, Socket } from 'socket.io-client';", "import { io, Socket } from 'socket.io-client';")

# Fix ./features
content = content.replace("import {\n  Wrench,\n  Factory,\n  ShoppingCart,\n  Box, MASTER_FEATURES_HIERARCHY, getCategoryKeys, getChildKeys, getParentKey } from './features';", "import { MASTER_FEATURES_HIERARCHY, getCategoryKeys, getChildKeys, getParentKey } from './features';")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Imports cleaned up.")
