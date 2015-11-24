// - bundled glsl shader assets --------------------------------------------- //


(function () {
    please.__bundled_glsl = #### JSON HERE ####;
    please.prop_map(please.__bundled_glsl, function (name, src) {
        addEventListener("mgrl_gl_context_created", function () {
            // see m.media.js's please.media.handlers.glsl for reference:
            please.media.assets[name] = new please.gl.ShaderSource(atob(src), name);
        });
    });
})();
