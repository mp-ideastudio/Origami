import re

with open("NewOrigami.5.html", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove the injected style from <head>. The style block from Panels
style_match = re.search(r'<style>\s*:root \{.*?/\* DARKENED ELEMENTAL AAA PALETTE \*/.*?</style>', text, re.DOTALL)
if style_match:
    text = text.replace(style_match.group(0), "")

# 2. Revert dark-mode
text = text.replace('class="neumorphic-body dark-mode focus-active"', 'class="neumorphic-body"')

# 3. Remove injected modal and dock and replace with Iframe
dock_regex = re.search(r'<div id="modal-overlay" onclick="closeModal\(\)">(.*?)</div>\n\n\s*<div id="ui-dock">.*?</div>\n    </div>', text, re.DOTALL)
if dock_regex:
    text = text.replace(dock_regex.group(0), '<iframe src="NewOrigami.Panels.html" id="ui-iframe" style="position: absolute; top:0; left:0; width:100%; height:100%; border:none; background:transparent; pointer-events:none; z-index: 10000;"></iframe>\n    </div>')
else:
    # Let's try simpler regex
    start = text.find('<div id="modal-overlay" onclick="closeModal()"></div>')
    end = text.find('<!-- Scripts -->')
    if start != -1 and end != -1:
        text = text[:start] + '<iframe src="NewOrigami.Panels.html" id="ui-iframe" style="position: absolute; top:0; left:0; width:100%; height:100%; border:none; background:transparent; z-index: 10000; pointer-events: none;"></iframe>\n    </div>\n\n    ' + text[end:]

# 4. Remove injected script
script_start = text.find('<script>\n\n        \n        \n\n        // Fix for missing toggleRing action buttons')
script_end = text.find('</script>\n</body>')
if script_start != -1 and script_end != -1:
    text = text[:script_start] + text[script_end+10:]

with open("NewOrigami.5.html", "w", encoding="utf-8") as f:
    f.write(text)

print("Reverted NewOrigami.5.html successfully")
