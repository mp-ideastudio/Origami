import os

with open('/tmp/pip_css.css', 'r') as f:
    css = f.read()

with open('/tmp/pip_html.html', 'r') as f:
    html = f.read()

with open('NewOrigami.Panels.html', 'r') as f:
    panels = f.read()

# Insert CSS into Panels
panels = panels.replace('    </style>', css + '\n    </style>', 1)

# Insert HTML into #main-container
panels = panels.replace('<div id="main-container">', '<div id="main-container">\n' + html, 1)

with open('NewOrigami.Panels.html', 'w') as f:
    f.write(panels)

with open('NewOrigami.FPV.1.html', 'r') as f:
    fpv = f.read()

fpv = fpv.replace(css, '')
fpv = fpv.replace(html, '')

with open('NewOrigami.FPV.1.html', 'w') as f:
    f.write(fpv)

