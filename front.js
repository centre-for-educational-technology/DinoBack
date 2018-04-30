function safecall() { if (isdef(arguments[0])) { arguments[0].apply(this, Array.prototype.splice.call(arguments, 1));} }
function isdef(x) { return x !== undefined; }
function ajax_anim(enabled) {

}

function fpad0(s, len) {
	s = "" + s;
	while (s.length < len) {
		s = "0" + s;
	}
	return s;
}

function is_numeric(s) {
	var palette = "123456789.";
	for (i = 0; i < s.length; i++) if (palette.indexOf(s[i]) == -1) return false;
	return true;
}

function add_table_sorters(th) {
	var el = th;
	while (th.tagName !== "TH") {
		th = th.parentElement;
	}

	var idx = -1;
	var th_tr = th.parentElement;
	for (var i = 0; i < th_tr.children.length; i++) {
		if (th_tr.children[i] == th) {
			idx = i; break;
		}
	}

	var gather_sortables = function() {
		var table = th_tr.parentElement;
		var sortables = [];

		for (var i = 0; i < table.children.length; i++) {
			var tr = table.children[i];
			var td = tr.children[idx];
			if (td.tagName == "TH") continue;

			var value = td.innerText;
			if (td.hasAttribute("data-sort_value")) value = td.getAttribute("data-sort_value");

			var sortable = { "tr" : tr, "td" : td, "value" : value} ;
			sortables.push(sortable);
		} 
		return sortables;
	}

	var sort_ascending = function() {
		var sortables = gather_sortables();
		sortables.sort(function(a,b) { return a.value - b.value; });
			
		for (var i = 0; i < sortables.length; i++) {
			var tr = sortables[i].tr;
			var table = tr.parentElement;
			table.removeChild(tr);
			table.appendChild(tr);
		}
	}

	var sort_descending = function() {
		var sortables = gather_sortables();
		sortables.sort(function(a,b) { return b.value - a.value; });
			
		for (var i = 0; i < sortables.length; i++) {
			var tr = sortables[i].tr;
			var table = tr.parentElement;
			table.removeChild(tr);
			table.appendChild(tr);
		}
	}

	var filter = function(regex) {
		var pattern = new RegExp(regex);
		var sortables = gather_sortables();
		for (var i = 0; i < sortables.length; i++) {
			if (pattern.test(sortables[i].value)) {
				sortables[i].tr.removeAttribute("data-hide");
			} else {
				sortables[i].tr.setAttribute("data-hide", "");
			}
		}
	}

	var el_sort = build("div", "sort_bar", el);

	var el_sort_asc = build("div", "sort_asc_button", el_sort, "&#x25B2");
	el_sort_asc.addEventListener("click", sort_ascending);
	var el_sort_des = build("div", "sort_des_button", el_sort, "&#x25BC");
	el_sort_des.addEventListener("click", sort_descending);
	var el_sort_filter = build("custom_input", undefined, el_sort);
	el_sort_filter.addEventListener("changed", function() {filter(el_sort_filter.value);});

}

function timestamp_to_date(ts) {
	var d = new Date(ts * 1000);
	var s = fpad0(d.getHours(), 2) + ":" + fpad0(d.getMinutes(), 2) + ":" + fpad0(d.getSeconds(), 2) + " " + fpad0(d.getDate(), 2) + "." + fpad0(d.getMonth(), 2) + "." + fpad0(d.getFullYear(), 4);
	return s;
}

