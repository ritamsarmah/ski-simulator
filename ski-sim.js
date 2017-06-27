//
// Ritam Sarmah
// 204631485
// CS 174A
// Assignment 2
//
// ski-sim.js
//

/* Globals */
let SLOPE_L = 128;
let SLOPE_W = 256;
let NUM_TREES = 15;
let NUM_ROCKS = 10;
let NUM_MTNS = 38;
let MAX_X_BOUND = 3.3;

let PUSH_TIME = 2.9;
let WAIT_TIME_1 = 1;
let WAIT_TIME_2 = 0.5;
let STREAM_TIME = 10;

var ENABLE_LOOK = true; // enables following camera

/* Game States */
let GAME_START = 0;
let GAME_PLAY  = 1;
let GAME_OVER  = 2;

/* JUMP States */
let ON_GROUND = 0;
let UP        = 1;
let DOWN      = 2;

/* Sounds */
var ouch = new Audio('ouch.mp3');
var hit = new Audio('hit.mp3');
hit.volume = 0.7;

var background = new Audio('background.mp3');
background.volume = 0.4;
background.addEventListener('timeupdate', function() {
    var buffer = 0.44
    if (this.currentTime > this.duration - buffer) {
        this.currentTime = 0;
        this.play()
    }}, false);

var lose = new Audio('lose.mp3');
lose.volume = 0.4;

var ski_sound = new Audio('ski.mp3');
ski_sound.volume = 0.7;

/* Global game variables */
var score = 0;
var game_state = GAME_PLAY;

function get_random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Custom Shapes */
Declare_Any_Class( "Tree_Base", {
    'populate' (num_sides) {
        for (var i = 0; i < num_sides; i++) {
            var spin = rotation( i * 360/num_sides, 0, 1, 0 );
            var newPoint  = mult_vec( spin, vec4( 1, 0, 0, 1 ) );
            this.positions.push( vec3( newPoint[0], 0, newPoint[2] ) );
            this.positions.push( vec3( 0, 1, 0 ) );
            this.positions.push( vec3( 0, 0, 0 ) );

            var newNormal = mult_vec( spin, vec4( 0, 0, 1, 0 ) );
            this.normals.push( newNormal.slice(0,3) );
            this.normals.push( newNormal.slice(0,3) );
            this.normals.push( newNormal.slice(0,3) );

            this.texture_coords.push( vec2( 0, 0 ) );
            this.texture_coords.push( vec2( 0, 1 ) );
            this.texture_coords.push( vec2( 1, 0 ) );
            this.indices.push ( 3 * i );
            this.indices.push ( 3 * i + 1 );
            this.indices.push ( 3 * i + 2 );
        }
    }
}, Shape );


Declare_Any_Class( "Pyramid", {
    'populate' (num_sides) {
        var a = 1/Math.sqrt(3);

        this.positions.push( vec3(-1,-1,1), vec3(0,1,0), vec3(1,-1,1) );
        this.positions.push( vec3(0,1,0), vec3(1,-1,-1), vec3(1,-1,1) );
        this.positions.push( vec3(1,-1,-1), vec3(0,1,0), vec3(-1,-1,-1) );
        this.positions.push( vec3(-1,-1,-1), vec3(0,1,0), vec3(-1,-1,1) );
        this.positions.push( vec3(-1,-1,1), vec3(-1,-1,-1),vec3(1,-1,1) );
        this.positions.push( vec3(-1,-1,-1), vec3(1,-1,-1), vec3(1,-1,1) );

        this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) );
        this.normals.push( vec3(1,0,0), vec3(1,0,0), vec3(1,0,0) );
        this.normals.push( vec3(0,0,-1), vec3(0,0,-1), vec3(0,0,-1) );
        this.normals.push( vec3(-1,0,0), vec3(-1,0,0), vec3(-1,0,0) );
        this.normals.push( vec3(0,-1,0), vec3(0,-1,0), vec3(0,-1,0) );
        this.normals.push( vec3(0,-1,0), vec3(0,-1,0), vec3(0,-1, 0));

        this.texture_coords.push( vec3(0,0,1), vec3(1,1,0) );
        this.texture_coords.push( vec3(1,1,1), vec3(0,0,0) );
        this.texture_coords.push( vec3(0,0,1), vec3(1,1,0) );
        this.texture_coords.push( vec3(0,0,1), vec3(1,1,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(1,1,0) );
        this.texture_coords.push( vec3(0,1,1), vec3(1,1,0) );

        this.indices.push( 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17);
    }
}, Shape );

