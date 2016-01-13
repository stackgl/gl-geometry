var normalize = require('./normalize')
var glType = require('gl-to-dtype')
var createVAO = require('gl-vao')
var dtype = require('dtype')

module.exports = GLGeometry

function GLGeometry(gl) {
  if (!(this instanceof GLGeometry))
    return new GLGeometry(gl)

  this._elementsType = 5123
  this._elementsBytes = 2
  this._attributes = []
  this._dirty = true
  this._attrLength = 0
  this._facesLength = 0
  this._index = null
  this._vao = null
  this._keys = []
  this.gl = gl
}

GLGeometry.prototype.dispose = function() {
  for (var i = 0; i < this._attributes.length; i++) {
    this._attributes[i].buffer.dispose()
  }

  this._attributes = []
  this._keys = []
  this._attrLength = 0  // Length of this attribute (the number of vertices it feeds)
  this._facesLength = 0 // Number of vertices needed to draw all faces
  this._dirty = true

  if (this._index) {
    this._index.dispose()
    this._index = null
  }

  if (this._vao) {
    this._vao.dispose()
    this._vao = null
  }
}

GLGeometry.prototype.faces = function faces(attr, opts) {
  var size = opts && opts.size || 3
  attr = attr.cells ? attr.cells : attr

  this._dirty = true

  if (this._index) {
    this._index.dispose()
  }

  this._index = normalize(this.gl
    , attr
    , size
    , this.gl.ELEMENT_ARRAY_BUFFER
    , 'uint16'
  )

  this._facesLength = this._index.length * size
  this._index = this._index.buffer

  return this
}

GLGeometry.prototype.attr = function attr(name, attr, opts) {
  opts = opts || {}
  this._dirty = true

  var gl = this.gl
  var first = !this._attributes.length
  var size = opts.size || 3

  var attribute = normalize(gl, attr, size, gl.ARRAY_BUFFER, 'float32')
  if (!attribute) {
    throw new Error(
        'Unexpected attribute format: needs an ndarray, array, typed array, '
      + 'gl-buffer or simplicial complex'
    )
  }

  var buffer = attribute.buffer
  var length = attribute.length
  var index  = attribute.index

  this._keys.push(name)
  this._attributes.push({
      size: size
    , buffer: buffer
  })

  var isSimplicialComplex = Boolean(index)
  var attrLength = isSimplicialComplex ? attr.positions.length : length

  if (first) {
    this._attrLength = attrLength

    if (isSimplicialComplex) {
      this._index = index
      this._facesLength = length
    }

  } else if (this._attrLength != attrLength) {
    throw new Error(
        'Unexpected discrepancy in attributes size (was ' + this_attrLength
      + ', now ' + attrLength+ ')'
    )
  }

  return this
}

GLGeometry.prototype.bind = function bind(shader) {
  this.update()
  this._vao.bind()

  if (!this._keys) return
  for (var i = 0; i < this._keys.length; i++) {
    var attr = shader.attributes[this._keys[i]]
    if (attr) attr.location = i
  }

  if (!shader) return
  shader.bind()
}

GLGeometry.prototype.draw = function draw(mode, start, stop) {
  start = typeof start === 'undefined' ? 0 : start
  mode  = typeof mode  === 'undefined' ? this.gl.TRIANGLES : mode

  this.update()

  if (this._vao._useElements) {
    stop  = typeof stop  === 'undefined' ? this._facesLength : stop
    this.gl.drawElements(mode, stop - start, this._elementsType, start * this._elementsBytes)
  } else {
    stop  = typeof stop  === 'undefined' ? this._attrLength : stop
    this.gl.drawArrays(mode, start, stop - start)
  }
}

GLGeometry.prototype.unbind = function unbind() {
  this.update()
  this._vao.unbind()
}

GLGeometry.prototype.update = function update() {
  if (!this._dirty) return
  this._dirty = false
  if (this._vao) this._vao.dispose()

  this._vao = createVAO(
      this.gl
    , this._attributes
    , this._index
  )

  this._elementsType = this._vao._elementsType
  this._elementsBytes = dtype(
    glType(this._elementsType) || 'array'
  ).BYTES_PER_ELEMENT || 2
}
