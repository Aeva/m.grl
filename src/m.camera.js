// - m.camera.js ------------------------------------------------------------ //


// [+] please.CameraNode()
//
// Constructor function that creates a camera object to be put in the
// scene graph.  Camera nodes support both orthographic and
// perspective projection, and almost all of their properties are
// animatable.  The view matrix can be generated in one of two ways
// described below.
//
// To make a camera active, call it's "activate()" method.  If no
// camera was explicitly activated, then the scene graph will call the
// first one added that is an immediate child, and if no such camera
// still exists, then it will pick the first one it can find durring
// state sorting.
//
// The default way in which the view matrix is calculated uses the
// mat4.lookAt method from the glMatrix library.  The following
// properties provide the arguments for the library call.  Note that
// the location argument is missing - this is because the CameraNode's
// scene graph coordinates are used instead.
//
//  - **look_at** A vector of 3 values (defaults to [0, 0, 0]), null,
//    or another GraphNode.  This is the coordinate where the camera
//    is pointed at.  If this is set to null, then the CameraNode's
//    calculated world matrix is used as the view matrix.
//
//  - **up_vector** A normal vector of 3 values, indicating which way
//    is up (defaults to [0, 0, 1]).  If set to null, [0, 0, 1] will
//    be used instead
//
// If the look_at property is set to null, the node's world matrix as
// generated be the scene graph will be used as the view matrix
// instead.
//
// One can change between orthographic and perspective projection by
// calling one of the following methods:
//
//  - **set_perspective()**
//
//  - **set_orthographic()**
//
// The following property influences how the projection matrix is
// generated when the camera is in perspective mode (default
// behavior).
//
//  - **fov** Field of view, defined in degrees.  Defaults to 45.
//
// The following properties influence how the projection matrix is
// generated when the camera is in orthographic mode.  When any of
// these are set to 'null' (default behavior), the bottom left corner
// is (0, 0), and the top right is (canvas_width, canvas_height).
//
//  - **left**
//
//  - **right**
//
//  - **bottom**
//
//  - **up**
//
// The following properties influence how the projection matrix is
// generated, and are common to both orthographic and perspective
// mode:
// 
//  - **width** Defaults to null, which indicates to use the rendering
//    canvas's width instead.  For perspective rendering, width and
//    height are used to calculate the screen ratio.  Orthographic
//    rendering uses these to calculate the top right coordinate.
//
//  - **height** Defaults to null, which indicates to use the rendering
//    canvas's height instead.  For perspective rendering, width and
//    height are used to calculate the screen ratio.  Orthographic
//    rendering uses these to calculate the top right coordinate.
//
//  - **near** Defaults to 0.1
//
//  - **far** Defaults to 100.0
//
please.CameraNode = function () {
    please.GraphNode.call(this);
    this.__is_camera = true;

    // These variables are used by the __view_matrix_driver function
    // defined a ways below.  They are defined here so they do not
    // need to be reallocated every frame.
    this.__view_matrix_cache = mat4.create();
    this.__virtual_location = vec3.create();

#ifdef WEBGL
    if (please.renderer.name === "gl") {
        // code specific to the webgl renderer
        please.make_animatable_tripple(this, "look_at", "xyz", [0, 0, 0]);
        please.make_animatable_tripple(this, "up_vector", "xyz", [0, 0, 1]);
        this.__projection_mode = "perspective";
        ANI("orthographic_grid", 32);
    }
#endif

#ifdef DOM
    if (please.renderer.name === "dom") {
        // code specific to the dom renderer
        please.make_animatable_tripple(this, "look_at", "xyz", [0, 0, 0]);
        this.look_at = function() { return [this.location_x, this.location_y, 0]; };
        this.up_vector = [0, 1, 0];
        this.up_vector_x = 0;
        this.up_vector_y = 1;
        this.up_vector_z = 0;
        this.__projection_mode = "orthographic";
        this.location_z = 100.0;
        Object.freeze(this.up_vector);
        Object.freeze(this.up_vector_x);
        Object.freeze(this.up_vector_y);
        Object.freeze(this.up_vector_z);
        Object.freeze(this.__projection_mode);
        ANI("orthographic_grid", please.dom.orthographic_grid);
    }
#endif

    ANI("focal_distance", this.__focal_distance);
    ANI("depth_of_field", .5);
    ANI("depth_falloff", 10);

    ANI("fov", 45);

    ANI("left", null);
    ANI("right", null);
    ANI("bottom", null);
    ANI("top", null);
    ANI("origin_x", 0.5);
    ANI("origin_y", 0.5);

    ANI("width", null);
    ANI("height", null);
    
    ANI("near", 0.1);
    ANI("far", 100.0);

    this.mark_dirty();
    this.projection_matrix = mat4.create();

    please.make_animatable(
        this, "view_matrix", this.__view_matrix_driver, this, true);
    // HAAAAAAAAAAAAAAAAAAAAAAAAACK
    this.__ani_store.world_matrix = this.__view_matrix_driver;
};
please.CameraNode.prototype = Object.create(please.GraphNode.prototype);


please.CameraNode.prototype.__focal_distance = function () {
    // the distance between "look_at" and "location"
    return vec3.distance(this.location, this.look_at);
};