/* Distance and Game Over Text*/
Declare_Any_Class( "Text_Screen", {
     'construct'( context ) {
         this.visible = true;

         this.define_data_members( {
             string_map: context.globals.string_map, graphics_state: new Graphics_State(),
             text_material: context.shaders_in_use["Phong_Model"].material( Color(  0, 0, 0, 1 ), 1, 0, 0, 40, context.textures_in_use["text.png"] )
         } );

             var shapes = {
                 'debug_text': new Text_Line( 35 )
             };

             this.submit_shapes( context, shapes );
         },

    'display'( global_graphics_state ) {
        if (!this.visible) return;

        model_transform = identity();

        this.shapes.debug_text.set_string("Distance: " + score + "m");
        var font_scale = scale( .02, .04, 1 ),
        model_transform = mult( translation( -.95, .9, 0 ), font_scale );
        this.shapes.debug_text.draw( this.graphics_state, model_transform, this.text_material );

        if (game_state == GAME_OVER) {
            this.shapes.debug_text.set_string("Game Over");
            var font_scale = scale( 0.08, 0.12, 0.08 );
            model_transform = mult( translation( -0.49, -0.7, 0 ), font_scale );
            this.shapes.debug_text.draw( this.graphics_state, model_transform, this.text_material );
        }
    }
}, Scene_Component );

