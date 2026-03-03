/**
 * Render adapter — bridges worker render messages to the canvas.
 *
 * Detects OffscreenCanvas + transferToImageBitmap support at construction
 * time and selects the appropriate rendering path (bitmap or legacy pixel-
 * copy). The `offscreen` property is exposed so the caller can tell the
 * worker which path to use during `init`.
 */

function supportsOffscreen() {
  try {
    return (
      typeof OffscreenCanvas !== 'undefined' &&
      typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function'
    );
  } catch (e) {
    return false;
  }
}

/**
 * @param {HTMLCanvasElement} canvas  The game canvas element.
 * @param {function} onBeltUpdate     Called with the belt payload after each frame.
 * @returns {{ offscreen: boolean, handleRender: function }}
 */
export function createRenderAdapter(canvas, onBeltUpdate) {
  const offscreen = supportsOffscreen();
  const ctx = offscreen
    ? canvas.getContext('bitmaprenderer')
    : canvas.getContext('2d', {alpha: false});

  // ⚡ Bolt: Cache ImageData objects by dimensions to eliminate constant
  // allocations of Uint8ClampedArray per frame, reducing GC pressure.
  const imageCache = new Map();

  function handleRender({bitmap, images, text, clip, belt}) {
    if (bitmap) {
      ctx.transferFromImageBitmap(bitmap);
    } else {
      for (const {x, y, w, h, data} of images) {
        const key = (w << 16) | h;
        let image = imageCache.get(key);
        if (!image) {
          image = ctx.createImageData(w, h);
          imageCache.set(key, image);
        }
        image.data.set(data);
        ctx.putImageData(image, x, y);
      }
      if (text.length) {
        ctx.save();
        ctx.font = 'bold 13px Times New Roman';
        if (clip) {
          const {x0, y0, x1, y1} = clip;
          ctx.beginPath();
          ctx.rect(x0, y0, x1 - x0, y1 - y0);
          ctx.clip();
        }
        for (const {x, y, text: str, color} of text) {
          const r = ((color >> 16) & 0xFF);
          const g = ((color >> 8) & 0xFF);
          const b = (color & 0xFF);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillText(str, x, y + 22);
        }
        ctx.restore();
      }
    }
    onBeltUpdate(belt);
  }

  return {offscreen, handleRender};
}
