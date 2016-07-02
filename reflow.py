#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import sys
import os
import re

LAST_FILE = "unknown file"

def find_macro(line, name):
    expr = r'//\s*☿\s*%s\s*$' % name
    if re.match(expr, line, flags=re.UNICODE):
        return True, re.split(expr, line, flags=re.UNICODE)[0] or None
    else:
        return False, None

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
            buf += "{0}{1}\\n{0}{2}".format(quote, line.strip(), suffix)
            counter += 1
        
        return buf
    
    out = []
    quoted = None
    line_num = -1
    for line in src:
        line_num += 1
        if quoted is None:
            found, remainder = find_macro(line, 'quote')
            if found:
                if remainder:
                    out.append(remainder)
                quoted = []
                continue
            if find_macro(line, 'endquote')[0]:
                raise Exception("Premature endquote macro found on line %s of mgrl.js!" % line_num)

        elif type(quoted) is list:
            if find_macro(line, 'quote')[0]:
                raise Exception("Premature quote macro found on line %s of mgrl.js!" % line_num)
            found, remainder = find_macro(line, 'endquote')
            if found:
                if remainder:
                    quoted.append(remainder)
                out.append(apply_quote(quoted))
                quoted = None
            else:
                quoted.append(line)
            continue
        
        out.append(line)

    if quoted is not None:
        raise "%s: Expected #endquote before end of file" % LAST_FILE
    return out


if __name__ == "__main__":
    target = sys.argv[1]
    with open(target, "r") as mgrl_file:
        src = mgrl_file.readlines()

    src = quote_macro(src)
    
    with open(target, "w") as mgrl_file:
        src = mgrl_file.write(''.join(src))
