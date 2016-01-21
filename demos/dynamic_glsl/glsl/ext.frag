// This source file is dedicated to the public domain by way of CC0.
// More information about CC0 can be found here:
// https://creativecommons.org/publicdomain/zero/1.0/

// If you reuse or modify this code, it is gently requested that you
// attribute Aeva Palecek as the original author.


uniform float mgrl_frame_start;
varying vec3 local_position;
varying vec3 world_position;
varying vec3 local_normal;
varying vec3 world_normal;
varying vec3 screen_normal;
varying float linear_depth;


plugin vec3 vibrant() {
  return fract(world_position * world_normal);
}


plugin vec3 grid() {
  float frequency = 0.75;
  float thickness = 0.05;
  float radius = thickness * 0.5;

  float flow = mgrl_frame_start/2.5;
  float wave = distance(world_position, vec3(0.0));
  float pulse = fract(wave * 0.2 - flow);
  float breach = fract(wave * 0.1 + flow);
  float line = breach > 0.5 ? 0.9 : 1.0;

  vec3 tmp = fract((world_position * frequency) + radius);
  bool x_mod = tmp.x < thickness;
  bool y_mod = tmp.y < thickness;
  bool z_mod = tmp.z < thickness;

  if (x_mod || y_mod || z_mod) {
    return #00bfff * (pulse * 0.9 + 0.1);
  }
  else {
    return #333 * line;
  }
}


// takes a point in space and outputs a color
float distortion (vec3 coords, float frequency, float amplitude) {
  vec3 wave = sin(coords*frequency)*amplitude;
  vec3 tmp = fract((coords + wave.x + wave.y + wave.z));
  float warp = (tmp.x + tmp.y + tmp.z) / 3.0;
  return warp;
}


float random() {
  float low = distortion(world_position, 10.0, 10.0);
  float high = distortion(world_position, low, 1000.0);
  return fract(high);
}


plugin vec3 tree() {
  float amp = 0.2;
  float freq = 30.0;
  float spacing = 0.75;
  float wave = sin((world_position.x + world_position.y)*freq)*amp;
  float z = world_position.z + wave;
  float z_mod = fract(z/spacing);
  
  if (z_mod < 0.5) {
    return vec3(0.0, 0.5, 0.2);
  }
  else {
    return vec3(0.0, 0.6, 0.2);
  }
}


plugin vec3 brick() {
  float area = 0.9;
  float height = 0.3;
  float mortar = 0.05;

  bool cond = fract(world_position.z / (height * 2.0)) < 0.5;
  vec3 offset = cond? vec3(area*0.5, area*0.5, 0.0) : vec3(0.0);

  vec3 scale_factor = vec3(area, area, height);
  vec3 scaled = (world_position + offset) / scale_factor;
  vec3 seam = vec3(mortar) / scale_factor;

  vec3 grid = fract(scaled + seam);
  bool x_mod = grid.x < seam.x;
  bool y_mod = grid.y < seam.y;
  bool z_mod = grid.z < seam.z;

  vec3 color;
  if (x_mod || y_mod || z_mod) {
    color = vec3(0.4, 0.0, 0.1);
  }
  else {
    color = vec3(1.0, 0.2, 0.16) * (0.4 + random()*0.7);
  }
  
  return color;
}


plugin vec3 water() {
  // note, the higher 'squish' is, the more the surface of the object
  // becomes apparent.
  vec3 squish = world_normal * 0.15;

  float morph = mgrl_frame_start/5.0;
  float low = distortion(squish + world_position+vec3(morph), 2.0, 0.5);
  float high = distortion(squish + world_position-vec3(morph), 20.0, 0.1);
  vec3 dark = vec3(0.0, 0.3, 0.6);
  vec3 light = vec3(0.0, 0.8, 0.8);
  return mix(dark, light, fract(low+high+morph));
}



plugin vec3 weird_noise() {
  float dt = mgrl_frame_start/10.0;
  float low = distortion(world_position, 10.0, 10.0) * 0.5;
  float high = distortion(world_position+dt, 10.0, low);
  return vec3(high);
}
