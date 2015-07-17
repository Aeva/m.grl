// - m.particles.js --------------------------------------------------------- //

/* [+]
 *
 * This file provides M.GRL's particle system.
 * 
 */


// [+] please.ParticleEmitter(asset, span, limit, setup, update, ext)
//
please.ParticleEmitter = function (asset, span, limit, setup, update, ext) {    
    please.GraphNode.call(this);
    this.__is_particle_tracker = true;
    this.__drawable = true;
    this.billboard = 'particle';
    this.draw_type = "sprite";
    this.sort_mode = "alpha";

    var tracker = this.__tracker = {};
    if (typeof(asset.instance) === "function") {
        var instance_args = [];
        if (asset.__mgrl_asset_type === "img") {
            instance_args = [true];
        }
        tracker.asset = asset;
        tracker.stamp = asset.instance(true);
        tracker.stamp.use_manual_cache_invalidation();
        tracker.animated = !!tracker.stamp.play;
    }
    else {
        throw("Invalid asset.  Did you pass a GraphNode by mistake?");
    }

    this.__ani_cache = tracker.stamp.__ani_cache;
    this.__ani_store = tracker.stamp.__ani_store;
    
    console.assert(typeof(span) === "number" || typeof(span) === "function");
    console.assert(typeof(limit) === "number");
    console.assert(typeof(setup) === "function");
    console.assert(typeof(update) === "function");
    
    tracker.span = span;
    tracker.limit = limit;
    tracker.setup = setup.bind(this);
    tracker.update = update.bind(this);

    var struct = [
        ["start" , 1],
        ["expire", 1],
        ["world_matrix", 16],
    ];
    if (ext) {
        ITER_PROPS(name, ext) {
            var prop = ext[name];
            if (typeof(prop) === "number") {
                struct.push([name, 1]);
            }
            else if (prop.length) {
                struct.push([name, prop.length]);
            }
        }
        tracker.defaults = ext;
    }
    else {
        tracker.defaults = {};
    }

    tracker.var_names = [];
    ITER(i, struct) {
        tracker.var_names.push(struct[i][0]);
    };

    tracker.blob = new please.StructArray(struct, tracker.limit);
    tracker.view = new please.StructView(tracker.blob);
    tracker.last = window.performance.now();
    tracker.live = 0;
};
please.ParticleEmitter.prototype = Object.create(please.GraphNode.prototype);


// Add a new particle to the system
please.ParticleEmitter.prototype.rain = function () {
    var args = [this.__rain.bind(this), 0];
    for (var i=0; i<arguments.length; i+=1) {
        args.push(arguments[i]);
    }
    window.setTimeout.apply(window, args);
};


// Add a new particle to the system
please.ParticleEmitter.prototype.__rain = function () {
    var tracker = this.__tracker;
    if (tracker.live === tracker.limit) {
        console.error("Cannot add any more particles to emitter.");
        return;
    }
    var p_index = tracker.live;
    var particle = tracker.view;
    particle.focus(p_index);
    
    // upload defaults if applicable
    if (tracker.defaults) {
        ITER_PROPS(name, tracker.defaults) {
            var start = tracker.defaults[name];
            if (typeof(start) === "number") {
                start = [start];
            }
            ITER(i, start) {
                particle[name][i] = start[i];
            }
        }
    }

    // initialize builtins
    var now = window.performance.now();
    var span = DYNAMIC(tracker.span);
    particle["start"][0] = now;
    particle["expire"][0] = now + span;
    mat4.copy(particle["world_matrix"], this.shader.world_matrix);
    
    // call the particle initialization method
    var args = [particle];
    for (var i=0; i<arguments.length; i+=1) {
        args.push(arguments[i]);
    }
    tracker.setup.apply(this, args);
    tracker.live += 1;
};


// Create a new particle system with the same params as this one
please.ParticleEmitter.prototype.copy = function () {
    return new please.ParticleEmitter(
        this.__tracker.asset, this.__tracker.span, this.__tracker.limit,
        this.__tracker.setup, this.__tracker.update, this.__tracker.defaults);
};


// Clear out all active particles from this system
please.ParticleEmitter.prototype.clear = function () {
    this.__tracker.live = 0;
};


// Wrap the bind function for our 'stamp'
please.ParticleEmitter.prototype.bind = function () {
    if (this.__tracker.live > 0 && this.__tracker.stamp.bind) {
        this.__tracker.stamp.bind();
    }
};


// Update and draw the particle system
please.ParticleEmitter.prototype.draw = function () {
    var prog = please.gl.get_program();
    var tracker = this.__tracker;
    var particle = tracker.view;
    var now = please.pipeline.__framestart;
    var delta = now - tracker.last;
    tracker.last = now;

    RANGE(i, tracker.live) {
        particle.focus(i);
        if (now < particle["expire"][0]) {
            // The particle is alive, so we will figure out its
            // current age, and call the update function on it, and
            // then draw the particle on screen.
            tracker.update.call(this, particle, delta);
            ITER(n, tracker.var_names) {
                var name = tracker.var_names[n];
                if (prog.vars.hasOwnProperty(name)) {
                    prog.vars[name] = particle[name];
                }
            }            
            // FIXME if the 'stamp' is animated, then we should adjust
            // the animation frame accordingly before drawing.  This
            // might be only really possible with ganis, but that is ok.
            tracker.stamp.draw();
        }
        else {
            // The particle is dead, so it should be removed.  This is
            // done by writting it over with the information about the
            // last particle in the blob, and decrementing the
            // particle counter.  The 'i' index is also decremented so
            // as a new particle is now in the same slot.
            this.__on_die(i);
            i -= 1;
        }
    }
};


// Called to remove a dead particle
please.ParticleEmitter.prototype.__on_die = function(index) {
    var tracker = this.__tracker;
    tracker.view.dub(tracker.live-1, index);
    tracker.live -= 1;
};