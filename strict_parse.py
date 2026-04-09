import re

def strip_content(text):
    # Remove strings
    text = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
    text = re.sub(r"'(?:\\.|[^'\\])*'", "''", text)
    text = re.sub(r'`(?:\\.|[^`\\])*`', '``', text)
    # Remove single line comments
    text = re.sub(r'//.*', '', text)
    # Remove block comments
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)
    # Remove simple regex literals (heuristic)
    text = re.sub(r'/(?![/*])(?:\\.|[^/\\])*/[gimuy]*', '//', text)
    return text

with open("NewOrigami.FPV.1.html", "r") as f:
    text = f.read()

m = re.search(r'<script>([\s\S]*?)</script>', text)
script = m.group(1) if m else ""

script = strip_content(script)
lines = script.split('\n')

stack = []
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            stack.append(('{', i + 1))
        elif char == '}':
            if not stack:
                print(f"Extra '}}' found at line {i + 1}")
            else:
                top, lnum = stack.pop()

if stack:
    print(f"Unclosed '{stack[-1][0]}' from line {stack[-1][1]}")
else:
    print("Balanced!")
