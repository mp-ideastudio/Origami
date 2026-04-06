import re
with open('js/engine.js', 'r') as f:
    text = f.read()

# Strip out bad insertions
text = re.sub(r'const _iframe = document\.getElementById\(\'ui-iframe\'\); if \(_iframe && _iframe\.contentWindow\) \{ _iframe\.contentWindow\.postMessage\((.*?)\); \} ', '', text)
text = re.sub(r'\(\(\) => \{ const _iframe = document\.getElementById\(\'ui-iframe\'\); if \(_iframe && _iframe\.contentWindow\) \{ _iframe\.contentWindow\.postMessage\((.*?)\); \} window\.parent\.postMessage\((.*?)\); \}\)\(\);', r'window.parent.postMessage(\1);', text)

# Now it should be back to window.parent.postMessage({ ... })
# Let's cleanly inject a helper function at the top
def replacer(m):
    return "(() => { const _ui = document.getElementById('ui-iframe'); if (_ui && _ui.contentWindow) { _ui.contentWindow.postMessage(" + m.group(1) + "); } window.parent.postMessage(" + m.group(1) + "); })();"

new_text = re.sub(r"window\.parent\.postMessage\(([^;]+?)\);", replacer, text)
with open('js/engine.js', 'w') as f:
    f.write(new_text)
