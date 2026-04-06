import json

def parse_glb_animations(filepath):
    try:
        with open(filepath, 'rb') as f:
            f.read(12) # skip Magic (4), Version (4), Length (4)
            chunk0_len = int.from_bytes(f.read(4), 'little')
            chunk0_type = f.read(4).decode('utf-8')
            if chunk0_type == 'JSON':
                json_data = f.read(chunk0_len)
                data = json.loads(json_data.decode('utf-8'))
                if 'animations' in data:
                    print("Animations for", filepath)
                    for i, a in enumerate(data['animations']):
                        print(f"[{i}] {a.get('name', 'Unknown')}")
                else:
                    print("No animations found in", filepath)
    except Exception as e:
        print("Error", e)

parse_glb_animations('./assets/models/yakuza.goblin.animated.glb')
parse_glb_animations('./assets/models/yakuza.imp.animated.glb')
