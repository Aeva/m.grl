// - gl_alst/ast.common.js ----------------------------------------------- //


/* [+] please.gl.ast.mixin(obj)
 * 
 * Adds symbols used for tracebacks to the GLSL->GLSL compiler's ast
 * objects.
 * 
 */
please.gl.ast.mixin = function (obj) {
    obj.offset = null;
    obj.line = null;
    obj.char = null;
    obj.uri = "unknown";
};
