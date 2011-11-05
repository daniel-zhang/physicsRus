Joint = function(body1, body2, collideConnected) {
	if (arguments.length == 0)
		return;

    if (Joint.hashid_counter == undefined)
        Joint.hashid_counter = 0;
    
    this.hashid = Joint.hashid_counter++;

	this.body1 = body1;
	this.body2 = body2;

	// allow collision between to cennected body
	this.collideConnected = collideConnected;

	// sepration bias coefficient
	this.bias_coeff = 0.1;

	// max sepration bias
	this.max_bias = Number.POSITIVE_INFINITY;

	// max force
	this.max_force = Number.POSITIVE_INFINITY;

	// is breakable ?
	this.breakable = false;
}

//------------------------------------------
// Distance Joint
//------------------------------------------

DistanceJoint = function(body1, body2, anchor1, anchor2) {
	Joint.call(this, body1, body2, true);

	this.anchor1 = anchor1;
	this.anchor2 = anchor2;

	var p1 = vec2.add(body1.p, vec2.rotate(anchor1, body1.a));
	var p2 = vec2.add(body2.p, vec2.rotate(anchor2, body2.a));
	
	// rest distance
	this.restLength = vec2.dist(p1, p2);

	// accumulated normal impulse
	this.jn_acc = 0;
}

DistanceJoint.prototype = new Joint;
DistanceJoint.prototype.constructor = DistanceJoint;

DistanceJoint.prototype.preStep = function(dt, dt_inv) {
	var body1 = this.body1;
	var body2 = this.body2;

	this.r1 = vec2.rotate(this.anchor1, body1.a);
	this.r2 = vec2.rotate(this.anchor2, body2.a);

	var d = vec2.sub(vec2.add(body2.p, this.r2), vec2.add(body1.p, this.r1));
	var dist = d.length();

	// normal
	this.n = vec2.scale(d, 1 / dist);

	this.kn_inv = 1 / k_scalar(body1, body2, this.r1, this.r2, this.n);

	// max impulse
	this.j_max = this.max_force * dt;

	// separation bias
	this.bias = Math.clamp(this.bias_coeff * (this.restLength - dist) * dt_inv, -this.max_bias, this.max_bias);	

	// apply cached impulses
	applyImpulses(body1, body2, this.r1, this.r2, vec2.scale(this.n, this.jn_acc));
}

DistanceJoint.prototype.applyImpulse = function() {
	var body1 = this.body1;
	var body2 = this.body2;

	var dv = relative_velocity(body1, body2, this.r1, this.r2);
	var dvn = dv.dot(this.n);

	// normal impulse
	var jn = (-dvn + this.bias) * this.kn_inv;
	var jn_old = this.jn_acc;
	this.jn_acc = Math.clamp(jn_old + jn, -this.j_max, this.j_max);
	jn = this.jn_acc - jn_old;

	applyImpulses(body1, body2, this.r1, this.r2, vec2.scale(this.n, jn));
}

DistanceJoint.prototype.getImpulse = function() {
	return Math.abs(this.jn_acc);
}

//------------------------------------------
// MaxDistance Joint
//------------------------------------------

MaxDistanceJoint = function(body1, body2, anchor1, anchor2, min, max) {
	Joint.call(this, body1, body2, true);

	this.anchor1 = anchor1;
	this.anchor2 = anchor2;	

	this.min = min || 0;
	this.max = max;

	if (max == undefined) {
		var p1 = vec2.add(body1.p, vec2.rotate(anchor1, body1.a));
		var p2 = vec2.add(body2.p, vec2.rotate(anchor2, body2.a));

		this.max = vec2.dist(p1, p2);
	}

	// accumulated normal impulse
	this.jn_acc = 0;
}

MaxDistanceJoint.prototype = new Joint;
MaxDistanceJoint.prototype.constructor = MaxDistanceJoint;

