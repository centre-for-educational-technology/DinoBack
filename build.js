function get_arguments(args, begin, limit) {
	begin = begin || 0;
	limit = limit || args.length;
	var ret = [];
	for (var i = begin; i < limit; i++) ret.push(args[i]);
	return ret;
}

//	build

function build(tag_name, class_name, parent, data) {
	var el;
	var data_args = get_arguments(arguments, 3);

	switch (tag_name) {
		case "custom_input":
			el = build.input.apply(this, data_args);
			break;
		case "custom_dropdown":
			el = build.dropdown.apply(this, data_args);
			break;
		case "custom_checkbox":
			el = build.checkbox.apply(this, data_args);
			break;
		case "custom_radio":
			el = build.radio.apply(this, data_args);
			break;
		case "custom_form":
			el = build.form.apply(this, data_args);
			break;
		case "custom_button":
			el = build.button.apply(this, data_args);
			break;
		case "custom_message":
			el = build.message.apply(this, data_args);
			break;
		default:
			el = document.createElement(tag_name);
			if ("innerHTML" in el && data !== undefined) el.innerHTML = data;
	}
	if (class_name !== undefined) el.className = class_name;
	if (parent !== undefined) parent.appendChild(el);
	
	return el;
};

//	utils

build.add_label = function(el) {
	var label = build("label", undefined, el);
	
	Object.defineProperty(el, "label", {
		"get" : function() { return label.innerText === "" ? undefined : label.innerText; },
		"set" : function(v) { label.innerText = v === undefined ? "" : v; }
	});
};

build.hook_event = function(el, name, hook_event_func) {
	var container_name = "build_hook_event_" + name;
	if (!(container_name in el)) el[container_name] = {
		"hooked_callbacks" : [],
		"original_addEventListener" : el.addEventListener,
		"original_removeEventListener" : el.removeEventListener
	};
	var container = el[container_name];
	
	el.addEventListener = function() {	
		if (arguments[0] === name) {
			var original_callback = arguments[1];
			var hook_callback = function(e) {
				if (hook_event_func(e)) original_callback(e);
			}
			arguments[1] = hook_callback;
			container.hooked_callbacks.push([original_callback, hook_callback]);
		}
		return container.original_addEventListener.apply(this, arguments);
	}
	
	el.removeEventListener = function() {
		if (arguments[0] === "changed") {
			var original_callback = arguments[1];
			for (var i = 0; i < container.hooked_callbacks.length; i++) {
				if (container.hooked_callbacks[i][0] == original_callback) {
					arguments[1] = container.hooked_callbacks[i][1];
					break;
				}
			}
		}
		return container.original_removeEventListener.apply(this, arguments);
	}
};

//	button

build.button = function(_value, _event_name, _label) {
	var el = build("div");
	el.setAttribute("data-build", "button");
	build.add_label(el);
	var input = build("button", undefined, el);
	input.type = "button";
	
	Object.defineProperty(el, "value", {
		"get" : function() { return input.innerText; },
		"set" : function(v) { input.innerText = v; }
	});
	
	if (_event_name === undefined) _event_name = _value;
	el.event_name = _event_name;
	var click_event = new CustomEvent(_event_name);
	input.addEventListener("click", function() { el.dispatchEvent(click_event); });

	el.click = function() {
		el.dispatchEvent(click_event);
	}
	
	el.label = _label;
	el.value = _value;
	
	return el;
}

//	message

build.message = function(_label, _value) {
	var el = build("div");
	el.setAttribute("data-build", "message");
	build.add_label(el);
	var output = build("div", undefined, el);
	
	Object.defineProperty(el, "value", {
		"get" : function() { return output.innerText; },
		"set" : function(v) { output.innerText = v; }
	});
	
	el.show = function(time_ms) {
		el.setAttribute("data-show_message", "");
		if (time_ms !== undefined) { 
			setTimeout(function() {
				el.removeAttribute("data-show_message");
			}, time_ms);
		}
	}
	
	el.label = _label;
	el.value = _value;
	return el;
}