// sets the look_at channels to null, so that the camera may be
// manually oriented
please.CameraNode.prototype.unfocus = function () {
    this.look_at = [null, null, null];
    var rotation = mat3.fromMat4(
        mat3.create(), demo.main.camera.__view_matrix_cache);
    this.quaternion = quat.fromMat3(quat.create(), rotation)
};


please.CameraNode.prototype.has_focal_point = function () {
    return this.look_at[0] !== null || this.look_at[1] !== null || this.look_at[2] !== null;
};


please.CameraNode.prototype.mark_dirty = function () {
    this.__last = {
        "fov" : null,
        "left" : null,
        "right" : null,
        "bottom" : null,
        "top" : null,
        "width" : null,
        "height" : null,
        "origin_x" : null,
        "origin_y" : null,
        "orthographic_grid" : null,
    };
};


please.CameraNode.prototype.activate = function () {
    var graph = this.graph_root;
    if (graph !== null) {
        if (graph.camera && typeof(graph.camera.on_inactive) === "function") {
            graph.camera.on_inactive();
        }
        graph.camera = this;
    }
};


please.CameraNode.prototype.on_inactive = function () {
};


please.CameraNode.prototype.set_perspective = function() {
    this.__projection_mode = "perspective";
    this.mark_dirty();
};


please.CameraNode.prototype.set_orthographic = function() {
    this.__projection_mode = "orthographic";
    this.mark_dirty();
};


// This overrides the standard worldmatrix driver with camera-specific
// behavior.
please.CameraNode.prototype.__view_matrix_driver = function () {
    var parent = this.parent;

    if (this.has_focal_point()) {
        var location;
        var look_at = this.look_at;
        var up_vector = this.up_vector;
        
        if (parent) {
            location = vec3.transformMat4(
                this.__virtual_location, this.location, parent.shader.world_matrix);
        }
        else {
            location = this.location;
        }

        mat4.lookAt(
            this.__view_matrix_cache,
            location,
            look_at,
            up_vector);

        this.__view_matrix_cache.dirty = true;
        return this.__view_matrix_cache;
    }
    else if (parent && parent.is_bone) {
        // parenting a camera to a rig
        throw new Error("Parenting a camera to a rig is not supported yet");
    }
    else {
        // camera w/ free transformation
        var local_matrix = parent ? mat4.create() : this.__view_matrix_cache;
        mat4.fromRotationTranslation(
            local_matrix, this.quaternion, this.location);
        mat4.scale(local_matrix, local_matrix, this.scale);

        if (parent) {
            var parent_matrix = parent.shader.world_matrix;
            mat4.multiply(this.__view_matrix_cache, parent_matrix, local_matrix);
        }

        this.__view_matrix_cache.dirty = true;
        return this.__view_matrix_cache;
    }
};


please.CameraNode.prototype.update_camera = function () {
    // Calculate the arguments common to both projection functions.
    var near = this.near;
    var far = this.far;
    var width = this.width;
    var height = this.height;
    if (width === null) {
        width = please.renderer.width;
    }
    if (height === null) {
        height = please.renderer.height;
    }

    // Determine if the common args have changed.
    var dirty = false;
    if (far !== this.__last.far ||
        near !== this.__last.near ||
        width !== this.__last.width ||
        height !== this.__last.height) {

        dirty = true;
        this.__last.far = far;
        this.__last.near = near;
        this.__last.width = width;
        this.__last.height = height;
    }

    // Perspective projection specific code
    if (this.__projection_mode == "perspective") {
        var fov = this.fov;

        if (fov !== this.__last.fov || dirty) {
            this.__last.fov = fov;
            
            // Recalculate the projection matrix and flag it as dirty
            mat4.perspective(
                this.projection_matrix, please.radians(fov),
                width / height, near, far);
            this.projection_matrix.dirty = true;
        }
    }

    // Orthographic projection specific code
    else if (this.__projection_mode == "orthographic") {
        var left = this.left;
        var right = this.right;
        var bottom = this.bottom;
        var top = this.top;
        var orthographic_grid = this.orthographic_grid;

        if (left === null || right === null ||
            bottom === null || top === null) {

            // If any of the orthographic args are unset, provide our
            // own defaults based on the canvas element's dimensions.
            left = please.mix(0.0, width*-1, this.origin_x);
            bottom = please.mix(0.0, height*-1, this.origin_y);
            right = width + left;
            top = height + bottom;
        }

        if (left !== this.__last.left ||
            right !== this.__last.right ||
            bottom !== this.__last.bottom ||
            top !== this.__last.top ||
            orthographic_grid !== this.__last.orthographic_grid ||
            dirty) {

            this.__last.left = left;
            this.__last.right = right;
            this.__last.bottom = bottom;
            this.__last.top = top;
            this.__last.orthographic_grid = orthographic_grid;

            // Recalculate the projection matrix and flag it as dirty
            var scale = orthographic_grid;
            mat4.ortho(
                this.projection_matrix,
                left/scale, right/scale, bottom/scale, top/scale, near, far);
            this.projection_matrix.dirty = true;
        }
    }
};


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
