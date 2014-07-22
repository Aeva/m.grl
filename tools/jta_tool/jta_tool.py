
import os
import argparse
import json


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

    for path in paths:
        print " -", path

    print "nothing here yet, sorry"
