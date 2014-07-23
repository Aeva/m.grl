
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
        ar.extend(data)
        return [hint, base64.b64encode(ar.tostring())]
    else:
        raise ValueError("Cannot determine output array type.")


def combine_and_save(results, out_path):
    parser = results["parser"]

    vertex_data = list_to_blob(parser.verts)
    normal_data = list_to_blob(parser.normals)
    tcoord_data = list_to_blob(parser.tcoords)
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
            "default" : {
                "positions" : vertex_data,
            },
        },
    }
    if normal_data:
        assert len(parser.verts)/3 == len(parser.normals)/3
        model["vertex_groups"]["default"]["normals"] = normal_data
    if tcoord_data:
        assert len(parser.verts)/3 == len(parser.tcoords)/2
        model["vertex_groups"]["default"]["tcoords"] = normal_data

    with open(out_path, 'w') as out_file:
        json.dump(model, out_file)

    print "Saved to", out_path