function ajax(method, obj, callback_success, callback_error, timeout_ms) {
	if (ajax.complete == false) return;
	ajax.complete = false;

	ajax_anim(true);
	if (obj === undefined) obj = {};
    var request = new XMLHttpRequest();
	
	
	if (isdef(timeout_ms)) {
		setTimeout(function() {
			if (ajax.complete) return;
			ajax.complete = true;
			ajax_anim(false);
			safecall(callback_error, {"result":"error_timeout"});
		}, timeout_ms);
	}
	
    request.onreadystatechange = function () {
		if (ajax.complete) return;
        if (request.readyState == 4 && request.status == 200) {
			console.log("RESPONSE: " + request.responseText);	
			ajax.complete = true;
			ajax_anim(false);
			var obj;
			try {
				obj = JSON.parse(request.responseText);
			} catch(e) {
				safecall(callback_error, {"result":"error_json"});
			}
			if (!isdef(obj)) {
				safecall(callback_error, {"result":"error_json"});
			} else if (obj.result == "success") {
				if (isdef(obj.arg)) {
					obj = obj.arg;
				}
				safecall(callback_success, obj);
			} else {
				safecall(callback_error, obj);
			}
        } else if (request.status == 404) {
			ajax.complete = true;
			ajax_anim(false);
			safecall(callback_error, {"result":"error_404"});
		}
    };
	
    request.open("POST", "ajax.php?method=" + method, true);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(JSON.stringify(obj));
}






