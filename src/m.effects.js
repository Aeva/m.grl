// - m.effects.js ----------------------------------------------------------- //


// [+] please.DiagonalWipe()
//
// Creates a RenderNode with the diagonal wipe transition effect.
//
// ```
// var effect = please.DiagonalWipe();
// effect.shader.texture_a = "old_texture.png"; // may be another RenderNode
// effect.shader.textrue_b = "new_texture.png"; // may be another RenderNode
// effect.shader.progress = 0.9; // 0.0 to 1.0
// effect.shader.blur_radius = 200; // number of pixels
// effect.shader.flip_axis = false; // defaults to false
// effect.shader.flip_direction = false; // defaults to false
// ```
//
please.DiagonalWipe = function () {
    var prog = please.gl.get_program(["splat.vert", "diagonal_wipe.frag"]);
    if (!prog) {
        prog = please.glsl("diagonal_wipe", "splat.vert", "diagonal_wipe.frag");
    }
    var effect = new please.TransitionEffect(prog);
    effect.shader.blur_radius = 10;
    return effect;
};


// [+] please.Disintegrate()
//
// Creates a RenderNode with the disintegrate transition effect.
//
// ```
// var effect = please.Disintegrate();
// effect.shader.texture_a = "old_texture.png"; // may be another RenderNode
// effect.shader.textrue_b = "new_texture.png"; // may be another RenderNode
// effect.shader.progress = 0.25; // 0.0 to 1.0
// effect.shader.px_size = 200; // grid size
// ```
//
please.Disintegrate = function () {
    var prog = please.gl.get_program(["splat.vert", "disintegrate.frag"]);
    if (!prog) {
        prog = please.glsl("disintegrate", "splat.vert", "disintegrate.frag");
    }
    var effect = new please.TransitionEffect(prog);
    effect.shader.px_size = 5;
    return effect;
};


// [+] please.PictureInPicture()
//
// Creates a RenderNode with the picture-in-picture splice effect.
//
// ```
// var effect = please.PictureInPicture();
// effect.shader.main_texture = "main_view.png"; // may be another RenderNode
// effect.shader.pip_texture = "pip_texture.png"; // may be another RenderNode
// effect.shader.pip_alpha = 1.0; // transparency of pip
// effect.shader.pip_size = [25, 25]; // percent of screen area
// effect.shader.pip_coord = [70, 70]; // percent of screen area
// ```
//
please.PictureInPicture = function () {
    var prog = please.gl.get_program(["splat.vert", "picture_in_picture.frag"]);
    if (!prog) {
        prog = please.glsl("picture_in_picture", "splat.vert", "picture_in_picture.frag");
    }
    var effect = new please.RenderNode(prog);
    effect.__hint = "picture in picture";
    // the controls for the pip position and size are expressed as percents
    effect.shader.pip_size = [25, 25];
    effect.shader.pip_coord = [70, 70];
    effect.shader.pip_alpha = 1.0;
    return effect;
};


// [+] please.DebugViewportSplitter()
//
// Creates a RenderNode which splits the screen into 9 viewports,
// overlaying the "main_texture".
//
// This works somewhat like PictureInPicture, but is less
// configurable, and gives you more PIPs in a single pass.
//
// This is controlled with the following shader params:
//
//  - effect.shader.main_texure
//  - effect.shader.enable[N]
//  - effect.shader.pips[N]
//
// Replace "N" with a number 0 - 8.  So for example, you might do:
//
// ```
// var effect = please.DebugViewportSplitter();
// effect.shader.main_texture = "some_image.png";
// effect.shader.pip = ["some_other_image.png"];
// effect.shader.activate = [true];
// ```
//
please.DebugViewportSplitter = function () {
    var prog = please.gl.get_program(["splat.vert", "debug_splitter.frag"]);
    if (!prog) {
        prog = please.glsl("debug_splitter", "splat.vert", "debug_splitter.frag");
    }
    var effect = new please.RenderNode(prog);
    effect.__hint = "debug framebuffer splitter";
    var pips = [];
    var enables = [];
    RANGE(i, 9) {
        pips.push("error");
        enables.push(false);
    }
    effect.shader.pips = pips;
    effect.shader.enable = enables;
    return effect;
};


// [+] please.FloatingPointBufferViewer()
//
// Creates a RenderNode which scales a floating point texture into a
// viewable range.  This is primarily intended for debugging.
//
// ```
// var viewer = please.FloatingPointBufferViewer();
// viewer.shader.float_buffer = some_renderer;
// viewer.shader.min_value = -1.0;
// viewer.shader.min_value = 1.0;
// ```
//
please.FloatingPointBufferViewer = function (buffer, min, max) {
    var prog = please.gl.get_program(["splat.vert", "float_viewer.frag"]);
    if (!prog) {
        prog = please.glsl("float_viewer", "splat.vert", "float_viewer.frag");
    }
    var effect = new please.RenderNode(prog);
    effect.__hint = "floating point buffer viewer";
    // the controls for the pip position and size are expressed as percents
    effect.shader.float_buffer = buffer || "error";
    effect.shader.min_value = min || 0.0;
    effect.shader.max_value = max || 1.0;
    return effect;
};


// [+] please.ScatterBlur()
//
// Creates a RenderNode for applying a fast blur effect.
//
// ```
// var effect = new please.ScatterBlur();
// effect.shader.input_texture = "some_texture.png";
// effect.shader.blur_radius = 100; // defaults to 16
// effect.shader.samples = 8; // defaults to 8, maximum is 32
// ```
//
// Note: the lower the value for 'samples', the faster the pass will
// run.
//
please.ScatterBlur = function () {
    var prog = please.gl.get_program(["splat.vert", "scatter_blur.frag"]);
    if (!prog) {
        prog = please.glsl("scatter_blur", "splat.vert", "scatter_blur.frag");
    }
    
    // handle
    var effect = new please.RenderNode(prog);
    effect.__hint = "scatter blur";
    effect.shader.blur_radius = 16;
    effect.shader.samples = 8;
    
    return effect;
};


// [ ]
//
//
please.ColorCurve = function () {
    var prog = please.gl.get_program(["splat.vert", "color_curve.frag"]);
    if (!prog) {
        prog = please.glsl("color_curve", "splat.vert", "color_curve.frag");
    }
    
    // handle
    var effect = new please.RenderNode(prog);
    effect.__hint = "color curve";
    effect.shader.red_curve = please.linear_path(0.0, 1.0);
    effect.shader.blue_curve = please.linear_path(0.0, 1.0);
    effect.shader.green_curve = please.linear_path(0.0, 1.0);
    effect.shader.value_curve = please.linear_path(0.0, 1.0);
    return effect;
};