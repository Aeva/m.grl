#!/usr/bin/env python

import json
import glob
import os

if __name__ == "__main__":
    sources = glob.glob("src/glsl/*.vert") + glob.glob("src/glsl/*.frag")
    bundle = {}
    for path in sources:
        file_name = os.path.split(path)[-1]
        bundle[file_name] = open(path, "r").read()
    blob = json.dumps(bundle)

    if not os.path.isdir("src/tmp/"):
        os.mkdir("src/tmp/")
        
    template = open("src/glsl/template.js", "r").read()
    outfile = open("src/tmp/glsl_assets.js", "w")
    outfile.write(template.replace("#### JSON HERE ####", blob))
