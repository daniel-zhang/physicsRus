var stats = {};

App = function() {
    var canvas;
    var ctx;

    var lastTime;
    var timeOffset;
    var mouseDown;
    var canvasBounds;
    var clearBounds;
    var randomColor;

    var space;
    var mouseBody;
    var mousePoint;
    var mousePoint_old;
    var mouseJoint;
    var sceneNumber = 1;

    var showBounds = false;
    var showContacts = false;
    var showJoints = true;
    var showStats = false;

    function main() {
        canvas = document.getElementById("canvas");
        if (!canvas.getContext) {
            alert("Couldn't get canvas object !");
        }

        // Main canvas context
        ctx = canvas.getContext("2d");

        // Transform coordinate system to y-axis is up and origin is bottom center
        ctx.translate(canvas.width * 0.5, canvas.height);
        ctx.scale(1, -1);

        canvas.addEventListener("mousedown", function(e) { onMouseDown(e) }, false);
        canvas.addEventListener("mouseup", function(e) { onMouseUp(e) }, false);
        canvas.addEventListener("mousemove", function(e) { onMouseMove(e) }, false);
        canvas.addEventListener("mouseout", function(e) { onMouseOut(e) }, false);

        canvas.addEventListener("touchstart", touchHandler, false);
        canvas.addEventListener("touchend", touchHandler, false);
        canvas.addEventListener("touchmove", touchHandler, false);
        canvas.addEventListener("touchcancel", touchHandler, false);
        
        // Prevent elastic scrolling on iOS
        //document.body.addEventListener('touchmove', function(event) { event.preventDefault(); }, false);

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
                
        window.requestAnimFrame = (function() {
            return window.requestAnimationFrame || 
                window.webkitRequestAnimationFrame || 
                window.mozRequestAnimationFrame || 
                window.oRequestAnimationFrame || 
                window.msRequestAnimationFrame || 
                function(callback, element) { window.setTimeout(callback, 1000 / 60); };
        })();

        // Random color for bodies
        randomColor = ["#AFC", "#59C", "#DBB", "#9E6", "#7CF", "#A9E", "#F89", "#8AD", "#FAF", "#CDE", "#FC7", "#FF8"];        

        canvasBounds = new Bounds(new vec2(-canvas.width * 0.5, 0), new vec2(canvas.width * 0.5, canvas.height));
        clearBounds = new Bounds;

        Collision.init();

        mouseBody = new Body(Infinity, Infinity);

        initScene();

		window.requestAnimFrame(function() { runFrame(); });        
    }

    function initScene() {
        Shape.id_counter = 0;
        Body.id_counter = 0;
        Joint.id_counter = 0;

        switch (sceneNumber) {
        case 1:
            initScene1();
            break;
        case 2:
            initScene2();
            break;
        case 3:
            initScene3();
            break;
        case 4:
            initScene4();
            break;
        case 5:
            initScene5();
            break;
        case 6:
            initScene6();
            break;
        case 7:
            initScene7();
            break;
        }

        clearBounds.copy(canvasBounds);
        
        timeOffset = 0;
        frameSkip = 0;
        lastTime = Date.now();
    }

    // Car & various joints
    function initScene1() {
        var body, body1, body2, body3;
        var body_prev;
        var shape;
        var joint;

        space = new Space();
        space.gravity = new vec2(0, -600);
        space.damping = 0.75;

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeTriangle(new vec2(-400, 160), new vec2(-400, 0), new vec2(200, 0));
        space.staticBody.addStaticShape(shape);

        shape = new ShapeTriangle(new vec2(200, 0), new vec2(400, 0), new vec2(400, 40));
        space.staticBody.addStaticShape(shape);       

        for (var i = 0; i < 6; i++) {
            shape = new ShapeBox(20, 20);
            shape.e = 0.5;
            shape.u = 0.8;
            body = new Body(0.2, shape.inertia(0.2));
            body.addShape(shape);
            body.p.set(0, 275 - 30 * i);
            space.addBody(body);

            if (i == 0) {                
                var joint = new MaxDistanceJoint(space.staticBody, body, new vec2(0, 290), new vec2(0, 0), 15, 15);
                space.addJoint(joint);
            }
            else {
                var joint = new DistanceJoint(body_prev, body, new vec2(0, 0), new vec2(0, 0));
                joint.breakable = true;
                joint.maxForce = 4000;
                space.addJoint(joint);
            }

            body_prev = body;
        }

        for (var i = 0; i < 6; i++) {
            shape = new ShapeBox(20, 20);
            shape.e = 0.5;
            shape.u = 0.8;
            body = new Body(0.2, shape.inertia(0.2));
            body.addShape(shape);
            body.p.set(100, 255 - 30 * i);
            space.addBody(body);

            if (i == 0) {
                var joint = new RevoluteJoint(space.staticBody, body, new vec2(100, 255 + 15));
                space.addJoint(joint);
            }
            else {
                var joint = new RevoluteJoint(body_prev, body, new vec2(100, 255 - 30 * i + 15));
                joint.breakable = true;
                joint.maxForce = 4000;
                space.addJoint(joint);
            }

            body_prev = body;
        }

        for (var i = 0; i < 6; i++) {
            shape = new ShapeBox(20, 20);
            shape.e = 0.5;
            shape.u = 0.8;
            body = new Body(0.2, shape.inertia(0.2));
            body.addShape(shape);
            body.p.set(200, 235 - 30 * i);
            space.addBody(body);

            if (i == 0) {
                var joint = new SpringJoint(space.staticBody, body, new vec2(200, 235 + 15), new vec2(0, 10), 5, 330, 1.6);
                space.addJoint(joint);
            }
            else {
                var joint = new SpringJoint(body_prev, body, new vec2(0, -10), new vec2(0, 10), 10, 330, 1.6);
                joint.breakable = true;
                joint.maxForce = 4000;
                space.addJoint(joint);
            }

            body_prev = body;
        }

        // Car body
        shape = new ShapeBox(150, 30);
        shape.e = 0.5;
        shape.u = 0.5;
        body1 = new Body(4, shape.inertia(4));
        body1.addShape(shape);
        shape = new ShapeBox(80, 40, 0, 35);
        shape.e = 0.5;
        shape.u = 0.5;
        body1.addShape(shape);
        body1.p.set(-300, 262);
        space.addBody(body1);

        // Wheel 1
        shape = new ShapeCircle(20);
        shape.e = 0.5;
        shape.u = 1.0;
        body2 = new Body(1, shape.inertia(1));
        body2.addShape(shape);
        body2.p.set(-345, 250);
        space.addBody(body2);

        //joint = new RevoluteJoint(body1, body2, new vec2(-345, 250));
        joint = new SpringJoint(body1, body2, new vec2(-45, -15), new vec2(0, 0), 0, 700, 1.9);
        joint.collideConnected = false;
        space.addJoint(joint);

        joint = new LineJoint(body1, body2, new vec2(-45, 0), new vec2(0, 0));
        joint.collideConnected = false;
        space.addJoint(joint);

        // Wheel 2
        shape = new ShapeCircle(20);
        shape.e = 0.5;
        shape.u = 1.0;
        body3 = new Body(1, shape.inertia(1));
        body3.addShape(shape);
        body3.p.set(-255, 250);
        space.addBody(body3);

        //joint = new RevoluteJoint(body1, body3, new vec2(-255, 250));
        joint = new SpringJoint(body1, body3, new vec2(45, -15), new vec2(0, 0), 0, 700, 1.9);
        joint.collideConnected = false;
        space.addJoint(joint);

        joint = new LineJoint(body1, body3, new vec2(45, 0), new vec2(0, 0));
        joint.collideConnected = false;
        space.addJoint(joint);

        // Both wheels constrained to be same rotation        
        //space.addJoint(new AngleJoint(body2, body3));
    }

     // Rag-doll
    function initScene2() {
        var shape;

        space = new Space();
        space.gravity = new vec2(0, -600);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(400, 0), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 500), 10);
        space.staticBody.addStaticShape(shape);
        
        // Head
        shape = new ShapeCircle(25);        
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyHead = new Body(3, shape.inertia(3));
        bodyHead.addShape(shape);
        bodyHead.p.set(0, 370);
        space.addBody(bodyHead);

        // Spine1
        shape = new ShapeBox(70, 15);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodySpine1 = new Body(1, shape.inertia(1));
        bodySpine1.addShape(shape);
        bodySpine1.p.set(0, 320);
        space.addBody(bodySpine1);

        // Spine2
        shape = new ShapeBox(65, 15);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodySpine2 = new Body(1, shape.inertia(1));
        bodySpine2.addShape(shape);
        bodySpine2.p.set(0, 290);
        space.addBody(bodySpine2);

        // Spine3
        shape = new ShapeBox(60, 15);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodySpine3 = new Body(1, shape.inertia(1));
        bodySpine3.addShape(shape);
        bodySpine3.p.set(0, 260);
        space.addBody(bodySpine3);

        // Pelvis
        shape = new ShapePoly([new vec2(-32, 10), new vec2(-35, -15), new vec2(35, -15), new vec2(32, 10)]);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyPelvis = new Body(3, shape.inertia(3));
        bodyPelvis.addShape(shape);
        bodyPelvis.p.set(0, 225);
        space.addBody(bodyPelvis);

        // Left Arm1
        shape = new ShapeBox(55, 20);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyLArm1 = new Body(1, shape.inertia(1));
        bodyLArm1.addShape(shape);
        bodyLArm1.p.set(-75, 320);
        space.addBody(bodyLArm1);

        // Left Arm2
        shape = new ShapeBox(55, 20);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyLArm2 = new Body(1, shape.inertia(1));
        bodyLArm2.addShape(shape);
        bodyLArm2.p.set(-140, 320);
        space.addBody(bodyLArm2);

        // Right Arm1
        shape = new ShapeBox(55, 20);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyRArm1 = new Body(1, shape.inertia(1));
        bodyRArm1.addShape(shape);
        bodyRArm1.p.set(75, 320);
        space.addBody(bodyRArm1);

        // Right Arm2
        shape = new ShapeBox(55, 20);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyRArm2 = new Body(1, shape.inertia(1));
        bodyRArm2.addShape(shape);
        bodyRArm2.p.set(140, 320);
        space.addBody(bodyRArm2);

        // Left Leg1
        shape = new ShapeBox(30, 75);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyLLeg1 = new Body(1, shape.inertia(1));
        bodyLLeg1.addShape(shape);
        bodyLLeg1.p.set(-20, 160);
        space.addBody(bodyLLeg1);

        // Left Leg2
        shape = new ShapeBox(30, 75);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyLLeg2 = new Body(1, shape.inertia(1));
        bodyLLeg2.addShape(shape);
        bodyLLeg2.p.set(-20, 70);
        space.addBody(bodyLLeg2);

        // Right Leg1
        shape = new ShapeBox(30, 75);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyRLeg1 = new Body(1, shape.inertia(1));
        bodyRLeg1.addShape(shape);
        bodyRLeg1.p.set(20, 160);
        space.addBody(bodyRLeg1);

        // Right Leg2
        shape = new ShapeBox(30, 75);
        shape.e = 0.4;
        shape.u = 1.0;
        var bodyRLeg2 = new Body(1, shape.inertia(1));
        bodyRLeg2.addShape(shape);
        bodyRLeg2.p.set(20, 70);
        space.addBody(bodyRLeg2);

        var joint = new RevoluteJoint(bodyHead, bodySpine1, new vec2(0, 335));
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-40), deg2rad(40));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodySpine1, bodySpine2, new vec2(0, 305));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-5), deg2rad(5));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodySpine2, bodySpine3, new vec2(0, 275));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-5), deg2rad(5));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodySpine3, bodyPelvis, new vec2(0, 245));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-20), deg2rad(20));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodySpine1, bodyLArm1, new vec2(-45, 320));
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-120), deg2rad(120));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodyLArm1, bodyLArm2, new vec2(-105, 320));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-160), deg2rad(10));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodySpine1, bodyRArm1, new vec2(45, 320));
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-120), deg2rad(120));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodyRArm1, bodyRArm2, new vec2(105, 320));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-10), deg2rad(160));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodyPelvis, bodyLLeg1, new vec2(-20, 205));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-120), deg2rad(120));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodyLLeg1, bodyLLeg2, new vec2(-20, 115));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-30), deg2rad(150));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodyPelvis, bodyRLeg1, new vec2(20, 205));
        joint.collideConnected = false;
        joint.enableLimit(true);        
        joint.setLimits(deg2rad(-120), deg2rad(120));
        space.addJoint(joint);

        var joint = new RevoluteJoint(bodyRLeg1, bodyRLeg2, new vec2(20, 115));
        joint.collideConnected = false;
        joint.enableLimit(true);
        joint.setLimits(deg2rad(-150), deg2rad(30));
        space.addJoint(joint);

        //bodyHead.applyLinearImpulse(new vec2(-2500, 0), vec2.zero);
    }

    // See-saw
    function initScene3() {
        var body;
        var shape;

        space = new Space();
        space.gravity = new vec2(0, -600);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(400, 0), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 500), 10);
        space.staticBody.addStaticShape(shape);       

        shape = new ShapeBox(140, 80);
        shape.e = 0.1;
        shape.u = 1.0;
        body = new Body(10, shape.inertia(10));
        body.addShape(shape);
        body.p.set(-150, 80);
        space.addBody(body);
        
        shape = new ShapeBox(600, 10);
        shape.e = 0.4;
        shape.u = 0.7;
        body = new Body(2, shape.inertia(2));
        body.addShape(shape);
        body.p.set(0, 140);
        space.addBody(body);

        for (var i = 0; i < 5; i++) {
            for (var j = 0; j <= i; j++) {
                shape = new ShapeBox(40, 40);
                shape.e = 0.3;
                shape.u = 0.8;
                body = new Body(0.4, shape.inertia(0.4));
                body.addShape(shape);
                body.p.set((j - i * 0.5) * 44 - 150, 350 - i * 44);
                space.addBody(body);
            }
        }        

        shape = new ShapePoly([new vec2(-35, 35), new vec2(-50, 0), new vec2(-35, -35), new vec2(35, -35), new vec2(50, 0), new vec2(35, 35)]);
        shape.e = 0.4;
        shape.u = 1.0;
        body = new Body(5, shape.inertia(5));
        body.addShape(shape);
        body.p.set(250, 1500);
        space.addBody(body);
        body.applyForce(new vec2(0, 100), new vec2(0, 100));
    }

    // Pyramid
    function initScene4() {
        var body;
        var shape;

        space = new Space();
        space.gravity = new vec2(0, -600);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(400, 0), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 500), 10);
        space.staticBody.addStaticShape(shape);

        for (var i = 0; i < 10; i++) {
            for (var j = 0; j <= i; j++) {
                shape = new ShapeBox(36, 36);
                shape.e = 0.0;
                shape.u = 1.0;
                body = new Body(1, shape.inertia(1));
                body.addShape(shape);
                body.p.set((j - i * 0.5) * 42, 500 - i * 42);
                space.addBody(body);
            }
        }
