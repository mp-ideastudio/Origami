import re

# Read Panel file
with open('NewOrigami.Panels.html', 'r', encoding='utf-8') as f:
    panels_html = f.read()

# Read FPV file
with open('FPV.2.html', 'r', encoding='utf-8') as f:
    fpv_html = f.read()

print("Files read successfully.")

# Extract styles from panels
styles_match = re.search(r'<style>(.*?)</style>', panels_html, re.DOTALL)
styles_to_inject = styles_match.group(1).strip() if styles_match else ""

# Extract DOM tree from panels (body content up to the script)
# We want '<div id="modal-overlay"' up to the end of '<div id="ui-dock">'
body_match = re.search(r'(<div id="modal-overlay".*?<div id="ui-dock">.*?)\s*<script type="module">', panels_html, re.DOTALL)
if body_match:
    ui_dom_to_inject = body_match.group(1).strip()
    # Let's fix the regex to assure we get the full ui-dock. Since we know script comes right after ui-dock ends.
else:
    # Manual slicing if regex fails
    start_idx = panels_html.find('<div id="modal-overlay"')
    end_idx = panels_html.find('<script type="module">')
    ui_dom_to_inject = panels_html[start_idx:end_idx].strip()

# Extract Panel Scripts
script_start = panels_html.find('<script type="module">')
script_end = panels_html.rfind('</script>')
script_to_inject = panels_html[script_start:script_end + 9]

print("Extracted Styles: ", len(styles_to_inject), "bytes")
print("Extracted HTML: ", len(ui_dom_to_inject), "bytes")
print("Extracted Scripts:", len(script_to_inject), "bytes")

# --- MODIFY FPV.2.HTML ---

# 1. Inject Styles
# FPV.2.html has multiple style tags. We'll append before </head>
fpv_html = fpv_html.replace('</head>', f'\n    <style>\n/* --- NEUMORPHIC UI PANELS CSS --- */\n{styles_to_inject}\n    </style>\n  </head>')

# 2. Remove old movement overlay
# It's an exact string we know
old_keypad_regex = re.compile(r'<!-- Movement Keypad overlay pinned to FPV top-center \(001\.E pattern\) -->.*?</div>\s*</div>', re.DOTALL)
fpv_html = old_keypad_regex.sub('<!-- Old Movement Keypad Removed -->', fpv_html)

# 3. Remove old combat modals
# <div id="dnd-game-combat-modal" ... up to </div>\n</div>\n</div>
combat_modal_regex = re.compile(r'<!-- Modals -->\s*<div id="dnd-game-combat-modal".*?</div>\s*</div>\s*</div>', re.DOTALL)
fpv_html = combat_modal_regex.sub('<!-- Old Combat Modal Removed -->', fpv_html)

# <div id="dnd-glass-combat-overlay"... up to </div>\n</div>\n</div>
glass_combat_regex = re.compile(r'<!-- Glass Combat UI -->\s*<div id="dnd-glass-combat-overlay".*?</div>\s*</div>\s*</div>', re.DOTALL)
fpv_html = glass_combat_regex.sub('<!-- Old Glass Combat Modal Removed -->', fpv_html)

# 4. Inject new UI DOM
# Let's inject it into `<div id="dnd-game-main-view">` near the bottom, just before the closing </div>
# Finding the end of dnd-game-main-view is tricky. Let's append right before </body>, 
# since #ui-dock is absolute positioned and fills the screen.
fpv_html = fpv_html.replace('</body>', f'\n{ui_dom_to_inject}\n\n<!-- PANEL MODULE SCRIPT -->\n{script_to_inject}\n</body>')

# Save
with open('FPV.2.html', 'w', encoding='utf-8') as f:
    f.write(fpv_html)

print("Modification complete.")
