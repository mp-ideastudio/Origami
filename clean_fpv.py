import re

with open('NewOrigami.FPV.1.html', 'r') as f:
    text = f.read()

# We want to replace the body of initPipCanvases() with a clean version that relies on OffscreenCanvas telemetry.
# Locate the method
start_str = "            initPipCanvases() {\n"
end_str = "            postToAI(msg) {\n"

start_idx = text.find(start_str)
end_idx = text.find(end_str)

if start_idx != -1 and end_idx != -1:
    old_block = text[start_idx:end_idx]
    
    new_block = """            initPipCanvases() {
                // PiP drawing context is now managed via PIP_CANVAS_TRANSFER via master router
                // Ensure ortho target state exists
                if (!this._pipOrthoTarget) {
                    this._pipOrthoTarget = { hw: 10 * this.gridSize, hh: 10 * this.gridSize };
                }
                if (!this._pipZoomScale) this._pipZoomScale = 1.0;
            },

"""
    text = text[:start_idx] + new_block + text[end_idx:]
    with open('NewOrigami.FPV.1.html', 'w') as f:
        f.write(text)
    print("SUCCESS")
else:
    print("FAILED TO FIND INDICES")

