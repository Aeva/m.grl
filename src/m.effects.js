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
    // the controls for the pip position and size are expressed as percents
    effect.shader.pip_size = [25, 25];
    effect.shader.pip_coord = [70, 70];
    effect.shader.pip_alpha = 1.0;
    return effect;
};
