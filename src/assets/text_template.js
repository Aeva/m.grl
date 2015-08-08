// - bundled textual assets ------------------------------------------------- //


addEventListener("mgrl_gl_context_created", function () {
    var lookup_table = #### JSON HERE ####;
    please.prop_map(lookup_table, function (name, src) {
        // see m.media.js's please.media.handlers.glsl for reference:
        please.media.assets[name] = src;
    });
});
