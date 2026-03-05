import { createRenderAdapter } from './renderAdapter';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBitmapContext() {
  return {
    transferFromImageBitmap: jest.fn(),
  };
}

// Stub document.hidden so visibility tests work in jsdom.
function withDocumentHidden(hidden, fn) {
  const original = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', {value: hidden, configurable: true});
  try {
    return fn();
  } finally {
    if (original) {
      Object.defineProperty(document, 'hidden', original);
    } else {
      delete document.hidden;
    }
  }
}

function makeLegacyContext() {
  const imageData = {data: {set: jest.fn()}};
  return {
    createImageData: jest.fn(() => imageData),
    putImageData: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    font: '',
    fillStyle: '',
  };
}

function makeCanvas(ctx) {
  return {getContext: jest.fn(() => ctx)};
}

// Force the offscreen path off so we get a predictable context in tests.
function makeLegacyCanvas() {
  const ctx = makeLegacyContext();
  const canvas = makeCanvas(ctx);
  return {canvas, ctx};  // ctx exposed so tests can assert on canvas calls
}

// ─── belt callback ────────────────────────────────────────────────────────────

describe('createRenderAdapter — belt update', () => {
  it('calls onBeltUpdate with the belt data after each frame', () => {
    const {canvas} = makeLegacyCanvas();
    const onBeltUpdate = jest.fn();
    const adapter = createRenderAdapter(canvas, onBeltUpdate);

    const belt = [0, 1, 2];
    adapter.handleRender({bitmap: null, images: [], text: [], clip: null, belt});

    expect(onBeltUpdate).toHaveBeenCalledWith(belt);
  });

  it('calls onBeltUpdate with null belt when no belt is present', () => {
    const {canvas} = makeLegacyCanvas();
    const onBeltUpdate = jest.fn();
    const adapter = createRenderAdapter(canvas, onBeltUpdate);

    adapter.handleRender({bitmap: null, images: [], text: [], clip: null, belt: null});

    expect(onBeltUpdate).toHaveBeenCalledWith(null);
  });
});

// ─── bitmap (offscreen) path ──────────────────────────────────────────────────

describe('createRenderAdapter — bitmap path', () => {
  it('calls transferFromImageBitmap when a bitmap is present', () => {
    const ctx = makeBitmapContext();
    const canvas = makeCanvas(ctx);
    const adapter = createRenderAdapter(canvas, jest.fn());

    const bitmap = {kind: 'ImageBitmap'};
    adapter.handleRender({bitmap, images: [], text: [], clip: null, belt: null});

    expect(ctx.transferFromImageBitmap).toHaveBeenCalledWith(bitmap);
  });
});

// ─── legacy (pixel-copy) path ─────────────────────────────────────────────────

describe('createRenderAdapter — legacy image path', () => {
  it('creates and draws image data for each image in the batch and caches ImageData objects', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    const data4 = new Uint8Array(4 * 4 * 4);
    const data8 = new Uint8Array(8 * 8 * 4);
    adapter.handleRender({
      bitmap: null,
      images: [
        {x: 10, y: 20, w: 4, h: 4, data: data4},
        {x: 15, y: 25, w: 4, h: 4, data: data4}, // Should reuse 4x4 ImageData
        {x: 50, y: 50, w: 8, h: 8, data: data8}  // Should create new 8x8 ImageData
      ],
      text: [],
      clip: null,
      belt: null,
    });

    expect(ctx.createImageData).toHaveBeenCalledTimes(2);
    expect(ctx.createImageData).toHaveBeenCalledWith(4, 4);
    expect(ctx.createImageData).toHaveBeenCalledWith(8, 8);
    expect(ctx.putImageData).toHaveBeenCalledTimes(3);
  });

  it('does not call text drawing functions when text array is empty', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    adapter.handleRender({bitmap: null, images: [], text: [], clip: null, belt: null});

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('saves and restores context when drawing text', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    adapter.handleRender({
      bitmap: null,
      images: [],
      text: [{x: 5, y: 10, text: 'Hello', color: 0xffffff}],
      clip: null,
      belt: null,
    });

    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledWith('Hello', 5, 32); // y + 22
  });

  it('applies clip region when clip is provided', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    adapter.handleRender({
      bitmap: null,
      images: [],
      text: [{x: 0, y: 0, text: 'X', color: 0}],
      clip: {x0: 10, y0: 20, x1: 100, y1: 200},
      belt: null,
    });

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.rect).toHaveBeenCalledWith(10, 20, 90, 180);
    expect(ctx.clip).toHaveBeenCalled();
  });

  it('does not apply clip when clip is null', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    adapter.handleRender({
      bitmap: null,
      images: [],
      text: [{x: 0, y: 0, text: 'X', color: 0}],
      clip: null,
      belt: null,
    });

    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.clip).not.toHaveBeenCalled();
  });

  it('decodes the color correctly from the packed RGB integer', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    // 0xFF8040 → r=255, g=128, b=64
    adapter.handleRender({
      bitmap: null,
      images: [],
      text: [{x: 0, y: 0, text: 'C', color: 0xFF8040}],
      clip: null,
      belt: null,
    });

    expect(ctx.fillStyle).toBe('rgb(255, 128, 64)');
  });
});

