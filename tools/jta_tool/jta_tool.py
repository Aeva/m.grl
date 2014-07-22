
import os
import argparse
import json

from parser_common import ParserError
from stl_parser import STLParser, BinarySTLParser
from obj_parser import OBJParser, MTLParser


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "input_file",
        nargs="+",
        type=str,
        help="Input files supplying geometry and texture info.",
    )
    parser.add_argument(
        "-o", "--outfile",
        nargs=1,
        type=str,
        required=False,
        help="Output filename",
    )

    args = parser.parse_args()
    in_files = args.input_file
    out_file = args.outfile

    paths = []
    for filename in in_files:
        path = os.path.abspath(filename)
        if os.path.exists(path) and os.path.isfile(path):
            paths.append(path)
        else:
            print "!!! ignoring non-existant file:", filename

    request = {
    }

    for path in paths:
        ext = path.split(".")[-1]
        if not request.has_key(ext):
            request[ext] = []
        request[ext].append(path)


    parsers = []
    try:
        if request.has_key("stl"):
            for path in request["stl"]:
                try:
                    parsers.append(STLParser(path))
                except ParserError:
                    parsers.append(BinarySTLParser(path))

        if request.has_key("obj"):
            parsers.append(map(OBJParser, requests["obj"]))

        if request.has_key("mtl"):
            parsers.append(map(OBJParser, requests["mtl"]))

    except ParserError:
        print "Unable to parse:", path
