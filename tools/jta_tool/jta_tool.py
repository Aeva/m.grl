
import os
import traceback
import argparse

from .parser_common import ParserError
from .stl_parser import STLParser, BinarySTLParser
from .obj_parser import OBJParser, MTLParser

from .jsdump import combine_and_save


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "model",
        nargs=1,
        type=str,
        help="Input file supplying geometry and texture info.",
    )
    parser.add_argument(
        "-t", "--texture",
        nargs=1,
        type=str,
        required=False,
        help="Mtl file or image file providing a texture map.",
    )
    parser.add_argument(
        "-b", "--bake",
        required=False,
        action="store_true",
        help="Embed the texture map instead of referencing.",
    )
    parser.add_argument(
        "-o", "--outfile",
        nargs=1,
        type=str,
        required=False,
        help="Output filename",
    )
    parser.add_argument(
        "--no_transpose",
        required=False,
        action="store_true",
        help="Don't flip or invert coordinates.")
    parser.add_argument(
        "-s", "--smooth",
        required=False,
        action="store_true",
        help="Calculate smooth normals.",
    )
        

    args = parser.parse_args()
    transpose = not args.no_transpose;


    # parse out paths and interpret options

    def path_scrub(input_path):
        path = os.path.abspath(input_path)
        if os.path.exists(path) and os.path.isfile(path):
            ext = path.split(".")[-1]
            return (path, ext)
        else:
            raise IOError("No such file.")

    model_path, model_ext = path_scrub(args.model[0])
    tex_path, tex_ext = None, None
    out_file = None

    if args.texture is not None:
        texture_path = path_scrub(args.texture[0])
    if args.outfile is not None:
        out_file = os.path.abspath(args.outfile[0])
    else:
        out_file = ".".join(model_path.split(".")[:-1] + ["jta"])


    # results dict will contain model and texture info, and whatever else
    results = {
        "parser" : None,
        "texture" : None,
        "bake" : args.bake,
        "smooth" : args.smooth,
    }

    # select the correct model parser
    parsers = {
        "stl" : [STLParser, BinarySTLParser],
        "obj" : [OBJParser],
    }[model_ext]
    last = parsers[-1]

    for parser in parsers:
        try:
            results["parser"] = parser(model_path, transpose)
        except ParserError:
            # This should only be thrown to indicate that another
            # parser should be tried.  If there is an actual bug,
            # another exception type will be thrown instead.
            results["parser"] = None
            continue

    if results["parser"] is None:
        print "Unable to parse:", model_file
        exit()

    if args.texture is not None:
        texture, texture_ext = path_scrub(args.texture[0])
        if texture_ext == "mtl":
            # FIXME
            raise NotImplementedError("Parsing texture data from mtl files.")

        elif texture_ext in ["png", "jpg"]:
            results["texture"] = (texture, texture_ext)
        else:
            raise NotImplementedError("Support for .%s files" % texture_ext)
        
    combine_and_save(results, out_file)
