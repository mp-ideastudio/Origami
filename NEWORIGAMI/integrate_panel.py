import re

with open("NewOrigami.Panels.html", "r", encoding="utf-8") as f:
    panels_html = f.read()

with open("NewOrigami.5.html", "r", encoding="utf-8") as f:
    main_html = f.read()

# Extract from Panels
style_match = re.search(r'(<style>.*?</style>)', panels_html, re.DOTALL)
style_content = style_match.group(1) if style_match else ""

modal_match = re.search(r'(<div id="modal-overlay".*?>.*?</div>)', panels_html, re.DOTALL)
modal_content = modal_match.group(1) if modal_match else ""

dock_match = re.search(r'(<div id="ui-dock">.*?)\n\s*<script', panels_html, re.DOTALL)
dock_content = dock_match.group(1) if dock_match else ""
dock_content = dock_content.strip()

script_match = re.search(r'<script type="module">(.*?)</script>', panels_html, re.DOTALL)
script_content = script_match.group(1) if script_match else ""

# Post-process script
script_content = re.sub(r"import .*? from .*?;", "", script_content)
script_content = script_content.replace("new GLTFLoader()", "new THREE.GLTFLoader()")

# Now inject into NewOrigami.5.html

# 1. Insert style before </head>
main_html = main_html.replace('</head>', style_content + '\n</head>')

# 2. Add dark-mode to body
main_html = main_html.replace('class="neumorphic-body"', 'class="neumorphic-body dark-mode focus-active"')

# 3. Replace <div id="lower-ui-row"> ... </div> (the whole lower block) with modal + dock
# It's at the end of <div id="game-container">
start_idx = main_html.find('<div id="lower-ui-row">')
end_idx = main_html.find('</div>\n    </div>\n\n    <!-- Scripts -->')
if start_idx != -1 and end_idx != -1:
    main_html = main_html[:start_idx] + modal_content + '\n\n' + dock_content + '\n' + main_html[end_idx:]

# 4. Insert script before </body>
script_tag = f"\n<script>\n{script_content}\n</script>\n"
main_html = main_html.replace('</body>', script_tag + '</body>')

with open("NewOrigami.5.html", "w", encoding="utf-8") as f:
    f.write(main_html)

print("Integration complete")
