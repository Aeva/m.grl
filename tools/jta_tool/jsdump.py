
import os
import json
import base64


def combine_and_save(parsers, out_path):
    model = {
        "vars" : {
            # uniform variables
        },
        "sets" : {
            # vertex groups
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
    }

    import pdb; pdb.set_trace()

    with open(out_path, 'w') as out_file:
        json.dump(model, out_file)

    print "Saved to", out_path
