
import os
import json
import array
import base64
import hashlib


def list_to_blob(data, size=3):
    if not data:
        return None
    typed = type(data[0])
    assert typed in [int, long, float]
    assert size in [1, 2, 3, 9, 16]
    # 1 = float
    # 2 = vec2
    # 3 = vec3
    # 9 = mat3
    # 12 = mat4
    ar = None
    hint = None
    if typed == int:
        ar = array.array("I")
        hint = "Uint32Array"
    elif typed == float:
        ar = array.array("f")
        hint = "Float32Array"
    if ar is not None:
        ar.fromlist(data)
        return {
            "hint" : hint,
            "size" : size,
            "data" : base64.b64encode(ar.tostring()),
        }
    else:
        raise ValueError("Cannot determine output array type.")


def combine_and_save(results, out_path):
    parser = results["parser"]
    model = {
        "vars" : {
            # uniform variables
        },
        "hooks" : {
            # ext hooks
        },
        "ani" : {
            # animation keyframes
        },
        "meta" : {
            # metadata
        },
        "vertex_groups" : {
            # vertex groups
        },
    }


    # store texture info
    if results["texture"]:
        texture_path, texture_ext = results["texture"]
        texture_name = os.path.split(texture_path)[-1]
        data = {
            "hint" : "Sampler2D",
            "mode" : "linked",
            "uri" : texture_name,
        }
        
        if results["bake"]:
            # If the -b parameter is specified, then we embed the
            # image data within this file.
            uri = "data:image/{0};base64,{1}"
            mime = {
                "jpg" : "jpeg",
                "png" : "png",
                }[texture_ext]
            with open(texture_path, "r") as texture_file:
                raw = texture_file.read()

            data["mode"] = "packed"
            data["uri"] = uri.format(
                mime,
                base64.b64encode(raw),
            )
            # This md5 hash will be used as a cache entry.  Less
            # efficient then linking to a external texture file, but
            # allows for possible state sorting, and prevents
            # redundant texture loading.
            data["md5"] = hashlib.md5(raw).hexdigest()

        model["vars"]["texture"] = data


    # store vertex group info
    for group in parser.groups:
        count = len(group.position)/3
        assert len(group.normal) == 0 or len(group.normal)/3 == count
        assert len(group.tcoord) == 0 or len(group.tcoord)/2 == count
        
        position = list_to_blob(group.position)
        normal = list_to_blob(group.normal)
        tcoord = list_to_blob(group.tcoord, size=2)

        data = {
            "position" : position,
        }
        if normal:
            data["normal"] = normal
        if tcoord:
            data["tcoord"] = tcoord

        model["vertex_groups"][group.name] = data
            
    with open(out_path, 'w') as out_file:
        json.dump(model, out_file)

    print "Saved to", out_path