addEventListener("load", function() {
	var login_container = build("div", "login_container", document.body);
	var data_container = build("div", "data_container", document.body);
	var menu_container = build("div", "menu_container", document.body);

	function load_data_index() {
		data_container.innerHTML = "";

		var table = build("table", undefined, data_container);
		var hr = build("tr", undefined, table);

		var header_names = ["ID", "Date", "Origin", "Endpoint"];
		for (var i = 0; i < header_names.length; i++) {
			var th = build("th", undefined, hr);
			var th_content = build("div", "th_content", th);
			var label = build("label", undefined, th_content, header_names[i]);
			add_table_sorters(th_content);
		}

		var th_check_all = build("th", undefined, hr);
		var el_check_all = build("custom_checkbox", undefined, th_check_all);
		el_check_all.addEventListener("changed", function() {
			var checkboxes = table.querySelectorAll('[data-build="checkbox"]');
			for (var i = 0; i < checkboxes.length; i++) {
				if (checkboxes[i] == el_check_all) continue;
				checkboxes[i].value = el_check_all.value;
				var tr = checkboxes[i];
				while (tr.tagName !== "TR") tr = tr.parentElement;
				if (tr.hasAttribute("data-hide")) checkboxes[i].value = false;
			}
		});

		ajax("get_data", {}, function(result) {
			for (var i = 0; i < result.data.length; i++) {
				var item = result.data[i];
				var tr = build("tr", undefined, table);
				build("td", undefined, tr, item.id);

				var el_date = build("td", undefined, tr, timestamp_to_date(item.date));
				el_date.setAttribute("data-sort_value", item.date);

				build("td", undefined, tr, item.origin);
				build("td", undefined, tr, item.endpoint);

				var el_dl = build("td", undefined, tr);
				var el_check = build("custom_checkbox", undefined, el_dl);
				el_check.setAttribute("data-download_item_id", item.id);
			}
		}, function() {
			alert("Loading data failed.");
		});
	}

	function set_mode_login(display_name) {
		document.body.setAttribute("data-logged_in", "");
		document.body.removeAttribute("data-not_logged_in");
		//if (login_container.parentElement != null) document.body.removeChild(login_container);
		//if (data_container.parentElement == null) document.body.appendChild(data_container);
		//if (menu_container.parentElement == null)  document.body.appendChild(menu_container);
		menu_container.querySelector(".display_name div").innerText = display_name;
		load_data_index();		
	}

	function set_mode_logout() {
		document.body.removeAttribute("data-logged_in");
		document.body.setAttribute("data-not_logged_in", "");
		//if (login_container.parentElement == null) document.body.appendChild(login_container);
		//if (data_container.parentElement != null) document.body.removeChild(data_container);
		//if (menu_container.parentElement != null)  document.body.removeChild(menu_container);
	}

	function build_login() {
		var ok_button = undefined;
		var login_form = build("custom_form", "login_form", login_container);
		login_form.build("username").input("Username:").add_on_enter(function() {ok_button.click();});
		login_form.build("password").input("Password:").make_password().add_on_enter(function() {ok_button.click();});
		ok_button = login_form.build("ok_button").button("Ok");
		var login_error_msg = login_form.build().message("", "Wrong username or password");

		login_form.addEventListener("ok_button", function() {
			ajax("login", login_form.data_raw, function(result) {
				login_form.reset();
				set_mode_login(result.display_name);
			}, function(result) {
				login_error_msg.show(2000);
			});
		});
	}

	function build_logout_form() {
		var logout_form = build("custom_form", "logout_form");
		logout_form.build("display_name", "display_name").input("Logged in as ", "guest").make_read_only();
		logout_form.build("logout_button").button("Log out");
		logout_form.build("change_password_button").button("Change password");
		var logout_error_msg = logout_form.build().message("", "An error occurred");

		logout_form.addEventListener("logout_button", function() {
			ajax("logout", {}, function(result) {
				set_mode_logout();
			}, function(result) {
				logout_error_msg.show(2000);
			});
		});

		logout_form.addEventListener("change_password_button", function() {
			logout_form.parentElement.setAttribute("data-change_password_enabled", "");
		});

		return logout_form;
	}

	function build_change_password_form() {
		var change_password_form = build("custom_form", "change_password_form");
		change_password_form.build("old_password").input("Old password:").make_password();
		change_password_form.build("new_password").input("New password:").make_password();
		change_password_form.build("new_password_again").input("New password again:").make_password();
		change_password_form.build("ok_button").button("Ok");
		change_password_form.build("cancel_button").button("Cancel");
		var change_password_good_msg = change_password_form.build().message("", "Password changed.");
		var change_password_new_mismatch_msg = change_password_form.build().message("", "New password mismatch");
		var change_password_old_mismatch_msg = change_password_form.build().message("", "Old password mismatch");
		var change_password_field_error_msg = change_password_form.build().message("", "Fill all required fields");


		change_password_form.addEventListener("cancel_button", function() {
			change_password_form.reset();
			change_password_form.parentElement.removeAttribute("data-change_password_enabled");
		});

		change_password_form.addEventListener("ok_button", function() {
			var data = change_password_form.data_raw;
			if (data.old_password == undefined || data.new_password == undefined || data.new_password_again == undefined) {
				change_password_field_error_msg.show(2000);
				return;
			}
			if (data.new_password !== data.new_password_again) {
				change_password_new_mismatch_msg.show(2000);
				return;
			}
			ajax("change_password", data, function(result) {
				change_password_good_msg.show(2000);		
				setTimeout(function() {
					change_password_form.reset();
					change_password_form.parentElement.removeAttribute("data-change_password_enabled");
				}, 2000);
			}, function(result) {
				change_password_old_mismatch_msg.show(2000);
			});
		});

		return change_password_form;
	}

	function build_download_box() {
		//	generates the downloaded content
		function click_download(sel, format) {
			var checks = document.querySelectorAll("[data-download_item_id]");
			var ids = [];

			for (var i = 0; i < checks.length; i++) {
				if (checks[i].value || sel == "all") ids.push(checks[i].getAttribute("data-download_item_id"));
			}

			ajax("download_" + format, ids, function(result) {
				var data = result.data;
				if (data.length == 0) return;

				var zip = new JSZip();
				for (var i = 0; i < data.length; i++) zip.file(ids[i] + "." + format, data[i]);
				zip.generateAsync({"type" : "blob"}).then(function(blob) {
					var link = build("a");
					link.href = URL.createObjectURL(blob);
					link.download = "data_" + Date.now() + ".zip";
					link.click();
				});
			}, function(result) {

			}, 1000);
		}

		var download_box = build("div", "download_box");
		build("button", undefined, download_box, "Download all as .JSON").addEventListener("click", function() { click_download("all", "JSON"); });
		build("button", undefined, download_box, "Download selected as .JSON").addEventListener("click", function() { click_download("sel", "JSON"); });
		build("button", undefined, download_box, "Download all as .CSV").addEventListener("click", function() { click_download("all", "CSV"); });
		build("button", undefined, download_box, "Download selected as .CSV").addEventListener("click", function() { click_download("sel", "CSV"); });

		return download_box;
	}

	function build_menu() {
		menu_container.appendChild(build_logout_form());
		menu_container.appendChild(build_change_password_form());
		menu_container.appendChild(build_download_box());
	}


	build_login();
	build_menu();


	ajax("check_login", {}, function(response) {
		set_mode_login(response.display_name);
	}, function(response) {
		set_mode_logout();
	}, 1000);
});








