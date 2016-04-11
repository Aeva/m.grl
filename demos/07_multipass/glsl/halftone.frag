
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// data mgrl automatically uploads
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

// render pass
uniform lowp int draw_pass;
uniform sampler2D previous_render;

// attributes
varying vec3 local_position;
varying vec3 local_normal;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 view_position;

// lighting stuff
uniform vec3 light_direction;
varying vec3 light_weight;
varying float directional_weight;


void main(void) {

  vec4 frag_color = vec4(1.0, 1.0, 1.0, 1.0);


  if (draw_pass == 1) {
    // LIGHTING PASS

    frag_color = vec4(vec3(frag_color.rgb*light_weight), 1.0);

    // specular stuff
    vec3 eye_vector = normalize(-view_position);
    vec3 reflection = reflect(light_direction, normalize(world_normal));
    float shiny = 2.0;
    float specular_weight = pow(max(dot(reflection, eye_vector), 0.0), shiny);

    vec4 k_specular = vec4(1.0, 0.8, 0.9, 1.0);

    frag_color = mix(frag_color, k_specular, specular_weight);
    //frag_color = vec4(1.0, 0.0, 0.0, 1.0);
  }


  else if(draw_pass == 2) {
    // HALFTONE PASS

    /*
      Ok, this isn't actually halftone, just a cheap effect to show
      that this is working.  Either actual halftone or a file rename
      will come later.
     */

    float freq = 2.0;
    float amp = 10.0;

    // used to crop & upscale
    float margin = 100.0;

    float pick_x = (gl_FragCoord.x + sin(gl_FragCoord.y/freq)*amp + margin) / (mgrl_buffer_width+margin*2.0);
    float pick_y = (gl_FragCoord.y + sin(gl_FragCoord.x/freq)*amp + margin) / (mgrl_buffer_height+margin*2.0);

    vec4 color_sample = texture2D(previous_render, vec2(pick_x, pick_y));

    frag_color = color_sample;
  }


  gl_FragColor = frag_color;
}