/*
        shape = new ShapeCircle(19);
        shape.e = 0.1;
        shape.u = 1.0;
        body = new Body(4, shape.inertia(4));
        body.addShape(shape);
        body.p.set(0, 50);
        space.addBody(body);*/
    }

    // Crank
    function initScene5() {
        var shape;

        space = new Space();
        space.gravity = new vec2(0, -600);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(400, 0), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 600), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 600), 10);
        space.staticBody.addStaticShape(shape);      

        shape = new ShapeBox(20, 50);
        shape.e = 0.4;
        shape.u = 1.0;
        var body1 = new Body(1, shape.inertia(1));
        body1.addShape(shape);
        body1.p.set(0, 100);
        space.addBody(body1);

        shape = new ShapeBox(20, 100);
        shape.e = 0.4;
        shape.u = 1.0;
        var body2 = new Body(1, shape.inertia(1));
        body2.addShape(shape);
        body2.p.set(0, 175);
        space.addBody(body2);

        shape = new ShapeBox(160, 20);
        shape.e = 0.4;
        shape.u = 1.0;
        var body3 = new Body(1, shape.inertia(1));
        body3.addShape(shape);
        body3.p.set(0, 225);
        space.addBody(body3);

        shape = new ShapeBox(30, 30);
        shape.e = 0.0;
        shape.u = 1.0;
        var body4 = new Body(1, shape.inertia(1));
        body4.addShape(shape);
        body4.p.set(-32, 300);
        space.addBody(body4);

        shape = new ShapeBox(30, 30);
        shape.e = 0.0;
        shape.u = 1.0;
        var body5 = new Body(1, shape.inertia(1));
        body5.addShape(shape);
        body5.p.set(0, 300);
        space.addBody(body5);

        shape = new ShapeBox(30, 30);
        shape.e = 0.0;
        shape.u = 1.0;
        var body5 = new Body(1, shape.inertia(1));
        body5.addShape(shape);
        body5.p.set(32, 300);
        space.addBody(body5);

        var joint = new RevoluteJoint(space.staticBody, body1, new vec2(0, 75));
        joint.collideConnected = false;
        joint.enableMotor(true);
        joint.setMotorSpeed(deg2rad(270));
        joint.setMaxMotorTorque(1000000);
        space.addJoint(joint);

        var joint = new RevoluteJoint(body1, body2, new vec2(0, 125));
        joint.collideConnected = false;
        space.addJoint(joint);

        var joint = new RevoluteJoint(body2, body3, new vec2(0, 225));
        joint.collideConnected = false;
        space.addJoint(joint);

        var joint = new PrismaticJoint(space.staticBody, body3, new vec2(0, 75), new vec2(0, 0));
        joint.collideConnected = false;
        space.addJoint(joint);        
    }

    // Web
    function initScene6() {
        var shape;

        space = new Space();
        space.gravity = new vec2(0, -600);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(400, 0), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 500), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeBox(20, 20);
        shape.e = 0.0;
        shape.u = 1.0;
        var body1 = new Body(1, shape.inertia(1));
        body1.addShape(shape);
        body1.p.set(-70, 300);
        space.addBody(body1);

        shape = new ShapeBox(20, 20);
        shape.e = 0.0;
        shape.u = 1.0;
        var body2 = new Body(1, shape.inertia(1));
        body2.addShape(shape);
        body2.p.set(-70, 160);
        space.addBody(body2);

        shape = new ShapeBox(20, 20);
        shape.e = 0.0;
        shape.u = 1.0;
        var body3 = new Body(1, shape.inertia(1));
        body3.addShape(shape);
        body3.p.set(70, 300);
        space.addBody(body3);

        shape = new ShapeBox(20, 20);
        shape.e = 0.0;
        shape.u = 1.0;
        var body4 = new Body(1, shape.inertia(1));
        body4.addShape(shape);
        body4.p.set(70, 160);
        space.addBody(body4);

        var joint1 = new SpringJoint(space.staticBody, body1, new vec2(-200, 430), new vec2(-10, 10), 150, 100, 1.7);
        space.addJoint(joint1);

        var joint2 = new SpringJoint(space.staticBody, body2, new vec2(-200, 60), new vec2(-10, -10), 150, 100, 1.7);
        space.addJoint(joint2);

        var joint3 = new SpringJoint(space.staticBody, body3, new vec2(200, 430), new vec2(10, 10), 150, 100, 1.7);
        space.addJoint(joint3);

        var joint4 = new SpringJoint(space.staticBody, body4, new vec2(200, 60), new vec2(10, -10), 150, 100, 1.7);
        space.addJoint(joint4);

        space.addJoint(new SpringJoint(body1, body2, new vec2(0, -10), new vec2(0, 10), 120, 100, 1.7));
        space.addJoint(new SpringJoint(body3, body4, new vec2(0, -10), new vec2(0, 10), 120, 100, 1.7));
        space.addJoint(new SpringJoint(body1, body3, new vec2(10, 0), new vec2(-10, 0), 120, 100, 1.7));
        space.addJoint(new SpringJoint(body2, body4, new vec2(10, 0), new vec2(-10, 0), 120, 100, 1.7));
    }

    // Bounce
    function initScene7() {
        var shape;

        space = new Space();
        space.gravity = new vec2(0, -600);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(400, 0), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(-400, 0), new vec2(-400, 600), 10);
        space.staticBody.addStaticShape(shape);

        shape = new ShapeSegment(new vec2(400, 0), new vec2(400, 600), 10);
        space.staticBody.addStaticShape(shape);      

        for (var i = 0; i <= 10; i++)  {
            shape = new ShapeCircle(20);
            shape.e = i / 10;
            shape.u = 1.0;
            var body1 = new Body(1, shape.inertia(1));
            body1.addShape(shape);
            body1.p.set(-300 + i * 60, 400);
            space.addBody(body1);
        }

