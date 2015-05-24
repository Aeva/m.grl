// - m.prefab.js ------------------------------------------------------------ //


// [+] please.StereoCamera()
//
// Inherits from please.CameraNode and can be used similarly.  This
// camera defines two subcameras, accessible from the properties
// "left_eye" and "right_eye".  Their position is determined by this
// object's "eye_distance" property, which should correspond to
// millimeters (defaults to 62).  The "unit_conversion" property is a
// multiplier value, and you use it to define what "millimeters" means
// to you.
//
// Ideally, the StereoCamera object should be the object that you
// orient to change the viewpoint of both cameras, and that the sub
// cameras themselves are what is activated for the purpose of saving
// color buffers.  A simple pipeline can be constructed from this to
//
// If the StereoCamera's "look_at" value is set to something other
// than [null, null, null], the child CameraNode objects will
// automatically attempt to converge on the point.  If it is desired
// that they not converge, set the StereoCamera's "auto_converge"
// parameter to false.  When auto convergance is left on, objects that
// are past the focal point will appear to be "within" the screen,
// whereas objects in front of the focal point will appear to "pop
// out" of the screen.  If the focal point is too close to the camera,
// you will see a cross eye effect.  **Important accessibility note**,
// Take care that camera.focal_distance never gets too low, or you can
// cause uneccesary eye strain on your viewer and make your program
// inaccessible to users with convergence insufficiency.
//
// Further usage:
// ```
// var camera = new please.StereoCamera();
//
// // ...
//
// please.pipeline.add(10, "vr/left_eye", function () {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     camera.left.activate();
//     graph.draw();
// }).as_texture({width: 1024, height: 1024});
//
// please.pipeline.add(10, "vr/right_eye", function () {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     camera.right.activate();
//     graph.draw();
// }).as_texture({width: 1024, height: 1024});
//
// please.pipeline.add(20, "vr/display", function () {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//     prog.samplers.left_eye = "vr/left_eye";
//     prog.samplers.right_eye = "vr/right_eye";
//     prog.vars.mode = 1.0; // to indicate between color split & other modes
//     please.gl.splat();
// });
// ```
//
please.StereoCamera = function () {
    please.CameraNode.call(this);
    ANI("eye_distance", 10.0);
    ANI("unit_conversion", 0.001);
    this.auto_converge = true;
    this.left_eye = this._create_subcamera(-1);
    this.right_eye = this._create_subcamera(1);

    this.add(this.left_eye);
    this.add(this.right_eye);
};
please.StereoCamera.prototype = Object.create(please.CameraNode.prototype);
please.StereoCamera.prototype._create_subcamera = function (position) {
    var eye = new please.CameraNode();

    // This causes various animatable properties on the eye's camera
    // to be data bound to the StereoCamera that parents it
    var add_binding = function (property_name) {
        eye[property_name] = function () {
            return this[property_name];
        }.bind(this);
    }.bind(this);
    
    ["focal_distance",
     "depth_of_field",
     "depth_fallof",
     "fov",
     "left",
     "right",
     "bottom",
     "top",
     "width",
     "height",
     "near",
     "far",
    ].map(add_binding);

    // Now we make it so the camera's spacing from the center is set
    // automatically.
    eye.location_x = function () {
        var dist = this.parent.eye_distance;
        var unit = this.parent.unit_conversion;
        return dist * unit * 0.5 * position;
    };

    // Automatic convergance
    eye.rotation_z = function () {
        if (this.parent.has_focal_point() && this.parent.auto_converge) {
            // camera_distance, half_eye_distance
            var angle = Math.atan2(this.location_x, this.parent.focal_distance);
            return please.degrees(angle * -1);
        }
        else {
            return 0;
        }
    };

    // FIXME dummy this property out entirely somehow
    eye.look_at = [null, null, null];
    
    return eye;
};


// [+] please.pipeline.add_autoscale(max_height)
//
// Use this to add a pipeline stage which, when the rendering canvas
// has the "fullscreen" class, will automatically scale the canvas to
// conform to the window's screen ratio, making the assumption that
// css is then used to scale up the canvas element.  The optional
// 'max_height' value can be passed to determine what the maximum
// height of the element may be.  This defaults to 512, though a power
// of two is not required.
//
// One can override the max_height option by setting the "max_height"
// attribute on the canvas object.
//
please.pipeline.add_autoscale = function (max_height) {
    var skip_condition = function () {
        var canvas = please.gl.canvas;
        return !canvas || !canvas.classList.contains("fullscreen");
    };
    please.pipeline.add(-1, "mgrl/autoscale", function () {
        // automatically change the viewport if necessary
        var canvas = please.gl.canvas;
        if (canvas.max_height === undefined) {
            canvas.max_height = max_height ? max_height : 512;
        }
       
        var window_w = window.innerWidth;
        var window_h = window.innerHeight;

        var ratio = window_w / window_h;
        var set_h = Math.min(canvas.max_height, window.innerHeight);
        var set_w = Math.round(set_h * ratio);
        
        var canvas_w = canvas.width;
        var canvas_h = canvas.height;
        if (set_w !== canvas_w || set_h !== canvas_h) {
            canvas.width = set_w;
            canvas.height = set_h;
            gl.viewport(0, 0, set_w, set_h);
        }
    }).skip_when(skip_condition);
};


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