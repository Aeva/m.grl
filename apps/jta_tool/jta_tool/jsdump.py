
import os
import json
import numpy
import base64
import hashlib


def list_to_blob(data, size=3, precision=16):
    if not data:
        return None
    typed = type(data[0])
    assert typed in [int, float]
    assert size in [1, 2, 3, 9, 16]
    assert precision in [16, 32]
    # 1 = float
    # 2 = vec2
    # 3 = vec3
    # 9 = mat3
    # 12 = mat4
    hint = None
    dtype = None
    if typed == int:
        if precision == 16:
            dtype = numpy.int16
            hint = "Int16Array"
        else:
            dtype = numpy.int32
            hint = "Int32Array"
    elif typed == float:
        if precision == 16:
            dtype = numpy.float16
            hint = "Float16Array"
        else:
            dtype = numpy.float32
            hint = "Float32Array"

    ar = numpy.ndarray(shape=(len(data)), buffer=None, dtype=dtype)
    for i in range(len(data)):
        ar[i] = data[i]
    
    return {
        "hint" : hint,
        "size" : size,
        "data" : base64.b64encode(ar.tostring()),
    }


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


    # calculate smooth normals
    if results["smooth"]:
        for group in parser.groups:
            # group the normals by vertex position
            builder = {}
            for n in range(len(group.position)/3):
                start = n*3
                end = start+3
                vertex = tuple(group.position[start:end])
                normal = tuple(group.normal[start:end])
                if not builder.has_key(vertex):
                    builder[vertex] = []
                builder[vertex].append(normal)

            # average normals sharing a vertex
            for vertex, normal_set in builder.items():
                average = [0.0, 0.0, 0.0]
                for normal in normal_set:
                    for i in range(3):
                        average[i] += normal[i]
                for i in range(3):
                    average[i] /= len(normal_set)
                builder[vertex] = average

            # write out averaged normals
            for n in range(len(group.position)/3):
                start = n*3
                end = start+3
                vertex = tuple(group.position[start:end])
                normal = builder[vertex]
                for i in range(3):
                    group.normal[start+i] = normal[i]


    # determine storage precision for vertices
    precision = 16
    if results["bloat"]:
        precision = 32
    

    # store vertex group info
    for group in parser.groups:
        count = len(group.position)/3
        assert len(group.normal) == 0 or len(group.normal)/3 == count
        assert len(group.tcoord) == 0 or len(group.tcoord)/2 == count
        
        position = list_to_blob(group.position, precision=precision)
        normal = list_to_blob(group.normal, precision=precision)
        tcoord = list_to_blob(group.tcoord, size=2, precision=precision)

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
