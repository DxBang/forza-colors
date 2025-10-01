"use strict";
let canvas,
	magnify,
	ctx, mtx, timer, file, image, currentColor, colorPreview,
	pixel = 4,
	pixelPreview,
	captureCanvas,
	historyColors = [];

const rgbToHex = (r,g,b) => {
	return ((r << 16) | (g << 8) | b).toString(16);
}
const hexToRgb = (hex) => {
	let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	} : null;
}
const rgbToHSL = (r,g,b) => {
	r /= 255;
	g /= 255;
	b /= 255;
	const l = Math.max(r, g, b);
	const s = l - Math.min(r, g, b);
	const h = s
		? l === r
			? (g - b) / s
			: l === g
				? 2 + (b - r) / s
				: 4 + (r - g) / s
		: 0;
	return {
		h: 60 * h < 0 ? 60 * h + 360 : 60 * h,
		s: 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
		l: (100 * (2 * l - s)) / 2,
	};
}
const rgbToHSB = (r,g,b) => {
	r /= 255;
	g /= 255;
	b /= 255;
	const v = Math.max(r, g, b),
		n = v - Math.min(r, g, b);
	const h =
		n === 0 ? 0 : n && v === r ? (g - b) / n : v === g ? 2 + (b - r) / n : 4 + (r - g) / n;
	return {
		h: 60 * (h < 0 ? h + 6 : h),
		s: v && (n / v) * 100,
		b: v * 100
	};
}
const rgbToForza = (r,g,b) => {
	r /= 255;
	g /= 255;
	b /= 255;
	const v = Math.max(r, g, b),
		n = v - Math.min(r, g, b);
	const h =
		n === 0 ? 0 : n && v === r ? (g - b) / n : v === g ? 2 + (b - r) / n : 4 + (r - g) / n;
	return {
		h: 60 * (h < 0 ? h + 6 : h) / 360,
		s: v && (n / v),
		b: v
	};
}

const loadCanvas = () => {
	canvas.width = image.offsetWidth;
	canvas.height = image.offsetHeight;
	ctx.drawImage(image, 0, 0, image.offsetWidth, image.offsetHeight);
}
const averagePixelColor = (x, y, size, debug = false) => {
	let totalR = 0, totalG = 0, totalB = 0, count = 0;
	let imageData = ctx.getImageData(
		x - size / 2, // x - size
		y - size / 2, // y - size
		size, // size * 2 + 1,
		size, // size * 2 + 1,
	);

	// add the imageData to the captureCanvas
	captureCanvas.width = imageData.width;
	captureCanvas.height = imageData.height;
	captureCanvas.getContext('2d').putImageData(imageData, 0, 0);

	if (debug) {
		console.log('imageData',
			imageData.data.length,
			imageData.width,
			imageData.height,
			imageData,
		);
	}

	for (let i = 0; i < imageData.data.length; i += 4) {
		totalR += imageData.data[i];
		totalG += imageData.data[i + 1];
		totalB += imageData.data[i + 2];
		count++;
	}

	return {
		r: Math.round(totalR / count),
		g: Math.round(totalG / count),
		b: Math.round(totalB / count)
	};
}

