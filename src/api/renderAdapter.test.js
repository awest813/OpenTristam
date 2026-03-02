import { createRenderAdapter } from './renderAdapter';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBitmapContext() {
  return {
    transferFromImageBitmap: jest.fn(),
  };
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
  it('creates and draws image data for each image in the batch', () => {
    const {canvas, ctx} = makeLegacyCanvas();
    const adapter = createRenderAdapter(canvas, jest.fn());

    const data = new Uint8Array(4 * 4 * 4);
    adapter.handleRender({
      bitmap: null,
      images: [{x: 10, y: 20, w: 4, h: 4, data}],
      text: [],
      clip: null,
      belt: null,
    });

    expect(ctx.createImageData).toHaveBeenCalledWith(4, 4);
    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
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