/*        shape = new ShapeBox(200, 40);
        shape.e = 0.4;
        shape.u = 1.0;
        var body1 = new Body(1, shape.inertia(1));
        body1.addShape(shape);
        body1.p.set(0, 400);
        space.addBody(body1);

        shape = new ShapeCircle(30);
        shape.e = 0.4;
        shape.u = 1.0;
        var body2 = new Body(1, shape.inertia(1));
        body2.addShape(shape);
        body2.p.set(-50, 300);
        space.addBody(body2);

        shape = new ShapeCircle(30);
        shape.e = 0.4;
        shape.u = 1.0;
        var body3 = new Body(1, shape.inertia(1));
        body3.addShape(shape);
        body3.p.set(50, 300);
        space.addBody(body3);

        var joint = new SpringJoint(body1, body2, new vec2(-50, -20), new vec2(0, 0), 50, 400, 1.5);
        space.addJoint(joint);

        var joint = new SpringJoint(body1, body3, new vec2(50, -20), new vec2(0, 0), 50, 400, 1.5);
        space.addJoint(joint);

        var joint = new PrismaticJoint(body1, body2, new vec2(-50, 0), new vec2(0, 0));
        space.addJoint(joint);

        var joint = new LineJoint(body1, body3, new vec2(50, 0), new vec2(0, 0));
        space.addJoint(joint);*/
    }    

    function bodyColor(body) {
        if (!body.isAwake())
            return "#888";
        return randomColor[(body.id) % randomColor.length];
    }

    function runFrame() {
        var time = Date.now();
        var frameTime = time - lastTime;

        lastTime = time;

        timeOffset += frameTime;

        if (mouseJoint) {
            mouseBody.p = mousePoint;//vec2.lerp(mousePoint, mousePoint_old, 0.25);
            mouseBody.v = vec2.scale(vec2.sub(mouseBody.p, mousePoint_old), frameTime);
            mousePoint_old = mouseBody.p;
        }

        if (timeOffset >= 1000 / 60) {
            var steps = 0;

            while (timeOffset >= 1000 / 60 && steps < 10) {                
                var t0 = Date.now();
                space.step(1 / 60, 8, 4);
                stats.timeStep = Date.now() - t0;

                timeOffset -= 1000 / 60;
                steps++;
            }

            drawFrame(frameTime);
        }

        window.requestAnimFrame(function() { runFrame(); });   
    }

    function drawFrame(ms) {
        var t0 = Date.now();

        ctx.clearRect(clearBounds.mins.x - 2, clearBounds.mins.y - 2, clearBounds.maxs.x - clearBounds.mins.x + 4, clearBounds.maxs.y - clearBounds.mins.y + 4);
        clearBounds.clear();

        drawBody(space.staticBody, "#888", "#000");
        for (var i in space.bodyHash) {
            drawBody(space.bodyHash[i], bodyColor(space.bodyHash[i]), "#000");
        }

        if (showJoints) {
            for (var i in space.jointHash) {
                drawJoint(space.jointHash[i], "#F0F");
            }
        }        

        if (showContacts) {
            for (var i = 0; i < space.contactSolverArr.length; i++) {
                var contactSolver = space.contactSolverArr[i];
                for (var j = 0; j < contactSolver.contactArr.length; j++) {
                    var con = contactSolver.contactArr[j];
                    drawCircle(con.p, 2.0, 0, "#F00");
                    //drawArrow(con.p, vec2.add(con.p, vec2.scale(con.n, con.d)), "#F00");
                }
            }
        }
        
        //drawBox(clearBounds.mins, clearBounds.maxs, null, "#F00");        

        stats.timeDrawFrame = Date.now() - t0;

        if (showStats) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.font = "12pt menlo";
            ctx.fillStyle = "#333";
            ctx.textBaseline = "top";
            ctx.fillText("step: " + stats.timeStep + " draw: " + stats.timeDrawFrame, 4, 2);
            ctx.fillText("col: " + stats.timeCollision + " init_sv: " + stats.timeInitSolver + " vel_sv: " + stats.timeVelocitySolver + " pos_sv: " + stats.timePositionSolver, 4, 20);
            ctx.fillText("pos_iter: " + stats.positionIterations, 4, 38);
            ctx.restore();

            clearBounds.copy(canvasBounds);
        }
    }

    function drawJoint(joint, strokeStyle) {
        if (!joint.anchor1 || !joint.anchor2) {
            return;
        }

        var body1 = joint.body1;
        var body2 = joint.body2;

        var p1 = vec2.add(body1.p, vec2.rotate(joint.anchor1, body1.a));
        var p2 = vec2.add(body2.p, vec2.rotate(joint.anchor2, body2.a));

        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();

        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        ctx.save();
        ctx.stroke();
        ctx.restore();

        bounds = new Bounds;
        bounds.addPoint(p1);
        bounds.addPoint(p2);
        clearBounds.addBounds(bounds);

        drawCircle(p1, 2.5, 0, "#808");
        clearBounds.addBounds(new Bounds(new vec2(p1.x - 3, p1.y - 3), new vec2(p1.x + 3, p1.y + 3)));

        drawCircle(p2, 2.5, 0, "#808");
        clearBounds.addBounds(new Bounds(new vec2(p2.x - 3, p2.y - 3), new vec2(p2.x + 3, p2.y + 3)));
    }

    function drawBody(body, fillColor, outlineColor) {
        for (var i = 0; i < body.shapeArr.length; i++) {
            var shape = body.shapeArr[i];

            if (!canvasBounds.intersectsBounds(shape.bounds)) {
                continue;
            }

            if (!body.isStatic()) {
                clearBounds.addBounds(shape.bounds);
            }

            drawBodyShape(body, shape, fillColor, outlineColor);
        }
    }

    function drawBodyShape(body, shape, fillColor, outlineColor) {
        switch (shape.type) {
        case Shape.TYPE_CIRCLE:
            drawCircle(shape.tc, shape.r, body.a, fillColor, outlineColor);
            break;
        case Shape.TYPE_SEGMENT:
            drawSegment(shape.ta, shape.tb, shape.r, fillColor, outlineColor);
            break;
        case Shape.TYPE_POLY:
            drawPolygon(shape.tverts, fillColor, outlineColor);
            break;
        }

        if (showBounds) {
            var offset = new vec2(1, 1);
            drawBox(vec2.sub(shape.bounds.mins, offset), vec2.add(shape.bounds.maxs, offset), null, "#0A0");
            clearBounds.addBounds(shape.bounds);
        }
    }

    function drawArrow(p1, p2, strokeStyle) {
        var angle = vec2.toAngle(vec2.sub(p2, p1)) - Math.PI;

        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();

        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        ctx.save();
        ctx.translate(p2.x, p2.y);

        ctx.rotate(angle - Math.PI * 0.15);
        ctx.moveTo(6, 0);
        ctx.lineTo(0, 0);

        ctx.rotate(Math.PI * 0.3);
        ctx.lineTo(6, 0);
        
        ctx.lineJoint = "miter";
        ctx.stroke();
        ctx.restore();
    }    

    function drawBox(mins, maxs, fillStyle, strokeStyle) {
        ctx.beginPath();
        ctx.rect(mins.x, mins.y, maxs.x - mins.x, maxs.y - mins.y);

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        }
    }

    function drawCircle(center, radius, angle, fillStyle, strokeStyle) {
        ctx.beginPath();

        ctx.arc(center.x, center.y, radius, 0, Math.PI*2, true);
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.moveTo(center.x, center.y);
            var rt = vec2.add(center, vec2.scale(vec2.rotation(angle), radius));
            ctx.lineTo(rt.x, rt.y);
            ctx.stroke();
        }
    }

    function drawSegment(a, b, radius, fillStyle, strokeStyle) {
        ctx.beginPath();

        var dn = vec2.normalize(vec2.perp(vec2.sub(b, a)));
        var start_angle = dn.toAngle(); 
        ctx.arc(a.x, a.y, radius, start_angle, start_angle + Math.PI, false);

        var ds = vec2.scale(dn, -radius);
        var bp = vec2.add(b, ds);
        ctx.lineTo(bp.x, bp.y);

        start_angle += Math.PI;
        ctx.arc(b.x, b.y, radius, start_angle, start_angle + Math.PI, false);

        ds = vec2.scale(dn, radius);
        var ap = vec2.add(a, ds);
        ctx.lineTo(ap.x, ap.y);

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        }
    }

    function drawPolygon(verts, fillStyle, strokeStyle) {
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        
        for (var i = 0; i < verts.length; i++) {
            ctx.lineTo(verts[i].x, verts[i].y);
        }

        ctx.lineTo(verts[verts.length - 1].x, verts[verts.length - 1].y);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        }
    }

    function getMousePoint(e) {
        return { 
            x: document.body.scrollLeft + e.clientX - canvas.offsetLeft, 
            y: document.body.scrollTop + e.clientY - canvas.offsetTop };
    }

    function onMouseDown(e) {
        mouseDown = true;

        if (mouseJoint) {
            space.removeJoint(mouseJoint);
            mouseJoint = null;
        }

        var point = getMousePoint(e);

        var p = new vec2(point.x - canvas.width * 0.5, canvas.height - point.y);
        var shape = space.findShapeByPoint(p);
        if (shape) {
            mouseBody.p = p;
            mousePoint = mouseBody.p;
            mousePoint_old = mouseBody.p;

            var body = shape.body;
            mouseJoint = new MouseJoint(mouseBody, body, new vec2(0, 0), body.worldToLocal(p));
            mouseJoint.maxForce = Math.min(body.m * 45000, 40000);
            space.addJoint(mouseJoint);
        }

        e.preventDefault();
    }

    function onMouseUp(e) { 
	    if (mouseDown) {
            mouseDown = false;
            
            if (mouseJoint) {
                space.removeJoint(mouseJoint);
                mouseJoint = null;
            }
		}

        e.preventDefault();
	}

    function onMouseMove(e) {
        var point = getMousePoint(e);
        if (mouseDown) {
            mousePoint = new vec2(point.x - canvas.width * 0.5, canvas.height - point.y);
        }

        e.preventDefault();
    }

    function onMouseOut(e) {
        if (mouseDown) {
            mouseDown = false;

            if (mouseJoint) {
                space.removeJoint(mouseJoint);
                mouseJoint = null;
            }
        }        

        e.preventDefault();
    }

    function touchHandler(e) {
        var touches = e.changedTouches;
        var first = touches[0];
        var type = "";

        switch (e.type) {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;
        case "touchend":   type = "mouseup"; break;
        default: return;
        }

        //initMouseEvent(type, canBubble, cancelable, view, clickCount, 
        //           screenX, screenY, clientX, clientY, ctrlKey, 
        //           altKey, shiftKey, metaKey, button, relatedTarget);   
        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                      first.screenX, first.screenY, 
                                      first.clientX, first.clientY, false, 
                                      false, false, false, 0/*left*/, null);

        first.target.dispatchEvent(simulatedEvent);
        e.preventDefault();
    }

    function onKeyDown(e) {
        if (!e) {
            e = event;
        }

        switch (e.keyCode) {
        case 66: // 'b'
            showBounds = !showBounds;
            break;        
        case 67: // 'c'
            showContacts = !showContacts;
            break;
        case 74: // 'j'
            showJoints = !showJoints;
            break;
        case 83: // 's'
            showStats = !showStats;
            break;
        case 49: // '1'            
        case 50: // '2'
        case 51: // '3'
        case 52: // '4'
        case 53: // '5'
        case 54: // '6'
        case 55: // '7'
            sceneNumber = e.keyCode - 48;
            initScene();
            break;
        case 82: // 'r'
            initScene();
            break;
        case 32: // 'space'            
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

	return { main: main };
}();