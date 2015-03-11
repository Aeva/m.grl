
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_frame_start;
uniform float mode;
uniform sampler2D diffuse_texture;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 view_position;

// lighting stuff
uniform vec3 light_direction;
varying vec3 light_weight;
varying float directional_weight;




// Handy function for producing pseudo-randomness.  Returns a value
// between 0 and 1
float random_seed(vec3 co) {
  return fract(sin(dot(co, vec3(12.9898,78.233,56.123))) * 43758.5453);
}


// Returns a value!
float random() {
  return random_seed(vec3(gl_FragCoord.x, gl_FragCoord.y, mod(mgrl_frame_start, 60.0)));
}


// apply ambient and diffuse lighting as calculated on the vertex
// shader to a given color value.
vec4 pdq_phong(vec4 base_color) {
  return vec4(vec3(base_color.rgb*light_weight), base_color.a);
}


// has nothing to do with phong
vec4 pdq_anti_phong(vec4 base_color) {
  return mix(vec4(0.0, 0.0, 0.0, 1.0), base_color, directional_weight);
}


void main(void) {
  // determine the cut between -x and x axis for "weird" coloring
  float frequency = 8.0;
  float amplitude = 0.4;
  float threshold = 0.25;
  float axis;
  if (mode == 1.0) {
    // use different settings for the floor
    axis = world_position.y;
    frequency = 1.0;
    threshold = 1.0;
    amplitude = 0.8;
  }
  else {
    axis = world_position.z;
  }

  // blending between the "not weird" half and the "weird" half
  float factor = (clamp(world_position.x + sin(axis*frequency)*amplitude,
                        -1.0*threshold, threshold) + threshold)/(threshold*2.0);

  // calculate the color values to be displayed
  float rand = random();
  vec4 weird;
  vec4 color_sample;
  if (mode == 1.0) {
    // generate a procedural texture for the floor

    // wobble coordinates for the "weird" half
    float wobble_x = world_position.x + sin((world_position.y+(mgrl_frame_start/5000.0))*3.0) / 2.0;
    float wobble_y = world_position.y + sin((world_position.x+(mgrl_frame_start/5000.0))*3.0) / 2.0;
    float checker_scale = 3.0;

    // generate a checkerboard, mix between world coordinates and wobble coordinates
    bool check_x = fract(mix(world_position.x, wobble_x, factor) / checker_scale) < 0.5;
    bool check_y = fract(mix(world_position.y, wobble_y, factor) / checker_scale) < 0.5;
    if ((check_x && check_y) || (!check_x && !check_y)) {
      color_sample = vec4(0.8, 0.8, 0.8, 1.0);
      weird = vec4(0.6, 0.4, 0.4, 1.0);
    }
    else {
      color_sample = vec4(0.37, 0.6, 0.14, 1.0);
      weird = vec4(0.3, 0.3, 0.3, 1.0);
    }

    // dither the weird half
    float dither = rand / 3.0;
    weird = vec4(weird.r + dither, weird.g + dither, weird.b + dither, 1.0);
  }
  else {
    // sample the color value for the models from a texture
    color_sample = pdq_phong(texture2D(diffuse_texture, local_tcoords));
    weird = pdq_anti_phong(vec4(rand, rand, rand, 1.0));
  }

  // stuff for specular lighting
  vec3 eye_vector = normalize(-view_position);
  vec3 reflection = reflect(light_direction, normalize(world_normal));
  float shiny = 10.0;
  float specular_weight = pow(max(dot(reflection, eye_vector), 0.0), shiny);

  // mix the color sample and weird color, and apply specular light
  vec4 mixed_color = mix(color_sample, weird, factor) + specular_weight;

  // determine cheap fog falloff stuff
  vec4 haze = vec4(.93, .93, .93, 1.0);
  float falloff = view_position.z-5.0;
  float range = 30.0;

  vec4 final_color = mix(mixed_color, haze, clamp(falloff, 0.0, range)/range);
  if (mode < 3.0) {
    gl_FragColor = vec4(final_color.rgb, 1.0);
  }
  else if (mode == 5.0) {
    float base_color = 0.4 + specular_weight;
    gl_FragColor = vec4(base_color, base_color, base_color, 1.0);
  }
  else {
    gl_FragColor = vec4(final_color.rgb, 0.75);
  }
}
