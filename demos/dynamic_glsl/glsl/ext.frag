
// time passed
uniform float mgrl_frame_start;

// handy positional information etc
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 screen_normal;
varying float linear_depth;


plugin vec3 grid() {
  float frequency = 1.5;
  float thickness = 0.025;
  float radius = thickness * 0.5;

  vec3 tmp = fract((world_position * frequency) + radius);
  bool x_mod = tmp.x < thickness;
  bool y_mod = tmp.y < thickness;
  bool z_mod = tmp.z < thickness;

  if (x_mod || y_mod || z_mod) {
    return vec3(1.0, 0.75, 0.0);
  }
  else {
    return vec3(0.2, 0.2, 0.2);
  }
}


plugin vec3 scanner() {
  float angle = clamp(abs(screen_normal.z)*1.5, 0.0, 1.0);
  vec3 towards = vec3(0.0, 0.0, 0.0);
  vec3 away = vec3(1.0, 1.0, 1.0);
  return mix(away, towards, angle);
}


// takes a point in space and outputs a color
float distortion (vec3 coords, float frequency, float amplitude) {
  vec3 wave = sin(coords*frequency)*amplitude;
  vec3 tmp = fract((coords + wave.x + wave.y + wave.z));
  float warp = (tmp.x + tmp.y + tmp.z) / 3.0;
  return warp;
}


plugin vec3 magic() {
  float dt = mgrl_frame_start/500.0;
  float low = distortion(world_position, 10.0, 10.0);
  float high = distortion(world_position, 10.0, low);

  return vec3(high);
}


plugin vec3 solid_noise() {
  float dt = mgrl_frame_start/500.0;
  float low = distortion(world_position, 10.0, 10.0);
  float high = distortion(world_position, low, 10.0);
  return vec3(fract(high*dt));
}


plugin vec3 abstract_water() {
  float frequency = 50.0;
  float amplitude = 0.1;
  float morph = sin(mgrl_frame_start/5000.0);

  vec3 wave = sin(world_position*frequency)*amplitude+morph;
  vec3 tmp = fract((world_position + wave.x + wave.y + wave.z));
  bool x_mod = tmp.x < 0.5;
  bool y_mod = tmp.y < 0.5;
  bool z_mod = tmp.z < 0.5;

  if (x_mod ^^ y_mod ^^ z_mod) {
    return vec3(0.0, 0.3, 0.6);
  }
  else {
    return vec3(0.0, 0.8, 0.8);
  }
}
