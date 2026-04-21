with open('/tmp/pip_html.html', 'r') as f:
    html = f.read()

with open('NewOrigami.Panels.html', 'r') as f:
    panels = f.read()

# Insert HTML into #ui-dock
panels = panels.replace('<div id="ui-dock">', '<div id="ui-dock">\n' + html, 1)

with open('NewOrigami.Panels.html', 'w') as f:
    f.write(panels)
