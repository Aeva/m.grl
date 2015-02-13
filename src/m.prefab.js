// - m.prefab.js ------------------------------------------------------------ //


// [+] please.StereoCamera
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
// Further usage:
// ```
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
    this.left_eye = this._create_subcamera(-1);
    this.right_eye = this._create_subcamera(1);
    this.add(this.left);
    this.add(this.right);
};
please.StereoCamera._create_subcamera = function (position) {
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

    return eye;
};
please.StereoCamera.prototype = Object.create(please.GraphNode.prototype);