
import os
import json
import array
import base64


def list_to_blob(data):
    if not data:
        return None
    typed = type(data[0])
    assert typed in [int, long, float]
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
        return [hint, base64.b64encode(ar.tostring())]
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
    for group in parser.groups:
        data = {
            "name" : group.name,
            "count" : len(group.position)/3,
        }

        assert len(group.normal) == 0 or len(group.normal)/3 == data["count"]
        assert len(group.tcoord) == 0 or len(group.tcoord)/2 == data["count"]
        
        position = list_to_blob(group.position)
        normal = list_to_blob(group.normal)
        tcoord = list_to_blob(group.tcoord)

        data["position"] = position
        data["count"] = len(position)
        if normal:
            data["normal"] = normal
        if tcoord:
            data["tcoord"] = tcoord

        model["vertex_groups"][group.name] = data
            
    with open(out_path, 'w') as out_file:
        json.dump(model, out_file)

    print "Saved to", out_path
