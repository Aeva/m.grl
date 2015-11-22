/*
 Tests for m.gl.ast.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



test["verify bundled assets"] = function () {
    please.prop_map(please.__bundled_glsl, function (name, src) {
        // see m.media.js's please.media.handlers.glsl for reference:
        hint("building: " + name, true);
        var asset = new please.gl.ShaderSource(atob(src), name);
    });
};



test["please.gl.__trim"] = function () {
    var foo = ['', ' ', '\t', '\n', 'hello', '\r\n', ' '];
    foo = foo.map(function (token) { return please.gl.ast.str(token, 10); });
    var trimmed = please.gl.__trim(foo);
    assert(trimmed.length == 1);
    assert(trimmed[0] == "hello");
    assert(trimmed[0].meta.offset == 10);
};



test['please.gl.__split_tokens'] = function () {
    var foo = please.gl.ast.str("foo = bar + baz;", 10);
    var bar = please.gl.__split_tokens(foo);
    assert(bar.length == 6);
    assert(bar[0] == "foo");
    assert(bar[1] == "=");
    assert(bar[2] == "bar");
    assert(bar[3] == "+");
    assert(bar[4] == "baz");
    assert(bar[5] == ";");
    assert(bar[0].meta.offset == 10);
    assert(bar[1].meta.offset == 14);
    assert(bar[2].meta.offset == 16);
    assert(bar[3].meta.offset == 20);
    assert(bar[4].meta.offset == 22);
    assert(bar[5].meta.offset == 25);
};



test["please.gl.__apply_source_map"] = function () {
    var src = "";
    src += "uniform float foo;\n";
    src += "void main (void) {\n";
    src += "  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n";
    src += "}\n";
    var stream = please.gl.__split_tokens(please.gl.ast.str(src, 0));
    please.gl.__apply_source_map(stream, src);
    assert(stream[0] == "uniform float foo");
    assert(stream[0].meta.line === 0);
    assert(stream[0].meta.char === 0);
    assert(stream[1] == ";");
    assert(stream[1].meta.line === 0);
    assert(stream[1].meta.char === 17);
    assert(stream[2] == "void main");
    assert(stream[2].meta.line === 1);
    assert(stream[2].meta.char === 0);
    assert(stream[7] == "gl_FragColor");
    assert(stream[7].meta.line === 2);
    assert(stream[7].meta.char === 2);
};



test["please.gl.__stream_to_ast"] = function () {
    var src = "";
    src += "uniform float foo;\n";
    src += "void main (void) {\n";
    src += "  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n";
    src += "}\n";
    var stream = please.gl.__split_tokens(please.gl.ast.str(src, 0));
    please.gl.__apply_source_map(stream, src);
    var tree = please.gl.__stream_to_ast(stream);
    assert(tree.data.length == 2)
    assert(tree.data[0].constructor == please.gl.ast.Global);
    assert(tree.data[0].meta !== undefined);
    assert(tree.data[0].meta.line == 0);
    assert(tree.data[0].meta.char == 0);
    assert(tree.data[1].constructor == please.gl.ast.Block);
    assert(tree.data[1].meta !== undefined);
    assert(tree.data[1].meta.line == 1);
    assert(tree.data[1].meta.char == 0);
    assert(tree.data[1].data.length == 4);
    assert(tree.data[1].data[0] == "gl_FragColor");
    assert(tree.data[1].data[1] == "=");
    assert(tree.data[1].data[2].constructor === please.gl.ast.Invocation);
    assert(tree.data[1].data[2].bound === false);
    assert(tree.data[1].data[2].args.data.length === 7);
    assert(tree.globals.length == 1);
    assert(tree.methods.length == 1);
};



test["please.gl.glsl_to_ast"] = function () {
    var src = "";
    src += "uniform float foo;\r\n";
    src += "void main (void) {\r\n";
    src += "  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\r\n";
    src += "}\r\n";

    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 1);
    assert(tree.methods.length == 1);
};