// ─── visibility throttling ────────────────────────────────────────────────────

describe('createRenderAdapter — setVisible', () => {
  it('skips canvas drawing when setVisible(false) is called', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const onBeltUpdate = jest.fn();
    const adapter = createRenderAdapter(canvas, onBeltUpdate);

    adapter.setVisible(false);

    adapter.handleRender({
      bitmap: null,
      images: [{x: 0, y: 0, w: 4, h: 4, data: new Uint8Array(64)}],
      text: [],
      clip: null,
      belt: [1, 2],
    });

    expect(ctx.putImageData).not.toHaveBeenCalled();
    expect(onBeltUpdate).not.toHaveBeenCalled();
  });

  it('resumes drawing after setVisible(true)', () => {
    const {canvas} = makeLegacyCanvas();
    const onBeltUpdate = jest.fn();
    const adapter = createRenderAdapter(canvas, onBeltUpdate);

    adapter.setVisible(false);
    adapter.setVisible(true);

    const belt = [0, 1];
    adapter.handleRender({bitmap: null, images: [], text: [], clip: null, belt});

    expect(onBeltUpdate).toHaveBeenCalledWith(belt);
  });

  it('skips bitmap draw when hidden', () => {
    const ctx = makeBitmapContext();
    const canvas = {getContext: jest.fn(() => ctx)};
    const onBeltUpdate = jest.fn();
    const adapter = createRenderAdapter(canvas, onBeltUpdate);

    adapter.setVisible(false);

    const bitmap = {kind: 'ImageBitmap'};
    adapter.handleRender({bitmap, images: [], text: [], clip: null, belt: null});

    expect(ctx.transferFromImageBitmap).not.toHaveBeenCalled();
    expect(onBeltUpdate).not.toHaveBeenCalled();
  });

  it('initialises as visible when document.hidden is false', () => {
    withDocumentHidden(false, () => {
      const {canvas} = makeLegacyCanvas();
      const onBeltUpdate = jest.fn();
      const adapter = createRenderAdapter(canvas, onBeltUpdate);

      const belt = [0, 1];
      adapter.handleRender({bitmap: null, images: [], text: [], clip: null, belt});

      // onBeltUpdate is only called when the adapter is visible and rendering ran.
      expect(onBeltUpdate).toHaveBeenCalledWith(belt);
    });
  });

  it('initialises as hidden when document.hidden is true', () => {
    withDocumentHidden(true, () => {
      const {canvas, ctx} = makeLegacyCanvas();
      const onBeltUpdate = jest.fn();
      const adapter = createRenderAdapter(canvas, onBeltUpdate);

      adapter.handleRender({
        bitmap: null,
        images: [{x: 0, y: 0, w: 2, h: 2, data: new Uint8Array(16)}],
        text: [],
        clip: null,
        belt: [1],
      });

      expect(ctx.putImageData).not.toHaveBeenCalled();
      expect(onBeltUpdate).not.toHaveBeenCalled();
    });
  });
});

