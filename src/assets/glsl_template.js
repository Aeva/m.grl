// - bundled glsl shader assets --------------------------------------------- //


(function () {
    please.__bundled_glsl = #### JSON HERE ####;
    please.prop_map(please.__bundled_glsl, function (name, src) {
        addEventListener("mgrl_gl_context_created", function () {
            // see m.media.js's please.media.handlers.glsl for reference:
            please.media.assets[name] = function () {
                var asset = new please.gl.ShaderSource(atob(src.replace(/\s/g, '')), name);
                asset.bundled = true;
                return asset;
            };
        });
    });
})();
