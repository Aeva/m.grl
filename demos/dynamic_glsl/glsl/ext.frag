
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


plugin vec3 abstract_water() {
  // note, the higher 'squish' is, the more the surface of the object
  // becomes apparent.
  vec3 squish = world_normal * 0.15;

  float morph = mgrl_frame_start/5000.0;
  float low = distortion(squish + world_position+vec3(morph), 2.0, 0.5);
  float high = distortion(squish + world_position-vec3(morph), 20.0, 0.1);
  vec3 dark = vec3(0.0, 0.3, 0.6);
  vec3 light = vec3(0.0, 0.8, 0.8);
  return mix(dark, light, fract(low+high+morph));
}


plugin vec3 weird_noise() {
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
