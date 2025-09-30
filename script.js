'use strict';
let canvas, magnify, preview, ctx, mtx, ptx, timer, file, image, color;

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
/*
const loadImage = () => {
	console.log('loadImage');
	let files = file.files;
	if (FileReader && files && files.length) {
		let
			fr = new FileReader(),
			image = document.getElementById('image');
		fr.onload = function () {
			image.src = fr.result;
		}
		fr.readAsDataURL(files[0]);
	}
	else {
		alert('failed to load image');
	}
}
*/
const loadCanvas = () => {
	canvas.width = image.offsetWidth;
	canvas.height = image.offsetHeight;
	ctx.drawImage(image, 0, 0, image.offsetWidth, image.offsetHeight);
}

document.addEventListener('DOMContentLoaded', () => {
	canvas = document.getElementById('canvas');
	magnify = document.getElementById('magnify');
	preview = document.getElementById('preview');
	image = document.getElementById('image');
	file = document.getElementById('file');
	color = document.getElementById('color');
	ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
	mtx = magnify.getContext('2d', { alpha: true, willReadFrequently: true });
	ptx = preview.getContext('2d', { alpha: true, willReadFrequently: true });

	image.addEventListener('load', () => {
		loadCanvas();
	});
	loadCanvas();

	color.addEventListener('input', (color) => {
		let hex = color.target.value,
			rgb = hexToRgb(hex),
			hsl = rgbToHSL(rgb.r, rgb.g, rgb.b),
			hsb = rgbToHSB(rgb.r, rgb.g, rgb.b),
			fhsb = rgbToForza(rgb.r, rgb.g, rgb.b);

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
		// console.log('color', hex, rgb, hsl, hsb, fhsb);
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
	canvas.addEventListener('click', e => {
		let
			sx = e.offsetX,
			sy = e.offsetY,
			px = ctx.getImageData(sx, sy, 1, 1),
			hx = '#' + ('000000' + rgbToHex(px.data[0], px.data[1], px.data[2])).slice(-6);
		color.value = hx;
		color.dispatchEvent(new Event('input'));
	});
	canvas.addEventListener('mousemove', e => {
		let
			sx = e.offsetX,
			sy = e.offsetY,
			px = ctx.getImageData(sx, sy, 1, 1),
			hx = '#' + ('000000' + rgbToHex(px.data[0], px.data[1], px.data[2])).slice(-6);
		ptx.fillStyle = hx;
		ptx.fillRect(0, 0, preview.width, preview.height);
		
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
			99,
			99,
			4,
			4
		);
		mtx.stroke();
	});
	canvas.addEventListener('mouseout', e => {
		magnify.style.display = 'none';
	});
	
	window.addEventListener('resize', () => {
		clearTimeout(timer);
		timer = setTimeout(loadCanvas, 200);
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

