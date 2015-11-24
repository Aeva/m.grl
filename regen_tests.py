#!/usr/bin/env python

import glob, os

if __name__ == "__main__":
    os.chdir("tests")
    index_src = open("index.html", "r").read()
    start_seq = "<!-- BEGIN UNIT TEST FILES -->"
    close_seq = "<!-- END UNIT TEST FILES -->"
    start = index_src.find(start_seq)
    close = index_src.find(close_seq) + len(close_seq)
    before = index_src[:start].strip()
    after = index_src[close:].strip()

    script_line = '  <script type="text/javascript" src="{0}"></script>\n'
    paths = glob.glob("*.js") + glob.glob("*/*.js")
    ignore = ['runner.js']

    new_src = before + "\n\n  " + start_seq + "\n"
    for path in paths:
        if path in ignore:
            continue
        else:
            new_src += script_line.format(path);
    
    new_src += "  " + close_seq + "\n" + after + "\n"
    open("index.html", "w").write(new_src)
    
