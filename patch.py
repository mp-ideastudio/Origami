import sys

# Read the old file (2 days ago)
with open('js/engine/WorldGen.old.js', 'r') as f:
    old_content = f.read()

# Read the current file
with open('js/engine/WorldGen.js', 'r') as f:
    cur_content = f.read()

# We want to replace everything from "createDungeonFloorTexture() {" 
# down to "this.worldGroup.add(pipInstancedWalls);" in the current file,
# with the block starting from "// Generate 8 tiers of procedurally torn Shoji screens" 
# down to "this.worldGroup.add(pipInstancedWalls);" from the old file.

# Find the start in current file
start_marker_cur = "            createDungeonFloorTexture() {"
start_idx_cur = cur_content.find(start_marker_cur)

# Find the end in current file
end_marker_cur = "this.worldGroup.add(pipInstancedWalls);"
end_idx_cur = cur_content.find(end_marker_cur, start_idx_cur) + len(end_marker_cur)

# Find the start in old file
start_marker_old = "            // Generate 8 tiers of procedurally torn Shoji screens"
start_idx_old = old_content.find(start_marker_old)

# Find the end in old file
end_idx_old = old_content.find(end_marker_cur, start_idx_old) + len(end_marker_cur)

if start_idx_cur == -1 or end_idx_cur == -1 or start_idx_old == -1 or end_idx_old == -1:
    print("Error finding markers")
    sys.exit(1)

new_content = cur_content[:start_idx_cur] + old_content[start_idx_old:end_idx_old] + cur_content[end_idx_cur:]

with open('js/engine/WorldGen.js', 'w') as f:
    f.write(new_content)

print("Patch successful!")
