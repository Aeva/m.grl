/*
 Tests for m.gl.ast.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test.bundled_assets = function () {
    please.prop_map(please.__bundled_glsl, function (name, src) {
        // see m.media.js's please.media.handlers.glsl for reference:
        hint("building: " + name, true);
        var asset = new please.gl.ShaderSource(atob(src), name);
    });
    assert(found > 0);
};