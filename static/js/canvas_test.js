/*
	picturephone
	canvas_test.js
	a multiplayer art experiment by Glitch Taylor (rtay.io)
	this file is for testing custom drawing/canvas logic
*/
"use strict";

const byId = (id) => {
	return document.getElementById(id);
};

class ShaderPath extends fabric.Path {
	_renderPathCommands(ctx) {
		/*
		let current, subPathStartX, subPathStartY, x, y, controlX, controlY, l, t;
		subPathStartX = 0;
		subPathStartY = 0;
		x = 0;
		y = 0;
		controlX = 0;
		controlY = 0;
		l = -this.pathOffset.x;
		t = -this.pathOffset.y;

		ctx.beginPath();

		for (var i = 0, len = this.path.length; i < len; ++i) {
			current = this.path[i];

			switch (current[0]) {
				case "L": // lineto, absolute
					x = current[1];
					y = current[2];
					ctx.lineTo(x + l, y + t);
					break;

				case "M": // moveTo, absolute
					x = current[1];
					y = current[2];
					subPathStartX = x;
					subPathStartY = y;
					ctx.moveTo(x + l, y + t);
					break;

				case "C": // bezierCurveTo, absolute
					x = current[5];
					y = current[6];
					controlX = current[3];
					controlY = current[4];
					ctx.bezierCurveTo(
						current[1] + l,
						current[2] + t,
						controlX + l,
						controlY + t,
						x + l,
						y + t
					);
					break;

				case "Q": // quadraticCurveTo, absolute
					ctx.quadraticCurveTo(current[1] + l, current[2] + t, current[3] + l, current[4] + t);
					x = current[3];
					y = current[4];
					controlX = current[1];
					controlY = current[2];
					break;

				case "z":
				case "Z":
					x = subPathStartX;
					y = subPathStartY;
					ctx.closePath();
					break;
			}
		}*/

		// get path
		let prev = [],
			positions = [];
		for (let i of this.path) {
			switch (i[0]) {
				case "M":
				case "L":
					positions.push(i[1], i[2], i[1], i[2]); // push first and last twice
					prev = [i[1], i[2]];
					break;
				case "Q":
					// approximate midpoints using quadratic bezier (for smoother lines)
					positions.push(
						prev[0] * 0.25 + i[1] * 0.5 + i[3] * 0.25,
						prev[1] * 0.25 + i[2] * 0.5 + i[4] * 0.25
					);

					// add positions
					positions.push(i[3], i[4]);
					prev = [i[3], i[4]];
					break;
			}
		}

		// create buffers
		let points, color, thickness, positionBuffer, offsetBuffer, lineMesh, w, h;
		points = positions.length / 2 - 2;
		color = fabric.Color.fromHex(this.stroke)._source;
		thickness = this.strokeWidth / 2;
		positionBuffer = createPositionBuffer(positions, points);
		offsetBuffer = createOffsetBuffer(points);
		lineMesh = createLineMesh(points);
		w = CANVAS_3.width;
		h = CANVAS_3.height;

		// render the line
		let render = regl({
			attributes: {
				prevPos: {
					buffer: positionBuffer,
					offset: 0,
					stride: FLOAT_BYTES * 2,
				},
				currPos: {
					buffer: positionBuffer,
					offset: FLOAT_BYTES * 2 * 2,
					stride: FLOAT_BYTES * 2,
				},
				nextPos: {
					buffer: positionBuffer,
					offset: FLOAT_BYTES * 2 * 4,
					stride: FLOAT_BYTES * 2,
				},
				offset: offsetBuffer,
			},
			uniforms: {
				color: [color[0] / 255, color[1] / 255, color[2] / 255, 1],
				thickness: thickness,
				width: w,
				height: h,
				scale: w / 800,
			},
			elements: regl.elements({
				primitive: "triangles",
				usage: "static",
				type: "uint16",
				data: lineMesh,
			}),
			vert: SHD_LINE_VERT,
			frag: SHD_LINE_FRAG,
			viewport: {
				x: 0,
				y: 0,
				width: w,
				height: h,
			},
		});
		render();

		// clean up objects to free memory
		render.destroy();
		positionBuffer.destroy();
		offsetBuffer.destroy();
		render = positionBuffer = offsetBuffer = lineMesh = null;
	}
}

function toShaderPath(path) {
	let sPath = new ShaderPath();
	for (let k of Object.keys(path)) {
		sPath[k] = path[k];
	}
	return sPath;
}

// initialize canvases
const CANVAS_1 = new fabric.Canvas("c", {
	isDrawingMode: true,
	backgroundColor: "#FFFFFF",
});
const CANVAS_2 = new fabric.Canvas("c2", {
	isDrawingMode: true,
	backgroundColor: "#FFFFFF",
});
CANVAS_1.freeDrawingBrush.width = CANVAS_2.freeDrawingBrush.width = 5;
CANVAS_1.freeDrawingBrush.color = CANVAS_2.freeDrawingBrush.color = "#123456";

// fabric doesn't let us use a webgl context on the canvas so we have to make another layer
// todo: see if you can just draw on that layer
const CANVAS_3 = byId("c3");

byId("c2").after(CANVAS_3);
const regl = wrapREGL({
	canvas: CANVAS_3,
	pixelRatio: 1,
	attributes: { antialias: false, preserveDrawingBuffer: true },
});

console.log(regl);

// auto resize canvas
function resizeCanvas() {
	// Get base image of canvas
	let _base = byId("canvasBase");
	_base.style.height = "";

	// Make dimensions and ensure ratio is correct (sometimes gets weird in chrome)
	let _w = _base.scrollWidth,
		_h = _base.scrollHeight;
	let _ratio = ((_h / _w) * 3) / 4;
	if (_ratio <= 0.99 || _ratio >= 1.01) {
		// disproportionate, change height to compensate
		_h = Math.floor((_w * 3) / 4);
	}

	// Resize canvas
	if (_w) {
		let zoom = CANVAS_1.getZoom() * (_w / CANVAS_1.getWidth());
		CANVAS_1.setDimensions({ width: _w, height: _h });
		CANVAS_2.setDimensions({ width: _w, height: _h });
		CANVAS_1.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
		CANVAS_2.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
		_base.style.height = _h + "px";

		CANVAS_3.width = _w;
		CANVAS_3.height = _h;
	}
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// copy drawings between canvases
CANVAS_1.on("path:created", (obj) => {
	// add Path to CANVAS_1 (implicit)

	// make duplicate ShaderPath on CANVAS_2
	let path = toShaderPath(obj.path);
	CANVAS_2.add(path);
});
CANVAS_2.on("path:created", (obj) => {
	// add Path to CANVAS_1
	CANVAS_1.add(obj.path);

	// make duplicate ShaderPath on CANVAS_2
	let path = toShaderPath(obj.path);
	CANVAS_2.add(path);

	// delete invisible path
	CANVAS_2.remove(obj.path);
});
