
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif


// render pass
uniform int render_pass;
uniform sampler2D draw_pass;
uniform float width;
uniform float height;

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


  if (render_pass == 1) {
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


  else if(render_pass == 2) {
    // HALFTONE PASS

    /*
      Ok, this isn't actually halftone, just a cheap effect to show
      that this is working.  Either actual halftone or a file rename
      will come later.
     */

    float frequency = 5.0;
    float amplitude = 10.0;

    float pick_x = (gl_FragCoord.x + sin(gl_FragCoord.y/frequency)*amplitude) / width;
    float pick_y = gl_FragCoord.y / height;

    vec4 color_sample = texture2D(draw_pass, vec2(pick_x, pick_y));

    frag_color = color_sample;
  }


  gl_FragColor = frag_color;
}
