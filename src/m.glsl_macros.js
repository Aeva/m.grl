// - m.gl_macros.js ------------------------------------------------------ //


//
// mechanism for adding your own glsl macros
//
please.gl.define_macro = function (macro) {
    please.gl.__macros.push(macro);
    return macro;
};
#define GLSL_MACRO please.gl.define_macro


//
// the include macro
//
GLSL_MACRO (function(src) {
    // this regex is written out weird to avoid a conflict with the
    // macro of the same name in the GNU c preprocessor, used by mgrl
    var macro_def = new RegExp('^#'+'include "([^"]*)"', 'mig');
    var match, found = {};
    while ((match = macro_def.exec(src)) !== null) {
        var file_path = match[1];
        var replace_line = match[0];
        found[file_path] = replace_line;
    }
    ITER_PROPS(file_path, found) {
        var included = please.access(file_path, true);
        if (included) {
            src = src.replace(found[file_path], included);
        }
    }
    return src;
});


//
// the curve macro
//
// GLSL_MACRO (function(src) {
//     var macro_def = /^#curve\(([A-Za-z_]+)\)/mig;
//     var match, found = {};
//     while ((match = macro_def.exec(src)) !== null) {
//     }
//     return src;
// });




#undef GLSL_MACRO
