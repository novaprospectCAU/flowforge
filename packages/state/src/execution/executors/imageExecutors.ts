import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';
import { downloadImage } from '@flowforge/canvas';

// === 이미지 처리 헬퍼 함수들 ===

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

async function resizeImage(dataUrl: string, scale: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToDataUrl(canvas);
}

async function applyFilter(dataUrl: string, filterType: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  switch (filterType) {
    case 'grayscale':
      ctx.filter = 'grayscale(100%)';
      break;
    case 'blur':
      ctx.filter = 'blur(3px)';
      break;
    case 'sharpen':
      ctx.filter = 'contrast(150%)';
      break;
    case 'invert':
      ctx.filter = 'invert(100%)';
      break;
    case 'sepia':
      ctx.filter = 'sepia(100%)';
      break;
    case 'brightness':
      ctx.filter = 'brightness(150%)';
      break;
    default:
      ctx.filter = 'none';
  }

  ctx.drawImage(img, 0, 0);
  return canvasToDataUrl(canvas);
}

// === 이미지 Executor들 ===

// Resize: 이미지 리사이즈
executorRegistry.register('Resize', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image as { type: string; imageData: string; fileName?: string } | undefined;
  const scale = Number(ctx.nodeData.scale ?? ctx.inputs.scale ?? 1);

  if (!image || !image.imageData) {
    throw new Error('No image input');
  }

  const resizedData = await resizeImage(image.imageData, scale);

  return {
    outputs: {
      out: { type: 'image', imageData: resizedData, fileName: image.fileName, scale },
    },
  };
});

// Filter: 이미지 필터
executorRegistry.register('Filter', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image as { type: string; imageData: string; fileName?: string } | undefined;
  const filterType = String(ctx.nodeData.filter ?? 'none');

  if (!image || !image.imageData) {
    throw new Error('No image input');
  }

  const filteredData = await applyFilter(image.imageData, filterType);

  return {
    outputs: {
      out: { type: 'image', imageData: filteredData, fileName: image.fileName, filter: filterType },
    },
  };
});

// SaveImage: 이미지 저장 (다운로드)
executorRegistry.register('SaveImage', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image as { type: string; imageData: string } | undefined;
  const path = String(ctx.nodeData.path ?? 'output.png');

  if (!image || !image.imageData) {
    throw new Error('No image input');
  }

  downloadImage(image.imageData, path);
  return { outputs: {} };
});