//	input

build.input = function(_label, _value) {
	var el = build("div");
	el.setAttribute("data-build", "input");
	build.add_label(el);
	var inp = build("div", undefined, el);
	inp.type = "text";	
	inp.contentEditable = true;
	inp.spellcheck = false;
	
	el.addEventListener("mouseover", function() { el.setAttribute("data-hover", ""); });
	el.addEventListener("mouseout", function() { el.removeAttribute("data-hover", ""); });	
	el.addEventListener("mouseup", function() { inp.focus(); });
	inp.addEventListener("focus", function() { el.setAttribute("data-focus", ""); });
	inp.addEventListener("blur", function() { el.removeAttribute("data-focus"); });
	
	var changed_event = new CustomEvent("changed");
	inp.addEventListener("keyup", function(e) { el.dispatchEvent(changed_event); });
	inp.addEventListener("mouseup", function(e) { el.dispatchEvent(changed_event); });

	var current_value = undefined;
	build.hook_event(el, "changed", function(e) {
		e.value = el.value;
		
		if (el.value !== current_value) {
			current_value = el.value;
			return true;
		}
	});
	
	Object.defineProperty(el, "value", {
		"get" : function() { return inp.innerText === "" ? undefined : inp.innerText; },
		"set" : function(v) { inp.innerText = v === undefined ? "" : v; }
	});

	el.make_password = function() {
		inp.style.fontFamily = "password";
		return el;
	};

	el.make_read_only = function() {
		inp.contentEditable = false;
		return el;
	};

	el.add_on_enter = function(callback) {
		inp.addEventListener("keypress", function(e) {
			if (e.keyCode == "13") {
				var val = el.value;
				callback();
				e.preventDefault();
				return false;
			}
		});
		return el;
	}
	
	el.label = _label;
	el.value = _value;
	current_value = el.value;
	var reset_value = el.value;
	
	el.reset = function() { el.value = reset_value; }

	return el;
}

//	checkbox

build.checkbox = function(_label, _value) {	
	var el = build("div");
	el.setAttribute("data-build", "checkbox");	
	build.add_label(el);
	var inp = build("input", undefined, el);
	inp.type = "checkbox";
	
	el.addEventListener("mouseover", function() { el.setAttribute("data-hover", ""); });
	el.addEventListener("mouseout", function() { el.removeAttribute("data-hover", ""); });	
	el.addEventListener("mouseup", function() { inp.focus(); });
	inp.addEventListener("focus", function() { el.setAttribute("data-focus", ""); });
	inp.addEventListener("blur", function() { el.removeAttribute("data-focus"); });
	
	var changed_event = new CustomEvent("changed");
	el.addEventListener("click", function(e) { if (e.target === inp) return; el.value = !el.value; el.dispatchEvent(changed_event); });
	inp.addEventListener("keyup", function(e) { el.dispatchEvent(changed_event); });
	inp.addEventListener("click", function(e) { el.dispatchEvent(changed_event); });
	
	var current_value = undefined;
	build.hook_event(el, "changed", function(e) {
		e.value = el.value;
		
		if (el.value !== current_value) {
			current_value = el.value;
			return true;
		}
	});


	Object.defineProperty(el, "value", {
		"get" : function() { return inp.checked; },
		"set" : function(v) { inp.checked = v; }
	});	
	
	el.label = _label;
	el.value = _value;
	current_value = el.value;
	
	var reset_value = el.value;	
	el.reset = function() { el.value = reset_value; }
	
	return el;
}



//	dropdown

