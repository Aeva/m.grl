
precision mediump float;

uniform sampler2D diffuse_texture;

uniform float alpha;
uniform bool is_sprite;
uniform bool is_transparent;
uniform float mgrl_frame_start;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 screen_position;

uniform bool is_floor;

const vec3 cone_a = vec3(4.87, 0.0, 11.626024);
const vec3 cone_b = vec3(-4.87, 0.0, 11.626024);
const float angle = 3.5;
const vec2 falloff = vec2(14.0, 10.0);
const vec2 horizon = vec2(20.0, 50.0);

void main(void) {
  vec4 diffuse_color;
  
  if (is_floor) {

    // procedural texture for the ground
    float checker_scale = 8.0;
    bool check_x = fract((world_position.x+2.0) / checker_scale) < 0.5;
    bool check_y = fract((world_position.y-2.0) / checker_scale) < 0.5;
    if ((check_x && check_y) || (!check_x && !check_y)) {
      diffuse_color = vec4(0.55, 0.55, 0.55, 1.0);
    }
    else {
      diffuse_color = vec4(0.6, 0.6, 0.6, 1.0);
    }
  }
  else {

    // use textures for everything else
    diffuse_color = texture2D(diffuse_texture, local_tcoords);
    if (is_sprite) {
      float cutoff = is_transparent ? 0.1 : 1.0;
      if (diffuse_color.a < cutoff) {
        discard;
      }
    }
    diffuse_color.a *= alpha;
  }


  // lighting
  float illuminated = 0.0;
  float dist_a = distance(world_position, cone_a);
  float dist_b = distance(world_position, cone_b);
  vec3 cone = dist_a < dist_b ? cone_a : cone_b;
  float angle_mod = is_sprite ? 1.8 : angle;

  if (world_position.z < cone.z) {
    float scale = distance(world_position.z, cone.z);
    if (distance(world_position.xy, cone.xy) <= scale*angle_mod) {
      float dist = min(dist_a, dist_b);
      illuminated = 1.0 - (clamp(dist - falloff.x, 0.0, falloff.y) / falloff.y);
    }
  }


  if (is_sprite) {
    if (illuminated < 0.1) {
      diffuse_color = vec4(0.8, 0.8, 0.8, 0.1);
    }
    else {
      diffuse_color = vec4(1.0, 1.0, 1.0, 1.0);
    }
  }

  
  // apply lighting
  vec3 dim_color = diffuse_color.rgb - 0.4;
  vec3 bright_color = diffuse_color.rgb;
  vec3 applied_light = mix(dim_color, bright_color, illuminated);
  vec4 combined_color = vec4(applied_light, diffuse_color.a);
  

  // determine the horizon falloff
  float dist = distance(world_position.xy, vec2(0.0, 0.0));
  if (dist > horizon.x) {
    combined_color.a = 1.0 - (clamp(dist - horizon.x, 0.0, horizon.y) / horizon.y);
  }

  
  gl_FragColor = combined_color;
}
