// - m.dom.js ------------------------------------------------------------ //


// Namespace for code specific to the dom renderer
please.dom = {};


// [+] please.dom.set_context(element)
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
please.dom.set_context = function (element, orthographic_grid) {
    if (please.renderer.name !== null) {
        throw new Error("Cannot initialize a second rendering context.");
    }
    
    please.renderer.name = "dom";
    Object.freeze(please.renderer.name);

    please.dom.canvas = document.getElementById(element);
    please.dom.orthographic_grid = orthographic_grid || 32;
    
    please.renderer.__defineGetter__("width", function () {
        return please.dom.canvas.width;
    });
    please.renderer.__defineGetter__("height", function () {
        return please.dom.canvas.height;
    });

    please.__create_canvas_overlay(please.dom.canvas);
    please.renderer.overlay.style.pointerEvents = "auto";
    please.dom.canvas_changed();
};

please.dom.canvas_changed = function () {
    if (please.dom.canvas.width == please.dom._old_width && please.dom.canvas.height == please.dom._old_height) {
        return;
    }
    please.dom._old_width = please.dom.canvas.width;
    please.dom._old_height = please.dom.canvas.height;
    var ctx = please.dom.context = please.dom.canvas.getContext("2d");
    ctx.translate(please.dom.canvas.width / 2, please.dom.canvas.height / 2);
    ctx.scale(please.dom.orthographic_grid, -please.dom.orthographic_grid);
    var event = new CustomEvent("mgrl_dom_context_changed");
    window.dispatchEvent(event);
};

please.dom.pos_from_event = function (x, y) {
    var parent = please.renderer.overlay;
    return [(x - parent.clientWidth / 2) / please.dom.orthographic_grid, -(y - parent.clientHeight / 2) / please.dom.orthographic_grid];
};
