#extension GL_EXT_draw_buffers : require
precision mediump float;

// mgrl builtins
uniform vec4 mgrl_clear_color;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

// for lighting
uniform mat4 light_projection_matrix;
uniform mat4 light_view_matrix;
uniform int light_count;
uniform int light_index;

// varying
varying vec2 local_tcoords;
varying vec3 world_position;
varying float linear_depth;

// samplers
uniform sampler2D diffuse_texture;
uniform sampler2D spatial_texture;
uniform sampler2D light_texture;

// mode switching
uniform int shader_pass;


void main(void) {
  if (shader_pass == 0) {
    // g-buffer pass
    vec4 diffuse = texture2D(diffuse_texture, local_tcoords);
    if (diffuse.a < 1.0) {
      discard;
    }
    gl_FragData[0] = diffuse;
    //gl_FragData[1] = vec4(world_position, linear_depth);
    gl_FragData[1] = vec4(world_position.xyz, 1.0);
  }
  else if (shader_pass == 1) {
    // light perspective pass
    float depth = linear_depth;
    gl_FragData[0] = vec4(depth, depth, depth, depth);
  }
  else if (shader_pass == 2) {
    // illumination pass
  }
}
