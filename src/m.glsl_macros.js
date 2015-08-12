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
    var found = {};
    ITER_REGEX(match, macro_def, src) {
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
GLSL_MACRO (function(src) {
    var template = please.access("curve_template.glsl", true);
    var apply_template = function (gl_type, array_len) {
        var tmp = template.replace(new RegExp("GL_TYPE", "g"), gl_type);
        tmp = tmp.replace(new RegExp("ARRAY_LEN", "g"), array_len);
        return tmp;
    };

    var macro_def = /uniform curve (float|vec2|vec3|vec4) ([A-Za-z_]+)\[(\d+)\];/mig;
    var rewrite = [];
    var found_types = {};
    ITER_REGEX(match, macro_def, src) {
        var line = match[0];
        var type = match[1];
        var name = match[2];
        var size = match[3];

        var hint = type + size;
        if (!found_types[hint]) {
            found_types[hint] = apply_template(type, size);
        }
        rewrite.push([line, "uniform "+type+" "+name+"["+size+"];"])
    }

    if (rewrite.length) {
        var curve_methods = ""
        ITER_PROPS(key, found_types) {
            curve_methods += found_types[key];
        }
        rewrite[0][1] += "\n" + curve_methods + "\n\n";

        ITER(i, rewrite) {
            var original = rewrite[i][0];
            var compiled = rewrite[i][1];
            src = src.replace(original, compiled);
        }
    }
        
    return src;
});




#undef GLSL_MACRO