MaxDistanceJoint.prototype.preStep = function(dt, dt_inv) {
	var body1 = this.body1;
	var body2 = this.body2;

	this.r1 = vec2.rotate(this.anchor1, body1.a);
	this.r2 = vec2.rotate(this.anchor2, body2.a);

	var d = vec2.sub(vec2.add(body2.p, this.r2), vec2.add(body1.p, this.r1));
	var dist = d.length();

	// normal
	this.n = vec2.scale(d, 1 / dist);

	this.kn_inv = 1 / k_scalar(body1, body2, this.r1, this.r2, this.n);

	// max impulse
	this.j_max = this.max_force * dt;

	// penetration distance
	var pd = 0;
	if (dist < this.min) {
		pd = this.min - dist;
	}
	else if (dist > this.max) {
		pd = this.max - dist;
	}

	// separation bias
	this.bias = Math.clamp(this.bias_coeff * pd * dt_inv, -this.max_bias, this.max_bias);

	if (this.bias == 0) {
		this.jn_acc = 0;
	}

	// apply cached impulses
	applyImpulses(body1, body2, this.r1, this.r2, vec2.scale(this.n, this.jn_acc));
}

MaxDistanceJoint.prototype.applyImpulse = function() {
	if (this.bias == 0) {
		return; 
	}

	var body1 = this.body1;
	var body2 = this.body2;

	var dv = relative_velocity(body1, body2, this.r1, this.r2);
	var dvn = dv.dot(this.n);

	var jn = (-dvn + this.bias) * this.kn_inv;
	var jn_old = this.jn_acc;
	this.jn_acc = Math.clamp(jn_old + jn, -this.j_max, this.j_max);
	jn = this.jn_acc - jn_old;

	applyImpulses(body1, body2, this.r1, this.r2, vec2.scale(this.n, jn));
}

MaxDistanceJoint.prototype.getImpulse = function() {
	return Math.abs(this.jn_acc);
}

//------------------------------------------
// Angle Joint
//------------------------------------------

AngleJoint = function(body1, body2, rate) {
	Joint.call(this, body1, body2, false);

	this.rate = rate;

	// accumulated angular impulse
	this.j_acc = 0;
}

AngleJoint.prototype = new Joint;
AngleJoint.prototype.constructor = AngleJoint;

AngleJoint.prototype.preStep = function(dt, dt_inv) {
	var body1 = this.body1;
	var body2 = this.body2;

	this.k_inv = 1 / (body1.i_inv + body2.i_inv);

	// max impulse
	this.j_max = this.max_force * dt;

	// apply cached impulses
	body1.w -= this.j_acc * body1.i_inv;
	body2.w += this.j_acc * body2.i_inv;
}

AngleJoint.prototype.applyImpulse = function() {
	var body1 = this.body1;
	var body2 = this.body2;

	var dw = body2.w - body1.w + this.rate;
	
	// normal impulse
	var j = -dw * this.k_inv;
	var j_old = this.j_acc;
	this.j_acc = Math.clamp(j_old + j, -this.j_max, this.j_max);	
	j = this.j_acc - j_old;

	body1.w -= j * body1.i_inv;
	body2.w += j * body2.i_inv;
}

AngleJoint.prototype.getImpulse = function() {
	return 0;
}

//------------------------------------------
// Revolute Joint (2D Ball-Socket)
//------------------------------------------

RevoluteJointLocal = function(body1, body2, anchor1, anchor2) {
	if (arguments.length == 0)
		return;

	Joint.call(this, body1, body2, true);

	this.anchor1 = anchor1;
	this.anchor2 = anchor2;	

	this.j_acc = new vec2(0, 0);

	// ** TO BE IMPLEMENTED
	this.enableLimit = false;
	this.lowerAngle = 0;
	this.upperAngle = 0;

	this.enableMotor = false;
	this.maxMotorTorque = 0;
	this.motorSpeed = 0;
}

