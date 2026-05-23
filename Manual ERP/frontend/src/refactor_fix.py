import os

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I opened `{isExpanded && (`
# I need to close it with `)}` after the grid grid-cols-1 ends.
# We have two instances of:
#                                 })}
#                               </div>
#                             </div>
#                           );
#                         })}

end_old = """                                })}
                              </div>
                            </div>
                          );
                        })}"""

end_new = """                                })}
                              </div>
                              )}
                            </div>
                          );
                        })}"""

content = content.replace(end_old, end_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx fixed.")
