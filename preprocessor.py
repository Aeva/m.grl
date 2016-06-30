#!/usr/bin/env python

import glob
import os

LAST_FILE = "unknown file"

def quote_macro(src):
    def apply_quote(lines, shift_left=0):
        buf = '';
        counter = 0
        for line in lines:
            last = counter == len(lines)-1
            if line.count('"') and line.count("'"):
                raise "%s: Cannot quote a line that contains both a quotation mark or an apostrophy." % LAST_FILE
            quote = '"' if line.count('"') == 0 else "'"
            suffix = '' if last else " +\n"
            buf += "{0}{1}{0}{2}".format(quote, line.strip(), suffix)
            counter += 1
        
        return buf
    
    out = []
    quoted = None
    min_indent = -1
    for line in src:
        if quoted is None and line.strip().startswith("#quote"):
            quoted = []
            min_indent = -1
            continue
        elif type(quoted) is list:
            if line.strip().startswith("#endquote"):
                out.append(apply_quote(quoted, min_indent))
                quoted = None
                continue
            else:
                quoted.append(line)
        else:
            out.append(line)

    if quoted is not None:
        raise "%s: Expected #endquote before end of file" % LAST_FILE
    return out


if __name__ == "__main__":
    found = glob.glob("tmp/*.js")
    found += glob.glob("tmp/gl_ast/*.js")
    found += glob.glob("tmp/tmp/*.js")

    for path in found:
        LAST_FILE = path
        with open(path, "r") as _file:
            src = _file.readlines()
            
        src = quote_macro(src)
        
        with open(path, "w") as _file:
            src = _file.write(''.join(src))
