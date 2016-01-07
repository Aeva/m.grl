// - m.dom.js ------------------------------------------------------------ //


// Namespace for code specific to the dom renderer
please.dom = {
    "image_instance" : function (asset) {
    },
};


// [+] please.dom.set_context(ctx_id)
//
// This function is used for setting the element on which overlay elements
// are placed.  Either this, or please.gl.set_context, should be the first
// M.GRL call that a program makes.  Only one of these functions may be
// called, and they may be called only once.
//
// Please note that while a game may be written to use either this
// renderer or the one defined in m.gl.js, much of M.GRL's
// functionality was originally written with 3D rendering in mind, and
// is not compatible with this 2D renderer is in use.
//
please.dom.set_context = function (ctx_id) {
    if (please.renderer.name !== null) {
        throw new Error("Cannot initialize a second rendering context.");
    }
    
    please.renderer.name = "dom";
    Object.freeze(please.renderer.name);

    var context = document.getElementById(ctx_id);
    
    please.renderer.__defineGetter__("width", function () {
        return context.clientWidth;
    });
    please.renderer.__defineGetter__("height", function () {
        return context.clientHeight;
    });

    please.__create_canvas_overlay(context);
};

please.dom.pos_from_event = function (x, y) {
    var parent = please.renderer.overlay;
    return [(x - parent.clientWidth / 2) * 2 / window.graph.camera.orthographic_grid, (y - parent.clientHeight / 2) * -2 / window.graph.camera.orthographic_grid];
}