/* My Scene */
Declare_Any_Class( "Ski_Sim", {
    'construct'( context ) {
        context.globals.animate = true;
        this.globals = context.globals;

        if (!ENABLE_LOOK) {
            var camera_start = identity();
            camera_start = translation(0, -1, -25);
            context.globals.graphics_state.set( camera_start, perspective(45, context.width/context.height, .1, 1000), 0 );
        }

        var shapes = {
            'square': new Square(),
            'tree_base': new Tree_Base(7),
            'ball': new Grid_Sphere(30, 30),
            'smooth_ball': new Subdivision_Sphere(4),
            'tube': new Capped_Cylinder(30, 30),
            'box': new Cube(),
            'pyramid': new Pyramid(),
            'bear': new Shape_From_File("bear.obj")
        };

        this.submit_shapes( context, shapes );
        this.define_data_members( {
            last_ua : 15,
            last_fa : 120,
            last_la : 40,
            last_ta : 55,
            last_ha : 0,
            last_pa : 20,

            direction : [0, 0, 0],
            x_pos : 0,
            y_pos : 0,
            person_state : 1,
            jump_state : ON_GROUND,
            state_timer : PUSH_TIME,
            last_t : 0,
            omega : 0,
            omega_offset : 0,
            velocity : 50,

            slope_time : [0, 0],
            slope_offset : [0, -2*SLOPE_W+1], // [-SLOPE_W, SLOPE_W],
            slope_pos : Array(), // multiple slopes that rotate to give impression of endless runner

            tree_time : Array(),
            tree_offset : Array(), // only z_pos
            tree_pos : Array(), // 3D array [x, y, z]
            tree_heights : Array(),
            tree_rotation : Array(),

            rock_time : Array(),
            rock_offset : Array(), // only z_pos
            rock_pos : Array(), // 3D array [x, y, z]

            bear_time : 0,
            bear_offset : -SLOPE_W,
            bear_pos : [-10, 0, 0],
            bear_visible : false,
            bear_rotation : 15,

            mountain_h : Array(),
            mountain_l : Array(),
            mountain_x : Array(),

            // Colors
            gray_plastic  : context.shaders_in_use["Phong_Model" ].material( Color( .5,.5,.5, 1 ), .4, .8, .4, 20 ),
            white_snow: context.shaders_in_use["Phong_Model"].material( Color(1, 1, 1, 1), 1, 1, 1, 40),
            blue_clay: context.shaders_in_use["Phong_Model"].material( Color(0.13, 0.13, 0.5, 1), 1, 1, 1, 40),
            cool_blue: context.shaders_in_use["Phong_Model"].material( Color(8/255, 181/255, 200/255, 1), .4, .8, .4, 40),
            navy_blue: context.shaders_in_use["Phong_Model"].material( Color(41/255, 68/255, 60/255, 1), .4, .8, .4, 40),
            skin: context.shaders_in_use["Phong_Model"].material( Color(0.89, 0.76, 0.6, 1), .4, .8, .4, 40),
            tree_green: context.shaders_in_use["Phong_Model"].material( Color(34/255, 139/255, 34/255, 1), .4, .8, .4, 40),
            brown_bear: context.shaders_in_use["Fake_Bump_Map"].material( Color( .5,.5,.5,1 ), .4, .3, .3, 40, context.textures_in_use["bear.jpg"]),

            // Textures
            blue_leather: context.shaders_in_use["Phong_Model"].material( Color( 0, 0.3, 0.5, 0.7 ), .8, .8, .8, 40, context.textures_in_use["leather.jpg"] ),
            sky_blue: context.shaders_in_use["Phong_Model"].material( Color( 135/255, 206/255, 250/255, 1 ), .5, .5, .5, 40, context.textures_in_use["sky.jpg"] ),
            snow: context.shaders_in_use["Phong_Model"].material( Color( 0,0,0,1 ), 1,1,1,40, context.textures_in_use["snow.jpg"] ),
            mountain: context.shaders_in_use["Phong_Model"].material( Color( 82/255, 92/255, 139/255, 0.7 ), .5, .5, .5, 40, context.textures_in_use["mountain.jpg"] ),

            // Text
            string_map: context.globals.string_map, start_index: 0, tick: 0, visible: false, graphics_state: new Graphics_State(),
            text_material: context.shaders_in_use["Phong_Model"].material( Color( 0, 0, 0, 1 ), 1, 0, 0, 100, context.textures_in_use["text.png"] )
        } );

        // Play background music
        background.play();

        for (var i = 0; i < NUM_TREES; i++) {
            this.tree_pos.push([get_random(-(SLOPE_L/2)), 0, -SLOPE_W]);
            this.tree_offset.push(get_random(-SLOPE_W, 0));
            this.tree_heights.push(get_random(4, 7));
            this.tree_rotation.push(get_random(0, 45));
            this.tree_time.push(0);
        }

        for (var i = 0; i < NUM_ROCKS; i++) {
            this.rock_pos.push([get_random(-(SLOPE_L/4)), -1, -SLOPE_W]);
            this.rock_offset.push(get_random(-SLOPE_W, 0));
            this.rock_time.push(0);
        }

        for (var i = 0; i < NUM_MTNS; i++) {
            this.mountain_h.push(get_random(7, 16));
            this.mountain_l.push(get_random(20,30));
            this.mountain_x.push(get_random(8,12));
        }
    },

    'update_strings'( debug_screen_object ) {
        debug_screen_object.string_map["frame_rate"] = "Frame Rate: " + 1/(this.globals.graphics_state.animation_delta_time/1000);
    },

    'init_keys'( controls ) {
        controls.add( "left",     this, function() { this.direction[0] =  1; } );     controls.add( "left",     this, function() { this.direction[0] =  0; }, {'type':'keyup'} );
        controls.add( "right",     this, function() { this.direction[1] =  1; } );     controls.add( "right",     this, function() { this.direction[1] =  0; }, {'type':'keyup'} );
        controls.add( "Space", this, function() { this.direction[2] =  1; } );
    },

    'draw_tree'( model_transform, graphics_state, height ) {
        for (var i = 0; i < height; i++) {
            this.shapes.tree_base.draw(graphics_state, model_transform, this.tree_green);
            model_transform = mult(model_transform, translation(0, 0.7, 0));
            model_transform = mult(model_transform, scale(0.8, 0.8, 0.8));
        }
        model_transform = mult(model_transform, scale(height*(1/0.8), height*(1/0.8), height*(1/0.8)));
        return model_transform;
    },

    'draw_person'( model_transform, graphics_state, time ) {

        let TORSO_L = 4;
        let TORSO_H = 6;
        let TORSO_W = 2;

        let TORSO_COLOR = this.blue_clay;

        let PELVIS_L = 4;
        let PELVIS_H = 2;
        let PELVIS_W = 2;

        let PELVIS_COLOR = this.cool_blue;

        let HEAD_L = 3;
        let HEAD_H = 4;
        let HEAD_W = 3;

        let SKIN_COLOR = this.skin;
        let HEAD_COLOR = this.skin;

        let NECK_L = 1;
        let NECK_H = 1;
        let NECK_W = 3;

        let ARM_L = 1;
        let ARM_H = 1;
        let ARM_W = 8;

        let ARM_COLOR = this.blue_clay;
        let HAND_COLOR = this.skin;

        let LEG_L = 1;
        let LEG_H = 1;
        let LEG_W = 10;

        let FOOT_L = 2;
        let FOOT_H = 2;
        let FOOT_W = 4;

        let LEG_COLOR = PELVIS_COLOR;
        let FOOT_COLOR = this.blue_leather;

        let POLE_W = 25;
        let POLE_R = 0.5;
        let POLE_COLOR = this.gray_plastic;

        let SKI_L = 25;
        let SKI_W = 2;
        let SKI_H = 0.5;
        let SKI_COLOR = this.navy_blue;

        this.draw_torso = function(model_transform, angle) {
            model_transform = mult(model_transform, rotation(180, 0, 0, 1));
            model_transform = mult(model_transform, rotation(-angle, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, -6, 0));
            model_transform = mult(model_transform, scale(TORSO_L, TORSO_H, TORSO_W));
            this.shapes.box.draw(graphics_state, model_transform, TORSO_COLOR);
            model_transform = mult(model_transform, scale(1/TORSO_L, 1/TORSO_H, 1/TORSO_W));
            model_transform = mult(model_transform, rotation(-180, 0, 0, 1));
            return model_transform;
        }

        this.draw_pelvis = function(model_transform) {
            model_transform = mult(model_transform, rotation(0, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, -2, 0));
            model_transform = mult(model_transform, scale(PELVIS_L, PELVIS_H, PELVIS_W));
            this.shapes.box.draw(graphics_state, model_transform, PELVIS_COLOR);
            model_transform = mult(model_transform, scale(1/PELVIS_L, 1/PELVIS_H, 1/PELVIS_W));
            return model_transform;
        }

        this.draw_neck = function(model_transform) {
            model_transform = mult(model_transform, translation(0, 7, 0));
            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
            model_transform = mult(model_transform, scale(NECK_L, NECK_H, NECK_W));
            this.shapes.tube.draw(graphics_state, model_transform, SKIN_COLOR);
            model_transform = mult(model_transform, scale(1/NECK_L, 1/NECK_H, 1/NECK_W));
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
            return model_transform;
        }

        this.draw_head = function(model_transform, angle) {
            model_transform = mult(model_transform, translation(0, 4, 0));
            model_transform = mult(model_transform, rotation(angle, 1, 0, 0));
            model_transform = mult(model_transform, rotation(90, 0, 1, 0));
            model_transform = mult(model_transform, scale(HEAD_L, HEAD_H, HEAD_W));
            this.shapes.smooth_ball.draw(graphics_state, model_transform, HEAD_COLOR);
            model_transform = mult(model_transform, scale(1/HEAD_L, 1/HEAD_H, 1/HEAD_W));
            return model_transform;
        }

        this.draw_joint = function(model_transform, size, color) {
            model_transform = mult(model_transform, scale(size, size, size));
            this.shapes.ball.draw(graphics_state, model_transform, color);
            model_transform = mult(model_transform, scale(1/size, 1/size, 1/size));
            return model_transform;
        }

        this.draw_arm = function(model_transform, u_angle, f_angle, side) {
            arm_stack = Array();
            arm_stack.push(model_transform);

            var arm_tilt = 15;

            // Draw upper arm
            model_transform = mult(model_transform, rotation(u_angle, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, -3.2, 0));

            // Rotate upper arm
            if (side == 'r') {
                model_transform = mult(model_transform, rotation(arm_tilt, 0, 0, 1));
                model_transform = mult(model_transform, translation(1, 0, 0));
            } else {
                model_transform = mult(model_transform, rotation(-arm_tilt, 0, 0, 1));
                model_transform = mult(model_transform, translation(-1, 0, 0));
            }

            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
            model_transform = mult(model_transform, scale(ARM_L, ARM_H, ARM_W));
            this.shapes.tube.draw(graphics_state, model_transform, ARM_COLOR);
            model_transform = mult(model_transform, scale(1/ARM_L, 1/ARM_H, 1/ARM_W));
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));

            // Draws elbow
            model_transform = mult(model_transform, translation(0, -4, 0));
            model_transform = this.draw_joint(model_transform, 1, ARM_COLOR);

            // Rotate forearm
            if (side == 'r') {
                model_transform = mult(model_transform, rotation(-arm_tilt, 0, 0, 1));
                //model_transform = mult(model_transform, rotation(-20, 0, 1, 0));
            } else {
                model_transform = mult(model_transform, rotation(arm_tilt, 0, 0, 1));
                //model_transform = mult(model_transform, rotation(20, 0, 1, 0));
            }

            // Draw forearm
            model_transform = mult(model_transform, rotation(f_angle, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, -4, 0));

            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
            model_transform = mult(model_transform, scale(ARM_L, ARM_H, ARM_W));
            this.shapes.tube.draw(graphics_state, model_transform, ARM_COLOR);
            model_transform = mult(model_transform, scale(1/ARM_L, 1/ARM_H, 1/ARM_W));
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));

            // Draws hand
            model_transform = mult(model_transform, translation(0, -5, 0));
            model_transform = this.draw_joint(model_transform, 1.5, HAND_COLOR);

            // Draw pole
            model_transform = this.draw_pole(model_transform);

            return model_transform;
        }

        this.draw_leg = function(model_transform, angle, side) {
            leg_stack = Array();
            leg_stack.push(model_transform);

            var leg_spread = 0;
            if (game_state == GAME_OVER) {
                leg_spread = 40;
            }

            var leg_bend = angle;

            // Rotate thigh
            if (side == 'r') {
                model_transform = mult(model_transform, rotation(leg_spread, 0, 0, 1));
            } else {
                model_transform = mult(model_transform, rotation(-leg_spread, 0, 0, 1));
            }

            // Draw thigh
            model_transform = mult(model_transform, rotation(leg_bend, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, -5, 0));
            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
            model_transform = mult(model_transform, scale(ARM_L, ARM_H, ARM_W));
            this.shapes.tube.draw(graphics_state, model_transform, LEG_COLOR);
            model_transform = mult(model_transform, scale(1/ARM_L, 1/ARM_H, 1/ARM_W));
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));

            // Draws knee
            model_transform = mult(model_transform, translation(0, -4, 0));
            model_transform = this.draw_joint(model_transform, 1, LEG_COLOR);

            // Rotate calf
            if (game_state == GAME_PLAY) {
                if (side == 'r') {
                    model_transform = mult(model_transform, rotation(-leg_spread, 0, 0, 1));
                } else {
                    model_transform = mult(model_transform, rotation(leg_spread, 0, 0, 1));
                }
            }

            // Draw calf
            model_transform = mult(model_transform, rotation(-leg_bend-5, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, -4, 0));

            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
            model_transform = mult(model_transform, scale(ARM_L, ARM_H, ARM_W));
            this.shapes.tube.draw(graphics_state, model_transform, LEG_COLOR);
            model_transform = mult(model_transform, scale(1/ARM_L, 1/ARM_H, 1/ARM_W));
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));

            // Draws foot
            model_transform = mult(model_transform, translation(0, -5, 0));
            model_transform = mult(model_transform, scale(FOOT_L, FOOT_H, FOOT_W));
            this.shapes.pyramid.draw(graphics_state, model_transform, FOOT_COLOR);
            model_transform = mult(model_transform, scale(1/FOOT_L, 1/FOOT_H, 1/FOOT_W));

            // Draws ski
            model_transform = mult(model_transform, translation(0, -1.5, 0));
            model_transform = this.draw_ski(model_transform, 90);

            return model_transform;
        }

        this.draw_pole = function(model_transform) {
            model_transform = mult(model_transform, rotation(pole_angle, 1, 0, 0))
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
            model_transform = mult(model_transform, translation(0, 0, POLE_W/2));
            model_transform = mult(model_transform, scale(POLE_R, POLE_R, POLE_W));
            this.shapes.tube.draw(graphics_state, model_transform, POLE_COLOR);
            model_transform = mult(model_transform, scale(1/POLE_R, 1/POLE_R, 1/POLE_W));
            model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
            return model_transform;
        }

        this.draw_ski = function(model_transform, angle) {
            model_transform = mult(model_transform, rotation(90, 0, 1, 0));
            model_transform = mult(model_transform, scale(SKI_L, SKI_H, SKI_W));
            this.shapes.box.draw(graphics_state, model_transform, SKI_COLOR);
            model_transform = mult(model_transform, scale(1/SKI_L, 1/SKI_H, 1/SKI_W));
            model_transform = mult(model_transform, rotation(-90, 0, 1, 0));
            return model_transform;
        }

        this.omega = (this.omega_offset - time)/200;

        var upper_arm_angle = this.last_ua;
        var forearm_angle = this.last_fa;
        var leg_angle = this.last_la
        var torso_angle = this.last_ta;
        var head_angle = this.last_ha;
        var pole_angle = this.last_pa;

        switch (this.person_state) {
            case 0: // stands straight
                upper_arm_angle = 0;
                forearm_angle = 0;
                leg_angle = 40;
                torso_angle = 0;
                head_angle = 0;
                pole_angle = 90;
                break;
            case 1: // propel forward
                upper_arm_angle = 30*Math.cos(this.omega) + 40; // max: 70, min = 10
                forearm_angle = upper_arm_angle;
                leg_angle = 40;
                torso_angle = -(15*Math.cos(this.omega) + 40); // max: -25, min = -55
                head_angle = -torso_angle;
                pole_angle = 90;
                break;
            case 2: // transition from propel to streamline
                var transition_factor = 3;
                if (this.last_ua > 15) {
                    upper_arm_angle -= transition_factor;
                }

                if (this.last_fa < 80) {
                    forearm_angle += transition_factor;
                }

                if (this.last_ta > -55) {
                    torso_angle -= transition_factor;
                }

                if (this.last_ha < 55) {
                    head_angle += transition_factor;
                }

                if (this.last_pa > 47) {
                    pole_angle -= transition_factor;
                }
                break;
            case 3: // Hold current position (for streamline)
                upper_arm_angle = this.last_ua;
                forearm_angle = this.last_fa;
                leg_angle = this.last_la;
                torso_angle = this.last_ta;
                head_angle = this.last_ha;
                pole_angle = this.last_pa;
                break;
            case 4: // transition from streamline to propel
                var transition_factor = 3;
                if (this.last_ua < 30*Math.cos(this.omega) + 40) {
                    upper_arm_angle += transition_factor;
                }

                if (this.last_fa > 30*Math.cos(this.omega) + 40) {
                    forearm_angle -= transition_factor;
                }

                if (this.last_ta < -(15*Math.cos(this.omega) + 40)) {
                    torso_angle += transition_factor;
                }

                if (this.last_pa < 90) {
                    pole_angle += transition_factor+2;
                }
                this.omega_offset = time;
                break;
            case 5: // swerve left
                upper_arm_angle = 90;
                forearm_angle = -20;
                leg_angle = 40;
                torso_angle = 0;
                head_angle = 0;
                pole_angle = 180;
                break;
            default:
        }

        this.last_ua = upper_arm_angle;
        this.last_fa = forearm_angle;
        this.last_la = leg_angle;
        this.last_ta = torso_angle;
        this.last_ha = head_angle;
        this.last_pa = pole_angle;

        var stack = Array();

        // Scales to human size
        model_transform = mult(model_transform, scale(1/20, 1/20, 1/20));

        // Aligns with slope
        model_transform = mult(model_transform, rotation(5, 1, 0, 0));

        // Set hip joint (torso and pelvis rotate around this)
        stack.push(model_transform);

        model_transform = this.draw_torso(model_transform, torso_angle);
        stack.push(model_transform);

        model_transform = this.draw_neck(model_transform);
        this.draw_head(model_transform, head_angle);

        // Draw right arm
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, translation(4, 4, 0)); // shoulder position
        if (game_state == GAME_OVER) {
            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
        }
        this.draw_joint(model_transform, 1.5, ARM_COLOR); // draw shoulder
        this.draw_arm(model_transform, upper_arm_angle, forearm_angle, 'r');

        // Draw left arm
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, translation(-4, 4, 0)); // shoulder position
        if (game_state == GAME_OVER) {
            model_transform = mult(model_transform, rotation(90, 1, 0, 0));
        }
        this.draw_joint(model_transform, 1.5, ARM_COLOR); // draw shoulder
        this.draw_arm(model_transform, upper_arm_angle, forearm_angle, 'l');

        /* Lower body */
        stack.pop();
        model_transform = stack.pop();

        // Draw pelvis
        model_transform = this.draw_pelvis(model_transform);
        stack.push(model_transform);

        // Draw right leg
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, translation(3, -1, 0));
        this.draw_joint(model_transform, 1.5, LEG_COLOR);
        this.draw_leg(model_transform, leg_angle, 'r');

        // Draw left leg
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, translation(-3, -1, 0));
        this.draw_joint(model_transform, 1.5, LEG_COLOR);
        this.draw_leg(model_transform, leg_angle, 'l');

        return model_transform;
    },

    'draw_slope'( model_transform, graphics_state ) {
        model_transform = mult(model_transform, translation(0, -1, 0));
        model_transform = mult(model_transform, scale(SLOPE_L, 10, SLOPE_W));
        model_transform = mult(model_transform, rotation(90, 1, 0, 0));
        this.shapes.square.draw(graphics_state, model_transform, this.snow)
    },

    'draw_rock'( model_transform, graphics_state ) {
        this.shapes.ball.draw(graphics_state, model_transform, this.gray_plastic);
        return model_transform;
    },

    'game_over' () {
        ski_sound.pause();
        background.pause();
        game_state = GAME_OVER;
        ouch.play();
        hit.play();
        lose.play();
    },

    'display'( graphics_state ) {
        var model_transform = identity();
        var t = graphics_state.animation_time;

        graphics_state.lights = [
            new Light( vec4(  30,  30,  34, 1 ), Color( 0.5, 0.5, 0.5, 1 ), 100000 ),
            new Light( vec4( -10, -20, -14, 0 ), Color( 1, 1, 1, 1 ), 100    )
        ];

        var stack = Array();
        stack.push(model_transform);

        // Accelerate to terminal velocity
        // if (this.velocity < 50) {
        //     this.velocity += 0.05;
        // }

        // 0 - standing (stationary)
        // 1 - propel forward
        // 2 - transition to streamline
        // 3 - streamline
        // 4 - transition to propel forwarde

        var time = t/1000;

        // Handle game over
        if (game_state == GAME_OVER) {
            this.person_state = 5;
            this.velocity = 0;
        } else {
            // Handle x direction movement
            if (time >= this.last_t+0.001) {
                if (this.direction[0] > 0) {
                    ski_sound.play();
                    if (this.x_pos > -MAX_X_BOUND) {
                        this.x_pos -= 0.1;
                    } else {
                        ski_sound.pause();
                        ski_sound.currentTime = 0;
                    }
                }
                else if (this.direction[1] > 0) {
                    ski_sound.play();
                    if (this.x_pos < MAX_X_BOUND) {
                        this.x_pos += 0.1;
                    }
                    else {
                        ski_sound.pause();
                        ski_sound.currentTime = 0;
                    }
                } else {
                    ski_sound.pause();
                    ski_sound.currentTime = 0;
                }
                this.last_t = time;
            }

            // Handle jump behavior
            // if (this.jump_state == UP) {
            //     this.y_pos += 0.2;
            //     if (this.y_pos >= 2) {
            //         this.jump_state == DOWN;
            //     }
            // }
            //
            // if (this.jump_state == DOWN) {
            //     if (this.y_pos > 0.2) {
            //         this.y_pos -= 0.2;
            //     } else {
            //         this.jump_state == ON_GROUND;
            //     }
            // }
            //
            // if (this.jump_state == ON_GROUND && this.direction[2] > 0) {
            //     this.jump_state = UP;
            // }

            if (this.state_timer <= time) {
                switch (this.person_state) {
                    case 0:
                        this.person_state = 1;
                        this.state_timer = time + PUSH_TIME;
                        break;
                    case 1:
                        this.person_state = 2;
                        this.state_timer = time + WAIT_TIME_1;
                        break;
                    case 2:
                        this.person_state = 3;
                        this.state_timer = time + STREAM_TIME;
                        break;
                    case 3:
                        this.person_state = 4;
                        this.state_timer = time + WAIT_TIME_2;
                        break;
                    case 4:
                        this.person_state = 1;
                        this.state_timer = time + PUSH_TIME;
                        break;
                }
            }
        }

        model_transform = stack.pop();
        stack.push(model_transform);

        // Set score
        if (game_state != GAME_OVER) {
            score = ~~(t/500);
        }

        // Draw person
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, translation(this.x_pos, this.y_pos, 20)); // 20 is arbitrary
        this.draw_person(model_transform, graphics_state, t);

        // Draw sky
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, rotation(180, 1, 0, 0));
        model_transform = mult(model_transform, rotation(180, 0, 1, 0));
        model_transform = mult(model_transform, scale(300, 300, 300));
        this.shapes.smooth_ball.draw(graphics_state, model_transform, this.sky_blue);

        // Draw landscape
        model_transform = stack.pop();
        stack.push(model_transform);

        // Draw background mountains
        model_transform = mult(model_transform, translation(SLOPE_L+40, 0, -SLOPE_W));
        for (var i = 0; i < NUM_MTNS; i++) {
            model_transform = mult(model_transform, translation(-this.mountain_x[i], 0, 0));
            model_transform = mult(model_transform, scale(this.mountain_l[i], this.mountain_h[i], 10));
            this.shapes.pyramid.draw(graphics_state, model_transform, this.mountain);
            model_transform = mult(model_transform, scale(1/this.mountain_l[i], 1/this.mountain_h[i], 1/10));
        }

        // Draw nonmoving slope
        model_transform = stack.pop();
        stack.push(model_transform);
        model_transform = mult(model_transform, translation(0, -0.1, 0));
        this.draw_slope(model_transform, graphics_state);
        model_transform = stack.pop();
        stack.push(model_transform);

        // Draw moving slopes
        for (var i = 0; i < 2; i++) {
            this.slope_pos[i] = this.velocity * (time - this.slope_time[i]) + this.slope_offset[i];
            model_transform = mult(model_transform, translation(0, 0, this.slope_pos[i]));
            this.draw_slope(model_transform, graphics_state);
            model_transform = stack.pop();
            stack.push(model_transform);
            if (this.slope_pos[i] >= 2*SLOPE_W) {
                this.slope_offset[i] = -2*SLOPE_W+5;
                this.slope_time[i] = time;
            }
        }

        stack.push(model_transform)

        // Draw trees
        for (var i = 0; i < NUM_TREES; i++) {
            if (game_state == GAME_PLAY) {
                this.tree_pos[i][2] = this.velocity * (time - this.tree_time[i]) + this.tree_offset[i];
            }
            model_transform = mult(model_transform, translation(0, -1, 0));
            model_transform = mult(model_transform, translation(this.tree_pos[i]));
            model_transform = mult(model_transform, rotation(this.tree_rotation[i], 0, 1, 0));
            model_transform = mult(model_transform, scale(2.5, 2.5, 2.5));
            this.draw_tree(model_transform, graphics_state, this.tree_heights[i]);
            model_transform = stack.pop();
            stack.push(model_transform);

            // Check if touching player
            if (this.tree_pos[i][0] <= this.x_pos+2 && this.tree_pos[i][0] >= this.x_pos-2 &&
                this.tree_pos[i][2] < 20 && this.tree_pos[i][2] > 18 && game_state != GAME_OVER) {
                this.game_over();
            }

            // If beyond visibility, reset
            if (this.tree_pos[i][2] >= 20 && game_state == GAME_PLAY) {
                if (i % 3 == 0) {
                    this.tree_pos[i][0] = get_random(-(SLOPE_L/10), SLOPE_L/10);
                } else {
                    this.tree_pos[i][0] = get_random(-(SLOPE_L/2), SLOPE_L/2);
                }
                this.tree_offset[i] = -SLOPE_W+10;
                this.tree_time[i] = time;
            }
        }

        // Draw rocks
        for (var i = 0; i < NUM_ROCKS; i++) {
            if (game_state == GAME_PLAY) {
                this.rock_pos[i][2] = this.velocity * (time - this.rock_time[i]) + this.rock_offset[i];
            }
            model_transform = mult(model_transform, translation(this.rock_pos[i]));
            this.draw_rock(model_transform, graphics_state);
            model_transform = stack.pop();
            stack.push(model_transform);

            // Check if touching player
            if (this.rock_pos[i][0] <= this.x_pos+1.2 && this.rock_pos[i][0] >= this.x_pos-1.2 &&
                this.rock_pos[i][2] < 20 && this.rock_pos[i][2] > 18 && game_state != GAME_OVER) {
                this.game_over();
            }

            // If beyond visibility, reset
            if (this.rock_pos[i][2] >= 20 && game_state == GAME_PLAY) {
                this.rock_pos[i][0] = get_random(-(SLOPE_L/4), SLOPE_L/4);
                this.rock_offset[i] = -SLOPE_W;
                this.rock_time[i] = time;
            }
        }

        // Randomly draw bear
        if (this.bear_visible) {
            if (game_state == GAME_PLAY) {
                this.bear_pos[2] = this.velocity * (time - this.bear_time) + this.bear_offset;
            }
            model_transform = mult(model_transform, translation(this.bear_pos));
            model_transform = mult(model_transform, translation([0, 1, 0]));
            model_transform = mult(model_transform, rotation(this.bear_rotation, 0, 1, 0));
            model_transform = mult(model_transform, scale(1.5, 1.5, 1.5));
            this.shapes.bear.draw(graphics_state, model_transform, this.brown_bear);

            // If beyond visibility, reset
            if (this.bear_pos[2] >= 20 && game_state == GAME_PLAY) {
                this.bear_visible = false;
            }
        } else if (!this.bear_visible && (score % 40 >= 38)) {
            this.bear_visible = true;
            var bear_x_choice = [-10, 10, -15, 15];
            var bear_rotate_choice = [15, -15, 20, -20];
            this.bear_offset = -SLOPE_W*1.5;
            var choice = get_random(0, 3);
            this.bear_pos[0] = bear_x_choice[choice];
            this.bear_rotation = bear_rotate_choice[choice];
            this.bear_time = time;
        }

        // Lookat
        if (ENABLE_LOOK) {
            if (game_state == GAME_PLAY) {
                var camera_z = 15;
                graphics_state.camera_transform = lookAt([0, 1, camera_z+10], [this.x_pos, 0, camera_z], [0,1,0]);
            } else if (game_state == GAME_OVER) {
                var camera_end = identity();
                camera_end = translation(-this.x_pos, 0, -25);
                if (this.x_pos >= 0) {
                    camera_end = mult(camera_end, rotation(10, 0, 0, 1));
                } else {
                    camera_end = mult(camera_end, rotation(-10, 0, 0, 1));
                }
                graphics_state.camera_transform = camera_end;
            }
        }
    }
}, Scene_Component );
