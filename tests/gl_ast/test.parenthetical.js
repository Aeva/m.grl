/*
 Tests for gl_ast/ast.parenthetical.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["please.gl.__identify_parentheticals"] = function () {
    var stream = [
        "vec2",
        "(",
        "10.0",
        ",",
        "(",
        "floob",
        "[",
        "4",
        "]",
        "+",
        "5.5",
        ")",
        ")",
        ";"
    ].map(function (token, i) {
        return please.gl.ast.str(token, i);
    });
    var tokens = please.gl.__identify_parentheticals(stream);
    assert(tokens.length == 3);
    assert(tokens[0] == "vec2");
    assert(tokens[1].constructor == please.gl.ast.Parenthetical);
    assert(tokens[1].type == "parenthesis");
    assert(tokens[2] == ";");

    var inner = tokens[1].data;
    assert(inner.length == 3);
    assert(inner[0] == "10.0");
    assert(inner[1] == ",");
    assert(inner[2].constructor == please.gl.ast.Parenthetical);
    assert(inner[2].type == "parenthesis");

    var inner = inner[2].data;
    assert(inner.length == 4);
    assert(inner[0] == "floob");
    assert(inner[1].constructor == please.gl.ast.Parenthetical);
    assert(inner[1].type == "square");
    assert(inner[1].data.length == 1);
    assert(inner[1].data[0] == "4");
    assert(inner[2] == "+");
    assert(inner[3] == "5.5");
};