var createCamera  = require('canvas-orbit-camera')
var mat4          = require('gl-matrix').mat4
var pack          = require('array-pack-2d')
var unindex       = require('unindex-mesh')
var faceNormals   = require('face-normals')
var createContext = require('gl-context')
var fit           = require('canvas-fit')
var ndarray       = require('ndarray')
var normals       = require('normals')
var glslify       = require('glslify')
var bunny         = require('bunny')

var createGeom    = require('./')
var clear         = require('gl-clear')({
    color: [0xF0/255, 0xF1/255, 0xF2/255, 1]
  , depth: true
  , stencil: false
})

// handles simplicial complexes with cells/positions properties
var scPos = bunny
var scNor = normals.vertexNormals(bunny.cells, bunny.positions)
createExample(scPos, scNor)

// handles Float32Arrays
var uiPos = unindex(bunny.positions, bunny.cells)
var uiNor = faceNormals(uiPos)
createExample(uiPos, uiNor)

// handles (flat) ndarrays
var ndPos = ndarray(uiPos, [uiPos.length])
var ndNor = ndarray(uiNor, [uiNor.length])
createExample(ndPos, ndNor)

// also supports .faces() method
createExample(scPos.positions, scNor, scPos.cells)

// also supports .faces() method with packed data
createExample(pack(scPos.positions), scNor, pack(scPos.cells))

function createExample(pos, norm, cells) {
  var canvas     = document.body.appendChild(document.createElement('canvas'))
  var gl         = createContext(canvas, render)
  var camera     = createCamera(canvas)
  var projection = mat4.create()
  var shader     = glslify({
      vert: './test.vert'
    , frag: './test.frag'
  })(gl)

  canvas.width = 300
  canvas.height = 300
  canvas.style.margin = '1em'

  var geom = createGeom(gl)
    .attr('position', pos)
    .attr('normal', norm)

  if (cells) geom.faces(cells)

  function render() {
    var width  = canvas.width
    var height = canvas.height

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.viewport(0, 0, width, height)
    clear(gl)

    geom.bind(shader)
    shader.attributes.position.location = 0
    shader.uniforms.uView = camera.view()
    shader.uniforms.uProjection = mat4.perspective(projection
      , Math.PI / 4
      , width / height
      , 0.001
      , 10000
    )

    geom.draw()
    geom.unbind()

    camera.tick()
  }
}