document.addEventListener('DOMContentLoaded', () => {
	canvas = document.getElementById('canvas');
	magnify = document.getElementById('magnify');
	image = document.getElementById('image');
	file = document.getElementById('file');
	currentColor = document.getElementById('current-color');
	colorPreview = document.getElementById('color-preview');
	ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
	mtx = magnify.getContext('2d', { alpha: true, willReadFrequently: true });
	pixelPreview = document.getElementById('pixel-preview');
	captureCanvas = document.getElementById('capture'); // capture canvas
	const colorsContainer = document.getElementById('colors');

	pixelPreview.textContent = pixel;


	image.addEventListener('load', () => {
		loadCanvas();
	});
	loadCanvas();

	const updateOutputsFromHex = (hex) => {
		let
			rgb = hexToRgb(hex),
			hsl = rgbToHSL(rgb.r, rgb.g, rgb.b),
			hsb = rgbToHSB(rgb.r, rgb.g, rgb.b),
			fhsb = rgbToForza(rgb.r, rgb.g, rgb.b);
		colorPreview.style.borderColor = hex;
		colorPreview.style.backgroundColor = hex;

		document.getElementById('hex').textContent = hex;

		document.getElementById('rgb_r').textContent = rgb.r;
		document.getElementById('rgb_g').textContent = rgb.g;
		document.getElementById('rgb_b').textContent = rgb.b;

		document.getElementById('hsl_h').textContent = hsl.h.toFixed(2);
		document.getElementById('hsl_s').textContent = hsl.s.toFixed(2);
		document.getElementById('hsl_l').textContent = hsl.l.toFixed(2);

		document.getElementById('hsb_h').textContent = hsb.h.toFixed(2);
		document.getElementById('hsb_s').textContent = hsb.s.toFixed(2);
		document.getElementById('hsb_b').textContent = hsb.b.toFixed(2);

		document.getElementById('forza_h').textContent = fhsb.h.toFixed(2);
		document.getElementById('forza_s').textContent = fhsb.s.toFixed(2);
		document.getElementById('forza_b').textContent = fhsb.b.toFixed(2);
	};

	currentColor.addEventListener('input', () => {
		const hex = currentColor.value;
		updateOutputsFromHex(hex);
	});
	file.addEventListener('change', (e) => {
		let tgt = e.target || window.event.srcElement,
			files = tgt.files;
		if (FileReader && files && files.length) {
			let
				fr = new FileReader();
			fr.onload = function () {
				image.src = fr.result;
			}
			fr.readAsDataURL(files[0]);
		}
	});

	// On click: set current-color from the hover/preview color and push to history
	canvas.addEventListener('click', e => {
		let sx = e.offsetX,
			sy = e.offsetY,
			avgColor = averagePixelColor(sx, sy, pixel, true),
			hx = '#' + ('000000' + rgbToHex(avgColor.r, avgColor.g, avgColor.b)).slice(-6);
		currentColor.value = hx;
		currentColor.dispatchEvent(new Event('input'));
		// Add to history (top of stack), keep unique consecutive entries minimal
		historyColors.unshift(hx);
		paintHistory();
		saveHistory();
	});
	canvas.addEventListener('mousemove', e => {
		let
			sx = e.offsetX,
			sy = e.offsetY,
			avgColor = averagePixelColor(sx, sy, pixel),
			hx = '#' + ('000000' + rgbToHex(avgColor.r, avgColor.g, avgColor.b)).slice(-6);
			// px = ctx.getImageData(sx, sy, 1, 1),
			// hx = '#' + ('000000' + rgbToHex(px.data[0], px.data[1], px.data[2])).slice(-6);
	// Hover: only update preview, not current color
	colorPreview.style.borderColor = hx;
	// colorPreview.style.backgroundColor = hx;

		mtx.fillStyle = 'black';
		mtx.fillRect(0, 0, magnify.width, magnify.height);

		mtx.drawImage(
			canvas,
			sx - 50, sy - 50,
			100, 100,
			0, 0,
			200, 200
		);
		magnify.style.top = sy + 5 + 'px';
		magnify.style.left = sx + 5 + 'px';
		magnify.style.display = 'block';
		mtx.strokeStyle = 'red';
		mtx.beginPath();
		mtx.rect(
			99 - pixel,
			99 - pixel,
			4 + pixel * 2,
			4 + pixel * 2
		);
		mtx.stroke();
	});

	canvas.addEventListener('mouseout', e => {
		magnify.style.display = 'none';
	});

	// mouse wheel event for firefox
	canvas.addEventListener('DOMMouseScroll', e => {
		e.deltaY = e.detail;
		e.target.dispatchEvent(new WheelEvent('mousewheel', e));
	});

	canvas.addEventListener('mousewheel', e => {
		// console.log('mousewheel', e);
		if (!e.shiftKey) return;
		// resize magnify pixel size
		e.preventDefault();
		if (e.deltaY < 0) {
			pixel++;
		}
		else {
			pixel--;
		}
		if (pixel < 1) {
			pixel = 1;
		}
		if (pixel > 50) {
			pixel = 50;
		}
		pixelPreview.textContent = pixel;

		// redraw the magnify glass
		mtx.fillStyle = 'black';
		mtx.fillRect(0, 0, magnify.width, magnify.height);
		mtx.drawImage(
			canvas,
			e.offsetX - 50, e.offsetY - 50,
			100, 100,
			0, 0,
			200, 200
		);
		mtx.strokeStyle = 'red';
		mtx.beginPath();
		mtx.rect(
			99 - pixel,
			99 - pixel,
			4 + pixel * 2,
			4 + pixel * 2
		);
		mtx.stroke();
	});

	window.addEventListener('resize', () => {
		clearTimeout(timer);
		timer = setTimeout(loadCanvas, 200);
	});

	// History management
	const saveHistory = () => {
		try { localStorage.setItem('forzaHistory', JSON.stringify(historyColors)); } catch {}
	};
	const loadHistory = () => {
		try { historyColors = JSON.parse(localStorage.getItem('forzaHistory') || '[]'); }
		catch { historyColors = []; }
	};
	const paintHistory = () => {
		const swatches = Array.from(colorsContainer.querySelectorAll('canvas'));
		swatches.forEach((cv, i) => {
			const ptx = cv.getContext('2d');
			ptx.clearRect(0, 0, cv.width, cv.height);
			const hex = historyColors[i];
			if (hex) {
				ptx.fillStyle = hex;
				ptx.fillRect(0, 0, cv.width, cv.height);
				ptx.strokeStyle = '#00000080';
				ptx.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1);
				cv.title = hex;
			} else {
				ptx.strokeStyle = '#6666';
				ptx.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1);
				cv.title = 'Empty';
			}
		});
	};
	loadHistory();
	paintHistory();

	// Left click on history: set as current color
	colorsContainer.addEventListener('click', (e) => {
		const cv = e.target.closest('canvas');
		if (!cv) return;
		const idx = Array.from(colorsContainer.querySelectorAll('canvas')).indexOf(cv);
		const hex = historyColors[idx];
		if (!hex) return;
		currentColor.value = hex;
		currentColor.dispatchEvent(new Event('input'));
	});
	// Right click on history: delete and reorder (compact)
	colorsContainer.addEventListener('contextmenu', (e) => {
		const cv = e.target.closest('canvas');
		if (!cv) return;
		e.preventDefault();
		const idx = Array.from(colorsContainer.querySelectorAll('canvas')).indexOf(cv);
		if (idx < 0) return;
		historyColors.splice(idx, 1); // remove clicked
		// compact (already compacted by splice) and repaint
		saveHistory();
		paintHistory();
	});
});

document.addEventListener('paste', e => {
	let
		items = (e.clipboardData || e.originalEvent.clipboardData).items;
	Array.from(items).forEach(item => {
		if (item.kind === 'file') {
			if (item.type.indexOf('image') !== 0) {
				return;
			}
			let
				blob = item.getAsFile(),
				reader = new FileReader();

			reader.onload = function (event) {
				image.src = event.target.result;
			};
			reader.readAsDataURL(blob);
		}
	});
});

