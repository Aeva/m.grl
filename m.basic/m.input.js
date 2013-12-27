// - m.input.js ------------------------------------------------------------- //


// module data
please.input = {
    // data
    "groups" : {},
    "bindings" : {},

    // constructors :P
    "__GroupObject" : function (group_name) {},
    "__KeyBinding" : function (group) {},

    // handlers
    "__lost_focus" : function () {},
    "__on_event" : function (key_code) {},
    "__clear_event" : function (key_code) {},

    // support functions
    "__cancel_all" : function () {},
    "__dom_event" : function (e) {},
    "__dom_cancel" : function (e) {},
    "__dom_block" : function (e) {},
};




/*----------------------*\
| API methods:           |
\*----------------------*/

// Call this to activate m.input.  You should do this after the window
// object's onload event is fired.
please.enable_input = function () {
    addEventListener("keydown", please.input.__dom_event);
    addEventListener("keyup", please.input.__dom_cancel);
    addEventListener("keypress", please.input.__dom_event);
};


// Call this to disable input control.  This shouldn't remove
// keybindings.
please.disable_input = function () {
    please.input.__cancel_all();
    removeEventListener("keydown", please.input.__dom_event);
    removeEventListener("keyup", please.input.__dom_cancel);
    removeEventListener("keypress", please.input.__dom_event);
};


// Creates a new group and returns a binding object for it.  
// Returns false if the named group is already registered.
please.create_input_group = function (group_name) {
    if (!please.input.groups[group_name]) {
	please.input.groups[group_name] = new please.input.__GroupObject(group_name);
	return please.input.groups[group_name];
    }
    else {
	return false;
    }
};


// binds a key to a group:
please.bind_key = function (group_name, keycode) {
    if (please.input.groups[group_name] !== undefined) { 
	please.input.bindings[keycode] = new please.input.__KeyBinding(
            please.input.groups[group_name]);
	please.input.groups[group_name].__register(keycode);
    };
};


// Removes a group and clears related timers and key bindings.
please.unlink_group = function(group_name) {
    please.input.groups[group_name].__tear_down();
    delete please.input.groups[group_name];
};




/*----------------------*\
| Constructor Functions  |
\*----------------------*/


// Constructor function.  The input handler abstracts the key/group thing.
please.create_input_handler = function (group_name, keys) {
    var self=this;
    this.group = please.create_input_group(group_name);
    this.state = "idle";

    this.active = [];

    this.group.on_update = function (hint, age, active_keys) {
        var new_state = "idle";
	if (hint !== "cancel") {
	    if (age >= 1000) {
		new_state = "long";
	    }
	    else {
		new_state = "short";
	    }
	}

        var keychange = active_keys.length === self.active.length;
        for (var i=0; i<active_keys.length; i+=1) {            
            if (self.active.indexOf(active_keys[i]) === -1) {
                keychange = true;
                break;
            }
        }

        if (keychange || new_state !== self.state) {
            self.state = new_state;
            self.active = active_keys;
            self.on_state_change(self.state, self.active);
        }
    };

    this.group.on_tear_down = function () {
	self.group = false;
    };

    // handler
    this.on_state_change = function (state, active_keys) {}

    for (var i=0; i<keys.length; i+=1) {
	please.bind_key(group_name, keys[i]);
    };
};


// Define GroupObject constructor - these guys, also known as "input
// groups" are sets of related keybindings.  They are not intended to
// be interacted with directly.
please.input.__GroupObject = function(group_name) {
    var self = this;
    this.keys = [];
    var timestamp = 0;
    var inactive = true;
    
    this.__defineGetter__("name", function () { return group_name });
    
    this.__register = function(key_code) {
	// Used internally only.  Registers a keycode with this group.
	self.keys.push(key_code);
    };
    
    this.__remove_binding = function(key_code) {
	self.keys = self.keys.splice(self.keys.indexOf(key_code),1);
	please.input.bindings[key_code].cancel(false);
    };
    
    this.__tear_down = function() {
	// Used internally.  Removes all bindings, and does anything else
	// that might be needed when the event is removed.
	for (var i=0; i<self.keys.length; i+=1) {
	    self.__remove_binding(self.keys[i]);
	}
	self.on_update("cancel", 0);
	self.on_tear_down();
    }
    
    this.__send_update = function(hint) {
	// Used internally to send an update event, abstractly 
	// representing all of the bound keys.
	var age = -1;
	var active = [];
	for (var i=0; i<self.keys.length; i+=1) {
	    var binding = please.input.bindings[self.keys[i]];
	    if (binding.active) {
		active.push(self.keys[i]);
	    }
	}
	if (active.length === 0) {
	    self.on_update("cancel", 0, active);
	    inactive = true;
	}
	else {
	    if (inactive) {
		inactive = false;
		timestamp = Date.now();
		self.on_update("hold", 0, active);
	    }
	    else {
		self.on_update("hold", Date.now()-timestamp, active);
	    }
	}
    };

    this.cancel = function() {
	// Cancel all associated pending key events:
	for (var i=0; i<self.keys.length; i+=1) {
	    please.input.bindings[self.keys[i]].cancel(false);
	}
	self.__send_update("cancel");
    };
    
    this.on_tear_down = function() {
	// this is a stub
    };
    
    this.on_update = function(hint, age, active_keys) {
	// this is a stub
    };
};


// Define GroupObject constructor - these guys, also known as "input
// groups" are sets of related keybindings.  They are not intended to
// be interacted with directly.
please.input.__KeyBinding = function(group) {
    var self = this;
    var pause_time = .05;
    this.timer = false;
    this.age = 0;
    this.active = false;

    this.trigger = function () {
	self.age += pause_time;
	self.active = true;
	self.timer = window.setTimeout(self.trigger, pause_time * 1000);
	group.__send_update();
    };
    
    this.cancel = function (by_dom) {
	if (self.timer !== false) {
	    window.clearTimeout(this.timer);
	    self.timer = false;
	}
	self.age = 0;
	self.active = false;
	if (by_dom === true) {
	    group.__send_update();
	}
    };
};




/*------------------------*\
| Various handlers:        |
\*------------------------*/


// Called when window focus is lost
please.input.__lost_focus = function () {
    for (var key in please.input.bindings) {
	please.input.bindings[key].cancel(true)
    }
};


please.input.__on_event = function(key_code) {
    if (please.input.bindings[key_code] !== undefined && !please.input.bindings[key_code].active) {
	please.input.bindings[key_code].trigger();
    }
}

please.input.__clear_event = function(key_code) {
    if (please.input.bindings[key_code] !== undefined) {
	please.input.bindings[key_code].cancel(true);
    }
}




/*-----------------------------------*\
| Low level dom abstraction handlers: |
\*-----------------------------------*/

please.input.__cancel_all = function () {
    for (var i=0; i<please.input.please.input.groups.length; i+=1) {
	please.input.please.input.groups[i].cancel();
    }
};


please.input.__dom_event = function (e) {
    var key = e.keyCode;
    please.input.__on_event(key);
    if (please.input.bindings[key]) {
        e.preventDefault();
    }
};


please.input.__dom_cancel = function (e) {
    var key = e.keyCode;
    please.input.__clear_event(key);
    if (please.input.bindings[key]) {
        e.preventDefault();
    }
};


please.input.__dom_block = function (e) {
    if (please.input.bindings[e.keyCode]) {
        e.preventDefault();
    }
};


/*------------*\
| Wire it up:  |
\*------------*/
window.addEventListener("blur", please.input.__lost_focus);