build.dropdown = function(_label, _options, _value) {
	var el = build("div");
	el.setAttribute("data-build", "dropdown");
	build.add_label(el);
	var inp = build("select", undefined, el);
	
	var current_value = undefined;
	build.hook_event(el, "changed", function(e) {
		e.options = el.options;
		e.value = el.value;
		
		if (el.value !== current_value) {		
			current_value = el.value;
			return true;
		}	
	});
	
	el.addEventListener("mouseover", function() { el.setAttribute("data-hover", ""); });
	el.addEventListener("mouseout", function() { el.removeAttribute("data-hover", ""); });
	el.addEventListener("mouseup", function() { inp.focus(); });
	inp.addEventListener("focus", function() { el.setAttribute("data-focus", ""); });
	inp.addEventListener("blur", function() { el.removeAttribute("data-focus"); });
	
	var changed_event = new CustomEvent("changed");
	inp.addEventListener("keyup", function(e) { el.dispatchEvent(changed_event); });
	inp.addEventListener("mouseup", function(e) { el.dispatchEvent(changed_event); });
	
	Object.defineProperty(el, "options", {
		"get" : function() { 
			var options = inp.querySelectorAll("option");
			var ret = {};
			for (var i = 0; i < options.length; i++) ret[options[i].value] = options[i].innerText;
			return ret;
		},
		"set" : function(v) {
			inp.innerHTML = "";
			if (v === undefined) return;
			if (v.constructor == [].constructor) {
				var vv = v;
				v = {};
				for (var i = 0; i < vv.length; i++) v[vv[i]] = vv[i];
			}
			for (var value in v) {
				var title = v[value];
				build("option", undefined, inp, title).value = value;
			}
			current_value = el.value;
		}
	});
	Object.defineProperty(el, "value", {
		"get" : function() {
			var options = inp.querySelectorAll("option");
			for (var i = 0; i < options.length; i++) {
				if (options[i].selected == true) return options[i].value;
			}			
		},
		"set" : function(v) {
			var options = inp.querySelectorAll("option");
			for (var i = 0; i < options.length; i++) {
				if (options[i].value == v) {
					options[i].selected = true;
					current_value = v;
				}
			}
		}
	});
	
	el.label = _label;
	el.options = _options;
	el.value = _value;	
	current_value = el.value;
	
	reset_value = el.value;
	el.reset = function() { el.value = reset_value; }

	return el;
}

//	menu
build.menu = function(_label, _options) {
	var el = build("div");
	el.setAttribute("data-build", "menu");
	build.add_label(el);
	var inp = build("div", undefined, el);
	
	Object.defineProperty(el, "options", {
		"get" : function() {
			var options = inp.querySelectorAll("[data-build=button]");
			var ret = [];
		}
	});
}

//	radio

