#!/usr/bin/env python

import base64
import json
import glob
import os


def find_assets(extensions, path="src/assets/"):
    bundle = {}
    for extension in extensions:
        found = glob.glob(os.path.join(path, "*." + extension))
        for asset_path in found:
            warn_limit_kb = 10
            print "  embedding: " + asset_path
            if os.path.getsize(asset_path) > warn_limit_kb*1024:
                msg = "WARNING: File larger than {0}kb!! -> {1}"
                print msg.format(warn_limit_kb, os.path.split(asset_path)[-1])
                
            file_name = os.path.split(asset_path)[-1]
            bundle[file_name] = base64.encodestring(open(asset_path, "r").read())
    return bundle


def save(data, target):
    template_file = "src/assets/{0}_template.js".format(target)
    output_file = "src/tmp/{0}_assets.js".format(target)
    template = open(template_file, "r").read()
    open(output_file, "w").write(
        template.replace("#### JSON HERE ####", json.dumps(data)))


def glsl_assets():
    bundle = find_assets(["vert", "frag"])
    save(bundle, "glsl")


def text_assets():
    bundle = find_assets(["txt", "glsl"])
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
