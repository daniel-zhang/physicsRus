var stats = {};

App = function() {
	var canvas;
	var cc; // canvas context
	var renderer;
	
	var lastTime;
	var timeDelta;
	var view = { origin: new vec2(0, 0), scale: 1, minScale: 0.5, maxScale: 3.0, bounds: new Bounds };
	var mouseDown = false;
	var startMoving = false;
	var mousePositionOld;
	var touchPosOld = new Array(2);
	var gestureStartScale;
	var gestureScale;
	var dirtyBounds = new Bounds;
	var dynamicBounds = new Bounds;
	var refreshBounds = new Bounds;	

	var editMode = false;
	var selectMode = 0; // 0: Body, 1: Shape, 2: Vertex, 3: Joint
	var selectedBody;
	var selectedShape;
	var selectedVertex;
	var selectedJoint;

	var space;
	var demoArr = [DemoCar, DemoRagDoll, DemoSeeSaw, DemoPyramid, DemoCrank, DemoRope, DemoWeb, DemoBounce];
	var sceneNameArr = [];
	var sceneIndex;
	var randomColor;
	var mouseBody;
	var mouseJoint;	
	var gravity = new vec2(0, -627.2);
	var pause = false;
	var step = false;
	var frameRateHz = 60;
	var velocityIterations = 8;
	var positionIterations = 4;
	var warmStarting = true;
	var allowSleep = true;
	var enableDirtyBounds = true;
	var showBounds = false;
	var showContacts = false;
	var showJoints = true;
	var showStats = false;

	function main() {	
		canvas = document.getElementById("canvas");
		if (!canvas.getContext) {
			alert("Couldn't get canvas object !");
		}		

		// HACK
		onResize(); 

		// Horizontal & vertical scrollbar will be hidden
		document.documentElement.style.overflowX = "hidden";
		document.documentElement.style.overflowY = "hidden";
		document.body.scroll = "no"; // ie only	

		var elements = document.getElementById("toolbar").querySelectorAll("select, input");
		for (var i in elements) {
			elements[i].onblur = function() { window.scrollTo(0, 0); };			
		}
		
		window.addEventListener("resize", onResize, false);
		canvas.addEventListener("mousedown", onMouseDown, false);
		window.addEventListener("mousemove", onMouseMove, false);
		window.addEventListener("mouseup", onMouseUp, false);		
		window.addEventListener("mouseleave", onMouseLeave, false);
		canvas.addEventListener("mousewheel", onMouseWheel, false);

		canvas.addEventListener("touchstart", touchHandler, false);
		canvas.addEventListener("touchmove", touchHandler, false);
		canvas.addEventListener("touchend", touchHandler, false);		
		canvas.addEventListener("touchcancel", touchHandler, false);

		canvas.addEventListener("gesturestart", onGestureStart, false);
		canvas.addEventListener("gesturechange", onGestureChange, false);
		canvas.addEventListener("gestureend", onGestureEnd, false);		
		window.addEventListener("orientationchange", onResize, false);

		// Prevent elastic scrolling on iOS
		document.body.addEventListener("touchmove", function(event) { event.preventDefault(); }, false);

		if (document.addEventListener) {
			document.addEventListener("keydown", onKeyDown, false);
			document.addEventListener("keyup", onKeyUp, false);
			document.addEventListener("keypress", onKeyPress, false);
		}
		else if (document.attachEvent) {
			document.attachEvent("onkeydown", onKeyDown);
			document.attachEvent("onkeyup", onKeyUp);
			document.attachEvent("onkeypress", onKeyPress);
		}
		else {
			document.onkeydown = onKeyDown;
			document.onkeyup = onKeyUp
			document.onkeypress = onKeyPress;
		}

		// Add scenes from demos
		var combobox = document.getElementById("scene");
		for (var i = 0; i < demoArr.length; i++) {
			var option = document.createElement("option");
			var name = demoArr[i].name();
			option.text = name;
			option.value = name;
			combobox.add(option);
			sceneNameArr.push(name);
		}
/*
		// Add scenes from list of JSON files in server
		httpGetText("scene.rb?action=list", false, function(text) { 
			text.replace(/\s*(.+?\.json)/g, function($0, filename) {
				var option = document.createElement("option");
				option.text = filename;
				option.value = filename;
				combobox.add(option);
				sceneNameArr.push(filename);
			});
		});*/

		// Select scene
		sceneIndex = 0;
		combobox.selectedIndex = sceneIndex;

		var editbox = document.getElementById("gravity");
		editbox.value = gravity.y;

		var editbox = document.getElementById("frameRateHz");
		editbox.value = frameRateHz;

		var editbox = document.getElementById("v_iters");
		editbox.value = velocityIterations;

		var editbox = document.getElementById("p_iters");
		editbox.value = positionIterations;		

		renderer = RendererCanvas;
		renderer.init(canvas);

		cc = canvas.getContext("2d");

		// Random color for bodies
		randomColor = ["#AFC", "#59C", "#DBB", "#9E6", "#7CF", "#A9E", "#F89", "#8AD", "#FAF", "#CDE", "#FC7", "#FF8"];

		collision.init();		

		space = new Space();

		mouseBody = new Body(Body.KINETIC);
		mouseBody.resetMassData();
		space.addBody(mouseBody);

		initScene();

		window.requestAnimFrame = window.requestAnimationFrame || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame || 
			window.oRequestAnimationFrame || 
			window.msRequestAnimationFrame;

		if (window.requestAnimationFrame) {
			window.requestAnimFrame(function() { window.requestAnimFrame(arguments.callee); runFrame(); });
		}
		else {
			window.setInterval(runFrame, parseInt(1000 / 60));
		}
	}
	
	function httpGetText(uri, async, callback) {
		var request = new XMLHttpRequest();
		request.onreadystatechange = function () {
			if (request.readyState == 4 && request.status == 200) {
				var text = request.responseText;
				callback(text);
			}
		}

		request.open("GET", uri, async);
		//request.overrideMimeType("text/plain");
		request.setRequestHeader("Content-Type", "text/plain");
		request.send();
	}

	function httpPostText(uri, async, text, callback) {
		var request = new XMLHttpRequest();
		request.onreadystatechange = function () {
			if (request.readyState == 4 && request.status == 200) {
				var text = request.responseText;
				callback(text);
			}
		}

		request.open("POST", uri, async);
		//request.overrideMimeType("text/plain");
		request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		request.setRequestHeader("Content-length", text.length);
		request.setRequestHeader("Connection", "close");
		request.send(text);
	}	

	function loadSceneFromServer(name) {		
		var uri = "scenes/" + encodeURIComponent(name);
		httpGetText(uri, false, function(text) {
			space.create(text);
		});
	}

	function saveSceneToServer(name) {
		var text = JSON.stringify(space, null, "\t");
		var postData = "action=save&filename=" + encodeURIComponent(name) + "&text=" + encodeURIComponent(text);
		httpPostText("scene.rb", false, postData, function(text) {});
	}

	function initScene() {
		space.clear();
		space.gravity.copy(gravity);

		if (sceneIndex < demoArr.length) {
			demo = demoArr[sceneIndex];
			demo.init(space);
		}
		else {
			demo = null;
			loadSceneFromServer(sceneNameArr[sceneIndex]);
		}

		lastTime = Date.now();
		timeDelta = 0;

		// Set dirtyBounds to full screen
		dirtyBounds.set(canvasToWorld(new vec2(0, canvas.height)), canvasToWorld(new vec2(canvas.width, 0)));
	}

	function worldToCanvas(v) {
		return new vec2(
			canvas.width * 0.5 + (v.x * view.scale - view.origin.x),
			canvas.height - (v.y * view.scale - view.origin.y));
	}

	function canvasToWorld(v) {
		return new vec2(
			(view.origin.x + (v.x - canvas.width * 0.5)) / view.scale,
			(view.origin.y - (v.y - canvas.height)) / view.scale);
	}

	function screenAlign(bounds) {
		var mins = worldToCanvas(bounds.mins);
		mins.x = Math.max(Math.floor(mins.x), 0);
		mins.y = Math.min(Math.ceil(mins.y), canvas.height);
		bounds.mins = canvasToWorld(mins);

		var maxs = worldToCanvas(bounds.maxs);
		maxs.x = Math.min(Math.ceil(maxs.x), canvas.width);
		maxs.y = Math.max(Math.floor(maxs.y), 0);
		bounds.maxs = canvasToWorld(maxs);
	}	

	function bodyColor(body) {
		if (body.isStatic()) {
			return "#888";
		}

		if (!body.isAwake()) {
			return "#888";
		}

		return randomColor[(body.id) % randomColor.length];
	}
	
	function runFrame() {
		var time = Date.now();
		var frameTime = (time - lastTime) / 1000;
		lastTime = time;

		if (window.requestAnimFrame) {
			frameTime = Math.floor(frameTime * 60 + 0.5) / 60;
		}

		if (!pause || step && !editMode) {
			var h = 1 / frameRateHz;

			timeDelta += frameTime;

			if (step) {
				step = false;
				timeDelta = h;
			}
			
			stats.timeStep = 0;
			stats.stepCount = 0;

			for (var maxSteps = 4; maxSteps > 0 && timeDelta >= h; maxSteps--) {
				var t0 = Date.now();
				space.step(h, velocityIterations, positionIterations, warmStarting, allowSleep);
				stats.timeStep += Date.now() - t0;
				stats.stepCount++;

				timeDelta -= h;
			}

			if (timeDelta > h) {
				timeDelta = 0;
			}
		}

		if (stats.stepCount > 0) {
			updateScreen(frameTime);
		}
	}

	function updateScreen(frameTime) {	
		var t0 = Date.now();
		drawFrame(frameTime);
		stats.timeDrawFrame = Date.now() - t0;

		if (showStats) {
			dirtyBounds.addBounds(new Bounds(canvasToWorld(new vec2(0, 50)), canvasToWorld(new vec2(400, 0))));			

			cc.font = "9pt menlo";
			cc.textBaseline = "top";
			cc.fillStyle = "#333";
			cc.fillText(["fps:", parseInt(1 / frameTime), "step_cnt:", stats.stepCount, "tm_step:", stats.timeStep, "tm_draw:", stats.timeDrawFrame].join(" "), 10, 2);
			cc.fillText(["tm_col:", stats.timeCollision, "tm_init_sv:", stats.timeInitSolver, "tm_vel_sv:", stats.timeVelocitySolver, "tm_pos_sv:", stats.timePositionSolver].join(" "), 10, 18);
			cc.fillText(["bodies:", space.numBodies, "joints:", space.numJoints, "contacts:", space.numContacts, "pos_iters:", stats.positionIterations].join(" "), 10, 34);
		}
	}

	function drawFrame(frameTime) {
		if (!enableDirtyBounds) {
			renderer.clearRect(0, 0, canvas.width, canvas.height);
		}		

		// view.bounds for culling
		view.bounds.set(canvasToWorld(new vec2(0, canvas.height)), canvasToWorld(new vec2(canvas.width, 0)));

		renderer.pushMatrix();
		
		// Transform view coordinates to screen canvas
		//cc.translate(canvas.width * 0.5, canvas.height);
		//cc.scale(1, -1);

		// Transform world coordinates to view
		//cc.translate(-view.origin.x, -view.origin.y);
		//cc.scale(view.scale, view.scale);

		renderer.setTransform(view.scale, 0, 0, -view.scale, canvas.width * 0.5 - view.origin.x, canvas.height + view.origin.y);		

		if (!enableDirtyBounds) {
			refreshBounds.copy(view.bounds);
		}
		else {			
			// Update dynamic bounds
			dynamicBounds.clear();

			for (var i in space.bodyHash) {
				preBody(space.bodyHash[i]);
			}

			if (showJoints) {
				for (var i in space.jointHash) {
					preJoint(space.jointHash[i]);
				}
			}

			refreshBounds.clear();

			if (!dirtyBounds.isEmpty()) {
				screenAlign(dirtyBounds);
				renderer.clearRect(dirtyBounds.mins.x, dirtyBounds.mins.y, dirtyBounds.maxs.x - dirtyBounds.mins.x, dirtyBounds.maxs.y - dirtyBounds.mins.y);				

				refreshBounds.addBounds(dirtyBounds);				
			}

			if (!dynamicBounds.isEmpty()) {
				refreshBounds.addBounds(dynamicBounds);				

				dirtyBounds.copy(dynamicBounds);
			}		
			
			if (!refreshBounds.isEmpty()) {
				screenAlign(refreshBounds);
				renderer.scissorRect(refreshBounds.mins.x, refreshBounds.mins.y, refreshBounds.maxs.x - refreshBounds.mins.x, refreshBounds.maxs.y - refreshBounds.mins.y);
			}			
		}

		//drawGrids(64);

		// Draw bodies
		for (var i in space.bodyHash) {
			var body = space.bodyHash[i];
			drawBody(body, bodyColor(body), "#000");
		}

		// Draw joints
		if (showJoints) {
			for (var i in space.jointHash) {
				drawJoint(space.jointHash[i], "#F0F");
			}
		}		

		// Draw contacts
		if (showContacts) {
			for (var i = 0; i < space.contactSolverArr.length; i++) {
				var contactSolver = space.contactSolverArr[i];
				for (var j = 0; j < contactSolver.contactArr.length; j++) {
					var con = contactSolver.contactArr[j];
					var offset = new vec2(2, 2);
					renderer.drawBox(vec2.sub(con.p, offset), vec2.add(con.p, offset), "#F00");
					//renderer.drawArrow(con.p, vec2.add(con.p, vec2.scale(con.n, con.d)), "#F00");
				}
			}
		}		

		renderer.popMatrix();
	}	

	function preBody(body) {
		for (var i = 0; i < body.shapeArr.length; i++) {
			var shape = body.shapeArr[i];

			if (!body.isStatic()) {
				// Expand for outline width
				var bounds = new Bounds(shape.bounds.mins, shape.bounds.maxs);
				bounds.expand(2, 2);

				if (view.bounds.intersectsBounds(bounds)) {
					dynamicBounds.addBounds(bounds);
				}
			}
		}
	}

	function preJoint(joint) {
		if (!joint.anchor1 || !joint.anchor2) {
			return;
		}

		var body1 = joint.body1;
		var body2 = joint.body2;

		var active1 = !body1.isStatic();
		var active2 = !body2.isStatic();

		if (!active1 && !active2) {
			return;
		}
		
		var p1 = vec2.add(vec2.rotate(joint.anchor1, body1.a), body1.p);
		var p2 = vec2.add(vec2.rotate(joint.anchor2, body2.a), body2.p);
		
		var bounds = new Bounds;
		bounds.addPoint(p1);
		bounds.addPoint(p2);
		bounds.expand(3, 3);
		
		if (view.bounds.intersectsBounds(bounds)) {
			dynamicBounds.addBounds(bounds);
		}
	}

	function drawGrids(refGridSize) {
		var n = refGridSize * view.scale;
		var p = 1; while (p <= n) p <<= 1; p >>= 1; // previous power of two
		var gridSize = refGridSize * refGridSize / p;
		var gridColor = "#CCC";

		var start_x = Math.floor(view.bounds.mins.x / gridSize) * gridSize;
		var start_y = Math.floor(view.bounds.mins.y / gridSize) * gridSize;
		var end_x = Math.ceil(view.bounds.maxs.x / gridSize) * gridSize;
		var end_y = Math.ceil(view.bounds.maxs.y / gridSize) * gridSize;

		var v1 = new vec2(start_x, start_y);
		var v2 = new vec2(start_x, end_y);

		for (var x = start_x; x <= end_x; x += gridSize) {
			if (x < refreshBounds.mins.x || x > refreshBounds.maxs.x) {
				continue;
			}
			v1.x = x;
			v2.x = x;			
			renderer.drawLine(v1, v2, gridColor);
		}

		v1.set(start_x, start_y);
		v2.set(end_x, start_y);

		for (var y = start_y; y <= end_y; y += gridSize) {
			if (y < refreshBounds.mins.y || y > refreshBounds.maxs.y) {
				continue;
			}

			v1.y = y;
			v2.y = y;
			renderer.drawLine(v1, v2, gridColor);
		}
	}	

	function drawBody(body, fillColor, outlineColor) {
		for (var i = 0; i < body.shapeArr.length; i++) {
			var shape = body.shapeArr[i];

			var bounds = new Bounds(shape.bounds.mins, shape.bounds.maxs);
			if (!refreshBounds.intersectsBounds(bounds)) {
				continue;
			}

			drawBodyShape(body, shape, fillColor, outlineColor);			
		}
	}

	function drawBodyShape(body, shape, fillColor, outlineColor) {
		switch (shape.type) {
		case Shape.TYPE_CIRCLE:
			renderer.drawCircle(shape.tc, shape.r, body.a, fillColor, outlineColor);
			break;
		case Shape.TYPE_SEGMENT:
			renderer.drawSegment(shape.ta, shape.tb, shape.r, fillColor, outlineColor);
			break;
		case Shape.TYPE_POLY:
			renderer.drawPolygon(shape.tverts, fillColor, outlineColor);
			break;
		}

		if (showBounds) {
			// Expand for outline width
			var bounds = new Bounds(shape.bounds.mins, shape.bounds.maxs);
			bounds.expand(1, 1);

			renderer.drawBox(bounds.mins, bounds.maxs, null, "#0A0");
		}
	}

	function drawJoint(joint, strokeStyle) {
		if (!joint.anchor1 || !joint.anchor2) {
			return;
		}

		var body1 = joint.body1;
		var body2 = joint.body2;

		var p1 = vec2.add(vec2.rotate(joint.anchor1, body1.a), body1.p);
		var p2 = vec2.add(vec2.rotate(joint.anchor2, body2.a), body2.p);

		var bounds = new Bounds;
		bounds.addPoint(p1);
		bounds.addPoint(p2);
		bounds.expand(3, 3);
		
		if (!refreshBounds.intersectsBounds(bounds)) {
			return;
		}

		renderer.drawLine(p1, p2, strokeStyle);

		var offset = new vec2(2.5, 2.5);
		renderer.drawBox(vec2.sub(p1, offset), vec2.add(p1, offset), "#808");
		renderer.drawBox(vec2.sub(p2, offset), vec2.add(p2, offset), "#808");
		//renderer.drawCircle(p1, 2.5, 0, "#808");
		//renderer.drawCircle(p2, 2.5, 0, "#808");
	}

	function onResize(e) {
		window.scrollTo(0, 0);

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		canvas.style.position = "absolute";
  		canvas.style.left = "0px";
  		canvas.style.top = "0px";

		var toolbar = document.getElementById("toolbar");
		toolbar.style.position = "absolute";
		toolbar.style.left = (canvas.width - toolbar.clientWidth) + "px";
		toolbar.style.top = "0px";
		//toolbar.style.display = "none";

		// Set dirtyBounds to full screen
		dirtyBounds.set(canvasToWorld(new vec2(0, canvas.height)), canvasToWorld(new vec2(canvas.width, 0)));		
	}

	function getMousePosition(e) {
		return new vec2(
			document.body.scrollLeft + e.clientX - canvas.offsetLeft, 
			document.body.scrollTop + e.clientY - canvas.offsetTop);
	}
	
	function onMouseDown(e) {
		mouseDown = true;		

		if (mouseJoint) {
			space.removeJoint(mouseJoint);
			mouseJoint = null;
		}

		var pos = getMousePosition(e);
		var p = canvasToWorld(pos);
		var shape = space.findShapeByPoint(p);
		if (shape && !shape.body.isStatic()) {
			var body = shape.body;
			
			mouseBody.p.copy(p);
			mouseJoint = new MouseJoint(mouseBody, body, p);
			mouseJoint.maxForce = body.m * 10000;
			space.addJoint(mouseJoint);

			e.preventDefault();			
		}
		else if (/*e.metaKey*/1) {
			startMoving = true;
			mousePositionOld = pos;
		}
	}

	function onMouseUp(e) {
		mouseDown = false;
		startMoving = false;

		if (mouseJoint) {
			space.removeJoint(mouseJoint);
			mouseJoint = null;
					
			e.preventDefault();
		}
	}

	function onMouseMove(e) {
		var pos = getMousePosition(e);

		if (mouseJoint) {
			mouseBody.p.copy(canvasToWorld(pos));

			e.preventDefault();
		}
		else if (startMoving) {
			view.origin.x -= pos.x - mousePositionOld.x;
			view.origin.y += pos.y - mousePositionOld.y;

			view.origin.y = Math.clamp(view.origin.y, 0, 0);

			mousePositionOld.x = pos.x;
			mousePositionOld.y = pos.y;

			// Set dirtyBounds to full screen
			dirtyBounds.set(canvasToWorld(new vec2(0, canvas.height)), canvasToWorld(new vec2(canvas.width, 0)));
		
			e.preventDefault();
		}
	}

	function onMouseLeave(e) {
		if (mouseJoint) {
			space.removeJoint(mouseJoint);
			mouseJoint = null;
		
			e.preventDefault();
		}
	}

	function onMouseWheel(e) {
		// Zoom in and out using vertical mouse wheel
		var ds = -e.wheelDeltaY * 0.001;
		var oldViewScale = view.scale;
		view.scale = Math.clamp(oldViewScale + ds, view.minScale, view.maxScale);
		ds = view.scale - oldViewScale;

		// Adjust view origin for focused zoom in and out
		// p = (1 + ds) * p - ds * p
		var p = canvasToWorld(getMousePosition(e));
		view.origin.x += p.x * ds;
		view.origin.y += p.y * ds;

		// Horizontal scroll using horizontal mouse wheel
		var dx = e.wheelDeltaX * 0.2;
		view.origin.x -= dx;

		// Clamp view origin limit
		view.origin.y = Math.clamp(view.origin.y, 0, 0);

		// Set dirtyBounds to full screen
		dirtyBounds.set(canvasToWorld(new vec2(0, canvas.height)), canvasToWorld(new vec2(canvas.width, 0)));

		e.preventDefault();		
	}

	function touchHandler(e) {
		if (e.touches.length <= 1) {
			var first = e.changedTouches[0];
			var type = {touchstart: "mousedown", touchmove: "mousemove", touchend: "mouseup"}[e.type] || "";			
			//initMouseEvent(type, canBubble, cancelable, view, clickCount, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget);
			var simulatedEvent = document.createEvent("MouseEvent");			
			simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0, null);
			first.target.dispatchEvent(simulatedEvent);
		}
		else {
			var handler = {touchstart: onTouchStart, touchmove: onTouchMove, touchend: onTouchEnd}[e.type];
			if (handler) {
				handler(e);
			}
		}

		e.preventDefault();
	}

	function onTouchStart(e) {
		if (mouseJoint) {
			space.removeJoint(mouseJoint);
			mouseJoint = null;
		}

		if (e.touches.length == 2) {
			touchPosOld[0] = getMousePosition(e.touches[0]);
			touchPosOld[1] = getMousePosition(e.touches[1]);
			
			e.preventDefault();
		}
	}

	function onTouchMove(e) {
		if (e.touches.length == 2) {
			var touchPos = [];

			touchPos[0] = getMousePosition(e.touches[0]);
			touchPos[1] = getMousePosition(e.touches[1]);

			var v1 = vec2.sub(touchPos[0], touchPosOld[0]);
			var v2 = vec2.sub(touchPos[1], touchPosOld[1]);

			var d1 = v1.length();
			var d2 = v2.length();

			if (d1 > 0 || d2 > 0) {
				touchScaleCenter = canvasToWorld(vec2.lerp(touchPos[0], touchPos[1], d1 / (d1 + d2)));

				var oldScale = view.scale;
				view.scale = Math.clamp(gestureScale, view.minScale, view.maxScale);
				var ds = view.scale - oldScale;
		
				view.origin.x += touchScaleCenter.x * ds;
				view.origin.y += touchScaleCenter.y * ds;

				view.origin.x -= (v1.x + v2.x) * 0.5;
				view.origin.x += (v1.y + v2.y) * 0.5;

				view.origin.y = Math.clamp(view.origin.y, 0, 0);

				// Set dirtyBounds to full screen
				dirtyBounds.set(canvasToWorld(new vec2(0, canvas.height)), canvasToWorld(new vec2(canvas.width, 0)));
			}

			touchPosOld[0] = touchPos[0];
			touchPosOld[1] = touchPos[1];			

			e.preventDefault();
		}
	}

	function onTouchEnd(e) {
		
	}

	function onGestureStart(e) {
		gestureStartScale = view.scale;

		e.preventDefault();
	}

	function onGestureChange(e) {
		var threhold = Math.clamp(e.scale - 1, -0.1, 0.1);
		gestureScale = gestureStartScale * (e.scale - threhold);

		e.preventDefault();
	}

	function onGestureEnd(e) {
	}

	function onKeyDown(e) {
		if (!e) {
			e = event;
		}

		switch (e.keyCode) {
		case 17: // Ctrl
			e.preventDefault();			
			break;
		case 66: // 'b'
			break;        
		case 67: // 'c'
			break;
		case 74: // 'j'
			break;
		case 83: // 's'
			break;        
		case 85: // 'u'
			break;
		case 49: // '1'
		case 50: // '2'
		case 51: // '3'
			//number = e.keyCode - 48;
			break;
		case 32: // 'space'
			onClickedStep();
			break;
		}					
	}

	function onKeyUp(e) {
		if (!e) {
			e = event;
		}
	}

	function onKeyPress(e) {
		if (!e) {
			e = event;
		}
	}

	function onChangedScene(index) {
		sceneIndex = index;
		initScene();
	}

	function onChangedGravity(value) {
		gravity.y = parseFloat(value);
		space.gravity.copy(gravity);
	}

	function onChangedFrameRateHz(value) {
		frameRateHz = parseInt(value);
	}

	function onChangedVelocityIterations(value) {
		velocityIterations = parseInt(value);
	}

	function onChangedPositionIterations(value) {
		positionIterations = parseInt(value);
	}

	function onClickedWarmStarting() {
		warmStarting = !warmStarting;
	}

	function onClickedAllowSleep() {
		allowSleep = !allowSleep;
	}

	function onClickedEnableDirtyRect() {
		enableDirtyBounds = !enableDirtyBounds;
	}

	function onClickedShowBounds() {
		showBounds = !showBounds;
	}

	function onClickedShowContacts() {
		showContacts = !showContacts;
	}

	function onClickedShowJoints() {
		showJoints = !showJoints;
	}

	function onClickedShowStats() {
		showStats = !showStats;
	}

	function updatePauseButton() {
		var button = document.getElementById("pause");
		button.value = pause ? "Play" : "Pause";
	}

	function onClickedRestart() {
		initScene();
		pause = false;
		updatePauseButton();
	}

	function onClickedPause() {
		pause = !pause;
		updatePauseButton();
	}

	function onClickedStep() {
		pause = true;
		step = true;
		updatePauseButton();
	}

	return { 
		main: main,
		onChangedScene: onChangedScene,
		onChangedGravity: onChangedGravity,
		onChangedFrameRateHz: onChangedFrameRateHz,
		onChangedVelocityIterations: onChangedVelocityIterations,
		onChangedPositionIterations: onChangedPositionIterations,        
		onClickedWarmStarting: onClickedWarmStarting,
		onClickedAllowSleep: onClickedAllowSleep,
		onClickedEnableDirtyRect: onClickedEnableDirtyRect,
		onClickedShowBounds: onClickedShowBounds,
		onClickedShowContacts: onClickedShowContacts,
		onClickedShowJoints: onClickedShowJoints,
		onClickedShowStats: onClickedShowStats,
		onClickedRestart: onClickedRestart,
		onClickedPause: onClickedPause,
		onClickedStep: onClickedStep
	};
}();