build.radio = function(_label, _options, _value) {
	var el = build("div");
	el.setAttribute("data-build", "radio");
	build.add_label(el);
	var inp = build("div", undefined, el);

	var current_value = undefined;
	build.hook_event(el, "changed", function(e) {
		e.options = el.options;
		e.value = el.value;
		
		if (el.value !== current_value) {
			current_value = el.value;
			return true;
		}	
	});
	
	el.addEventListener("mouseover", function() { el.setAttribute("data-hover", ""); });
	el.addEventListener("mouseout", function() { el.removeAttribute("data-hover", ""); });

	var changed_event = new CustomEvent("changed");	

	Object.defineProperty(el, "options", {
		"get" : function() { 
			var options = inp.querySelectorAll("input");
			var ret = {};
			for (var i = 0; i < options.length; i++) ret[options[i].value] = options[i].parentElement.innerText;
			return ret;
		},
		"set" : function(v) {
			inp.innerHTML = "";
			if (v === undefined) return;
			if (v.constructor == [].constructor) {
				var vv = v;
				v = {};
				for (var i = 0; i < vv.length; i++) v[vv[i]] = vv[i];
			}
			
			var all_rads = [];
			var changed_raiser = function(e) {
				var selected_rad = undefined;
				if (all_rads.indexOf(e.target) !== -1) selected_rad = e.target;
				if (all_rads.indexOf(e.target.children[0]) !== -1) selected_rad = e.target.children[0];
				if (selected_rad === undefined) return;
				
				for (var i = 0; i < all_rads.length; i++) {
					if (selected_rad === all_rads[i]) {
						all_rads[i].checked = true;
						all_rads[i].parentElement.setAttribute("data-checked", "");
					} else {
						all_rads[i].checked = false;
						all_rads[i].parentElement.removeAttribute("data-checked");
					}
				}
				el.dispatchEvent(changed_event);
			};
			
			for (var value in v) {
				var title = v[value];
				var lab = build("label", undefined, inp, title);
				var rad = build("input", undefined, lab);
				all_rads.push(rad);
				rad.type = "radio"
				rad.value = value;
				
				rad.addEventListener("focus", function() { el.setAttribute("data-focus", ""); });
				rad.addEventListener("blur", function() { el.removeAttribute("data-focus"); });
				
				rad.addEventListener("keyup", changed_raiser);
				rad.addEventListener("mouseup", changed_raiser);
				lab.addEventListener("mouseup", changed_raiser);
			}
			current_value = el.value;
		}
	});
	Object.defineProperty(el, "value", {
		"get" : function() {
			var options = inp.querySelectorAll("input");
			for (var i = 0; i < options.length; i++) {
				if (options[i].checked == true) return options[i].value;
			}			
		},
		"set" : function(v) {
			var options = inp.querySelectorAll("input");
			for (var i = 0; i < options.length; i++) {
				if (options[i].value == v) {
					options[i].checked = true;
					options[i].parentElement.setAttribute("data-checked", "");
					current_value = v;
				} else {
					options[i].checked = false;
					options[i].parentElement.removeAttribute("data-checked");
				}
			}
		}
	});
	
	
	el.label = _label;
	el.options = _options;
	el.value = _value;
	current_value = el.value;

	var reset_value = el.value;
	el.reset = function() { el.value = reset_value; }
	
	return el;
}

//	form
build.form = function(_label) {
	var el = build("form");
	el.setAttribute("data-build", "form");
	build.add_label(el);
	
	var changed_event = new CustomEvent("changed");	
	var reset_event = new CustomEvent("reset");
	
	el.data = {};
	el.data_raw = {};
	el.build_components = {};
	
	el.reset = function() {
		for (var key in el.build_components) el.build_components[key].reset();
	};
	
	function register_component(component, name) {
		el.build_components[name] = component;
		
		el.data_raw[name] = component.value;
		Object.defineProperty(el.data, name, {
			"get" : function() { return component.value; },
			"set" : function(v) { component.value = v; }
		});
		
		component.addEventListener("changed", function(e) {
			el.data_raw[name] = component.value;
			el.dispatchEvent(changed_event);
		});
		return component;
	}
	
	el.build = function(name, class_name) {
		return {
			"input" : function(label, value) {
				return register_component(build("custom_input", class_name, el, label, value), name);
			},
			"checkbox" : function(label, value) {
				return register_component(build("custom_checkbox", class_name, el, label, value), name);
			},
			"dropdown" : function(label, options, value) {
				return register_component(build("custom_dropdown", class_name, el, label, options, value), name);
			},
			"radio" : function(label, options, value) {
				return register_component(build("custom_radio", class_name, el, label, options, value), name);
			},
			"button" : function(value, label) {			
				var button = build("custom_button", class_name, el, value, name, label);
				var ev = new CustomEvent(button.event_name,);
				button.addEventListener(button.event_name, function() { el.dispatchEvent(ev); });
				if (button.event_name == "reset") button.addEventListener("reset", function() { el.reset(); el.dispatchEvent(reset_event); });
				return button;
			},
			"message" : function(label, value) {
				return build("custom_message", class_name, el, label, value);
			}
		};
	};
	
	el.label = _label;
	
	return el;
}









