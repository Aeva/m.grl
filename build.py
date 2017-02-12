#!/usr/bin/env python

import os
import glob
import shutil
import argparse
import subprocess


def run(cmd):
    subprocess.call(cmd.split(" "))


def parse_args():
    options = {
        "debug" : "Build with extra debugging assertions.",
        "no-gl" : "Build without WebGL rendering support.",
        "no-dom" : "Build without 2D DOM rendering support.",
    }
    args = argparse.ArgumentParser(description='M.GRL build tool.')
    for key, value in options.items():
        args.add_argument("--"+key, help=value, action='store_true')
    return args.parse_args()


if __name__ == "__main__":
    args = parse_args()
    flags = {
        "all" : ['bsides', 'assets'],
        "gl" : ['webgl', 'glsl_assets'],
        "dom" : ['dom'],
        "debug" : ['debug'],
    }
    build_flags = []
    def format_flags(group, active=True):
        suffix = '' if active else '=0'
        new_flags = ["-D" + flag.upper() + suffix for flag in flags[group]]
        return new_flags

    build_flags += format_flags("all")
    build_flags += format_flags("gl", not args.no_gl)
    build_flags += format_flags("dom", not args.no_dom)
    build_flags += format_flags("debug", args.debug)
    build_flags = ' '.join(build_flags)

    build_cmd = "sh jspp.sh src/m.header.js mgrl.js " + build_flags

    # generate asset bundle
    run("python regen_asset_bundle.py")

    # compile M.GRL
    run(build_cmd)

    # m.grl post processor
    run("python reflow.py mgrl.js")

    # regenerate the project templates archive
    shutil.copy("mgrl.js", "templates/common_assets/libs/")
    shutil.copy("theme/theme.css", "templates/common_assets/libs/")
    os.chdir("templates")
    for path in glob.glob("common_assets/libs/*"):
        shutil.copy(path, "basic_project/libs/")
    if os.path.exists("basic_project.zip"):
        os.remove("basic_project.zip")
    run("zip -r basic_project.zip basic_project")

    print "<3 M.GRL has been built with the following flags:\n" + build_flags
