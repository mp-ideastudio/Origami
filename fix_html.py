with open('NewOrigami.Panels.html', 'r') as f:
    orig = f.read()

# The JS was appended to the end.
# Split by </html>
parts = orig.split('</body>\n</html>')
if len(parts) > 1:
    main_html = parts[0]
    appended_js = parts[1]
    
    # Check if there's already </script> at the end of the appended js
    if '</script>' in appended_js:
        appended_js = appended_js.replace('</script>', '')
        
    final_html = main_html + "\n<script>\n" + appended_js + "\n</script>\n</body>\n</html>"
    
    with open('NewOrigami.Panels.html', 'w') as f:
        f.write(final_html)
