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
    
    var macro_def = /^#curve\(([A-Za-z_]+)\)/mig;
    var found = {};
    ITER_REGEX(match, macro_def, src) {
        var curve_name = match[1];
        var replace_line = match[0];
        var re = new RegExp('([A-Za-z]+[0-9]*) '+curve_name+'\\[(\\d+)\\]', 'mi');
        var introspected = re.exec(src);
        var array_len = introspected[2];
        var gl_type = introspected[1];
        var key = gl_type + array_len;
        if (!found[key]) {
            found[key] = apply_template(gl_type, array_len);
        }
    }
    
    var curve_methods = ""
    ITER_PROPS(key, found) {
        curve_methods += found[key];
    }
    
    var insert = src.search(macro_def);
    src = src.replace(macro_def, '');
    src = src.slice(0, insert) + curve_methods + src.slice(insert);
    
    return src;
});




#undef GLSL_MACRO
