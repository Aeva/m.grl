#!/usr/bin/env python3

import fnmatch
import base64
import json
import glob
import os


def find_assets(extensions, path="src/assets/"):
    bundle = {}
    for base, directories, files in os.walk(path):
        for extension in extensions:
            for name in fnmatch.filter(files, "*." + extension):
                asset_path = os.path.join(base, name)
                assert os.path.exists(asset_path)

                warn_limit_kb = 10
                print("  embedding: " + asset_path)
                if os.path.getsize(asset_path) > warn_limit_kb*1024:
                    msg = "WARNING: File larger than {0}kb!! -> {1}"
                    print(msg.format(warn_limit_kb, os.path.split(asset_path)[-1]))
                
                file_name = asset_path[len(path):]
                bundle[file_name] = base64.b64encode(open(asset_path, "rb").read()).decode('utf-8')
    return bundle


def save(data, target):
    template_file = "src/assets/{0}_template.js".format(target)
    output_file = "src/tmp/{0}_assets.js".format(target)
    template = open(template_file, "r").read()
    open(output_file, "w").write(
        template.replace("#### JSON HERE ####", json.dumps(data)))


def glsl_assets():
    bundle = find_assets(["vert", "frag", "glsl"])
    save(bundle, "glsl")


def text_assets():
    bundle = find_assets(["txt"])
    save(bundle, "text")
    

def image_assets():
    types = {
        "png" : "image/png",
        "jpg" : "image/jpeg",
        "jpeg" : "image/jpeg",
        }
    bundle = find_assets(types.keys())
    for handle, data in bundle.items():
        ext = handle.split(".")[-1]
        bundle[handle] = "data:{0};base64,{1}".format(types[ext], data)
    save(bundle, "image")

if __name__ == "__main__":
    if not os.path.isdir("src/tmp/"):
        os.mkdir("src/tmp/")

    text_assets()
    glsl_assets()
    image_assets()