RevoluteJointLocal.prototype = new Joint;
RevoluteJointLocal.prototype.constructor = RevoluteJointLocal;

RevoluteJointLocal.prototype.preStep = function(dt, dt_inv) {
	var body1 = this.body1;
	var body2 = this.body2;
		
	this.r1 = vec2.rotate(this.anchor1, body1.a);
	this.r2 = vec2.rotate(this.anchor2, body2.a);

	this.k = k_tensor(body1, body2, this.r1, this.r2);
	
	// max impulse
	this.j_max = this.max_force * dt;

	var d = vec2.sub(vec2.add(body2.p, this.r2), vec2.add(body1.p, this.r1));
	this.bias = vec2.truncate(vec2.scale(d, -this.bias_coeff * dt_inv), this.max_bias);

	applyImpulses(body1, body2, this.r1, this.r2, this.j_acc);
}

RevoluteJointLocal.prototype.applyImpulse = function() {
	var body1 = this.body1;
	var body2 = this.body2;

	var dv = relative_velocity(body1, body2, this.r1, this.r2);

	var j = this.k.mulvec(vec2.sub(this.bias, dv));
	var j_old = this.j_acc;
	this.j_acc = vec2.truncate(vec2.add(j_old, j), this.j_max);
	j = vec2.sub(this.j_acc, j_old);

	applyImpulses(body1, body2, this.r1, this.r2, j);
}

RevoluteJointLocal.prototype.getImpulse = function() {
	return this.j_acc.length();
}

RevoluteJoint = function(body1, body2, pivot) {
	RevoluteJointLocal.call(this, body1, body2, body1.worldToLocal(pivot), body2.worldToLocal(pivot));
}

RevoluteJoint.prototype = new RevoluteJointLocal;
RevoluteJoint.prototype.constructor = RevoluteJoint;

//------------------------------------------
// Damped Spring
//------------------------------------------

DampedSpring = function(body1, body2, anchor1, anchor2, restLength, stiffness, damping) {
	Joint.call(this, body1, body2, true);

	this.anchor1 = anchor1;
	this.anchor2 = anchor2;	

	this.restLength = restLength;
	this.stiffness = stiffness;
	this.damping = damping;
}

DampedSpring.prototype = new Joint;
DampedSpring.prototype.constructor = DampedSpring;

DampedSpring.prototype.preStep = function(dt, dt_inv) {
	var body1 = this.body1;
	var body2 = this.body2;

	this.r1 = vec2.rotate(this.anchor1, body1.a);
	this.r2 = vec2.rotate(this.anchor2, body2.a);

	var d = vec2.sub(vec2.add(body2.p, this.r2), vec2.add(body1.p, this.r1));
	var dist = d.length();

	// normal
	this.n = vec2.scale(d, 1 / dist);

	var kn = k_scalar(body1, body2, this.r1, this.r2, this.n);
	this.kn_inv = 1 / kn;
	
	//
	this.target_dvn = 0;
	this.v_coeff = 1.0 - Math.exp(-this.damping * dt * kn);

	// apply spring force
	var spring_f = (this.restLength - dist) * this.stiffness;
	this.spring_j = spring_f * dt;
	applyImpulses(body1, body2, this.r1, this.r2, vec2.scale(this.n, this.spring_j));
}

DampedSpring.prototype.applyImpulse = function() {
	var body1 = this.body1;
	var body2 = this.body2;

	var dv = relative_velocity(body1, body2, this.r1, this.r2);
	var dvn = dv.dot(this.n) - this.target_dvn;

	// compute velocity loss from drag
	var v_damp = -dvn * this.v_coeff;
	this.target_dvn = dvn + v_damp;

	applyImpulses(body1, body2, this.r1, this.r2, vec2.scale(this.n, v_damp * this.kn_inv));
}

DampedSpring.prototype.getImpulse = function() {
	return Math.abs(this.spring_j);
}

