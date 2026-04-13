import sys

def check_braces(filename, start_line, end_line):
    with open(filename, 'r') as f:
        lines = f.readlines()
        
    code = "".join(lines[start_line-1:end_line])
    
    # Very simple brace stack
    stack = []
    for i, char in enumerate(code):
        if char == '{': stack.append('{')
        elif char == '(': stack.append('(')
        elif char == '}': 
            if not stack or stack[-1] != '{':
                print(f"Error at {char} around {code[max(0, i-20):i+20]}")
            else: stack.pop()
        elif char == ')':
            if not stack or stack[-1] != '(':
                print(f"Error at {char} around {code[max(0, i-20):i+20]}")
            else: stack.pop()

check_braces('/Users/mark/Documents/ORIGAMI/NEW.ORIGAMI/NewOrigami.FPV.1.html', 3865, 4015)
