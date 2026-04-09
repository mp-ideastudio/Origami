import re
import sys

def check_balanced(text):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_string = False
    string_char = ''
    in_comment = False
    in_block_comment = False
    
    i = 0
    line_num = 1
    
    while i < len(text):
        char = text[i]
        
        if char == '\n':
            line_num += 1
            if in_comment:
                in_comment = False
            i += 1
            continue
            
        if in_comment:
            i += 1
            continue
            
        if in_block_comment:
            if char == '*' and i + 1 < len(text) and text[i+1] == '/':
                in_block_comment = True
                i += 2
                in_block_comment = False
            else:
                i += 1
            continue
            
        if in_string:
            if char == '\\':
                i += 2
                continue
            if char == string_char:
                in_string = False
            i += 1
            continue
            
        if char in '"\'`':
            in_string = True
            string_char = char
            i += 1
            continue
            
        if char == '/' and i + 1 < len(text) and text[i+1] == '/':
            in_comment = True
            i += 2
            continue
            
        if char == '/' and i + 1 < len(text) and text[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
            
        if char in '({[':
            stack.append((char, line_num))
        elif char in ')}]':
            if not stack:
                return f"Unmatched '{char}' at line {line_num}"
            top, ln = stack.pop()
            if pairs[char] != top:
                return f"Mismatched: expected closure for '{top}' (from line {ln}), got '{char}' at line {line_num}"
        
        i += 1
    
    if stack:
        top, ln = stack.pop()
        return f"Unclosed '{top}' from line {ln}"
    
    return "Balanced!"

with open("NewOrigami.FPV.1.html", "r") as f:
    text = f.read()

m = re.search(r'<script>([\s\S]*?)</script>', text)
if m:
    print(check_balanced(m.group(1)))
else:
    print("No script tag found")
