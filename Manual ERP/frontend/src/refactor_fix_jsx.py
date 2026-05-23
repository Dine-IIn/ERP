import os

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace {isExpanded && ( with {isExpanded &&
content = content.replace("{isExpanded && (", "{isExpanded && ")

# Replace </div>\n                              )} with </div>\n                              }
content = content.replace("</div>\n                              )}", "</div>\n                              }")

# Just in case the indentation is different for the first block
content = content.replace("</div>\n                              )}", "</div>\n                              }")
content = content.replace("</div>\n                                )}", "</div>\n                                }")
content = content.replace("</div>\n                               )}", "</div>\n                               }")
content = content.replace("</div>\n                                 )}", "</div>\n                                 }")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx fixed jsx syntax.")
