// - m.prefab.js ------------------------------------------------------------ //


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


// [+] please.LoadingScreen()
//
// Creates a simple loading screen placeholder RenderNode.
//
// In the future, this will be animated to show the progress of
// pending assets.
//
please.LoadingScreen = function () {
    var graph = new please.SceneGraph();
    var camera = new please.CameraNode();
    camera.look_at = function () { return [0.0, 0.0, 0.0]};
    camera.location = [0.0, 0.0, 100];
    camera.up_vector = [0, 1, 0];
    camera.set_orthographic();
    camera.orthographic_grid = 64;

    var container = new please.GraphNode();
    var girl = please.access("girl_with_headphones.png").instance();
    girl.location = [-10, -1, 0];
    girl.rotation_x = 0;
    var label = please.access("loading.png").instance();
    label.location = [-6, -1, 1];
    label.rotation_x = 0;
    label.scale = [16, 16, 16];

    container.add(girl);
    container.add(label);
    graph.add(container);
    graph.add(camera);
    camera.activate();
    
    var effect = new please.RenderNode("default");
    effect.graph = graph;
    return effect;
};


// [+] please.StereoSplit
//
//