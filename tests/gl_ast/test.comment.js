/*
 Tests for gl_ast/ast.comment.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["please.gl.__find_comments"] = function () {
    var src = "///* hello\n"
    src += "/* this is a\n"
    src += "// test */\n";
    src += '"quotation comment"\n';
    src += "#preproc directive\n";
    src = please.gl.ast.str(src);
    src.meta.offset = 0;

    var tokens = please.gl.__find_comments(src);
    var subset = [];
    tokens.map(function (token) {
        assert(token.constructor == please.gl.ast.Comment || token.trim() == '');
        if (token.constructor == please.gl.ast.Comment) {
            subset.push(token);
        }
    });
    assert(subset.length == 4);
    assert(subset[0].multiline == false);
    assert(subset[0].quotation == false);
    assert(subset[0].directive == false);
    assert(subset[1].multiline == true);
    assert(subset[1].quotation == false);
    assert(subset[1].directive == false);
    assert(subset[2].multiline == true);
    assert(subset[2].quotation == true);
    assert(subset[2].directive == false);
    assert(subset[2].data == "quotation comment");
    assert(subset[3].multiline == false);
    assert(subset[3].quotation == false);
    assert(subset[3].directive == true);
    assert(subset[3].data == "preproc directive");
};