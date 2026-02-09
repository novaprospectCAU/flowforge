/**
 * AI Engineer Pack — 영상/이미지 처리 AI 노드 8개
 * Veo (video), Gemini Imagen (image), 로컬 Canvas API (blend)
 */

import { NODE_SIZES } from '../../nodeTypes';
import type { BuiltinNodePack } from '../types';
import type { NodeExecutor, ExecutionContext, ExecutionResult } from '../../execution/types';

// === Executor 생성 ===

function createAIEngExecutors(): Map<string, NodeExecutor> {
  const executors = new Map<string, NodeExecutor>();

  // aieng:ImageToVideo — Veo API (placeholder for future API integration)
  executors.set('aieng:ImageToVideo', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.image) throw new Error('Image input required');
    const prompt = String(ctx.inputs.prompt ?? '');
    if (!prompt) throw new Error('Prompt required');

    return {
      outputs: { video: null, status: 'pending_api_integration' },
      nodeDataUpdate: { lastPrompt: prompt, provider: String(ctx.nodeData.provider ?? 'gemini') },
    };
  });

  // aieng:VideoToVideo — Veo API
  executors.set('aieng:VideoToVideo', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.video) throw new Error('Video input required');
    const prompt = String(ctx.inputs.prompt ?? '');
    if (!prompt) throw new Error('Prompt required');

    return {
      outputs: { video: null, status: 'pending_api_integration' },
      nodeDataUpdate: { lastPrompt: prompt },
    };
  });

  // aieng:Inpainting — Gemini Imagen
  executors.set('aieng:Inpainting', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.image) throw new Error('Image input required');
    if (!ctx.inputs.mask) throw new Error('Mask input required');
    const prompt = String(ctx.inputs.prompt ?? '');
    if (!prompt) throw new Error('Prompt required');

    return {
      outputs: { image: null },
      nodeDataUpdate: { lastPrompt: prompt },
    };
  });

  // aieng:ImageUpscale — Gemini Imagen
  executors.set('aieng:ImageUpscale', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.image) throw new Error('Image input required');
    return { outputs: { image: null } };
  });

  // aieng:BackgroundRemove — Gemini Imagen
  executors.set('aieng:BackgroundRemove', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.image) throw new Error('Image input required');
    return { outputs: { image: null, mask: null } };
  });

  // aieng:StyleTransfer — Gemini Imagen
  executors.set('aieng:StyleTransfer', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.image) throw new Error('Image input required');
    if (!ctx.inputs.style && !ctx.nodeData.style) throw new Error('Style description required');
    return { outputs: { image: null } };
  });

  // aieng:DepthMap — Gemini
  executors.set('aieng:DepthMap', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    if (!ctx.inputs.image) throw new Error('Image input required');
    return { outputs: { depthMap: null } };
  });

  // aieng:ImageBlend — 로컬 OffscreenCanvas (서버 불필요)
  executors.set('aieng:ImageBlend', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const image1 = ctx.inputs.image1 as { imageData: string } | undefined;
    const image2 = ctx.inputs.image2 as { imageData: string } | undefined;
    const mode = String(ctx.nodeData.mode ?? 'normal');
    const alpha = Number(ctx.nodeData.alpha ?? 0.5);

    if (!image1?.imageData) throw new Error('Image 1 required');
    if (!image2?.imageData) throw new Error('Image 2 required');

    // OffscreenCanvas 블렌딩
    const img1 = await loadImageElement(image1.imageData);
    const img2 = await loadImageElement(image2.imageData);

    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) throw new Error('Failed to create canvas context');

    // 첫 번째 이미지
    canvasCtx.drawImage(img1, 0, 0, width, height);

    // 블렌드 모드 적용
    canvasCtx.globalAlpha = alpha;
    canvasCtx.globalCompositeOperation = blendModeMap[mode] ?? 'source-over';
    canvasCtx.drawImage(img2, 0, 0, width, height);

    const resultData = canvas.toDataURL('image/png');
    return {
      outputs: {
        image: { type: 'image', imageData: resultData },
      },
    };
  });

  return executors;
}

const blendModeMap: Record<string, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
};

async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// === Pack 정의 ===

export function createAIEngineerPack(): BuiltinNodePack {
  const S = NODE_SIZES;
  const COLOR = '#ec4899'; // pink

  const nodesDef = [
    { type: 'aieng:ImageToVideo', title: 'Image to Video', category: 'AI/Video',
      inputs: [
        { id: 'image', name: 'image', dataType: 'image' as const, required: true },
        { id: 'prompt', name: 'prompt', dataType: 'string' as const, required: true },
      ],
      outputs: [
        { id: 'video', name: 'video', dataType: 'any' as const },
        { id: 'status', name: 'status', dataType: 'string' as const },
      ],
      size: S.AI_CHAT,
      defaultData: { provider: 'gemini', apiKeyId: '', duration: 4 },
    },
    { type: 'aieng:VideoToVideo', title: 'Video to Video', category: 'AI/Video',
      inputs: [
        { id: 'video', name: 'video', dataType: 'any' as const, required: true },
        { id: 'prompt', name: 'prompt', dataType: 'string' as const, required: true },
      ],
      outputs: [
        { id: 'video', name: 'video', dataType: 'any' as const },
        { id: 'status', name: 'status', dataType: 'string' as const },
      ],
      size: S.AI_CHAT,
      defaultData: { provider: 'gemini', apiKeyId: '', strength: 0.5 },
    },
    { type: 'aieng:Inpainting', title: 'Inpainting', category: 'AI/Image',
      inputs: [
        { id: 'image', name: 'image', dataType: 'image' as const, required: true },
        { id: 'mask', name: 'mask', dataType: 'image' as const, required: true },
        { id: 'prompt', name: 'prompt', dataType: 'string' as const, required: true },
      ],
      outputs: [{ id: 'image', name: 'image', dataType: 'image' as const }],
      size: S.AI_IMAGE,
      defaultData: { provider: 'gemini', apiKeyId: '' },
    },
    { type: 'aieng:ImageUpscale', title: 'Image Upscale', category: 'AI/Image',
      inputs: [
        { id: 'image', name: 'image', dataType: 'image' as const, required: true },
      ],
      outputs: [{ id: 'image', name: 'image', dataType: 'image' as const }],
      size: S.STANDARD_TALL,
      defaultData: { provider: 'gemini', apiKeyId: '', scale: 2 },
    },
    { type: 'aieng:BackgroundRemove', title: 'Background Remove', category: 'AI/Image',
      inputs: [
        { id: 'image', name: 'image', dataType: 'image' as const, required: true },
      ],
      outputs: [
        { id: 'image', name: 'image', dataType: 'image' as const },
        { id: 'mask', name: 'mask', dataType: 'image' as const },
      ],
      size: S.STANDARD_TALL,
      defaultData: { provider: 'gemini', apiKeyId: '' },
    },
    { type: 'aieng:StyleTransfer', title: 'Style Transfer', category: 'AI/Image',
      inputs: [
        { id: 'image', name: 'image', dataType: 'image' as const, required: true },
        { id: 'style', name: 'style', dataType: 'string' as const },
      ],
      outputs: [{ id: 'image', name: 'image', dataType: 'image' as const }],
      size: S.AI_TEMPLATE,
      defaultData: { provider: 'gemini', apiKeyId: '', style: '' },
    },
    { type: 'aieng:DepthMap', title: 'Depth Map', category: 'AI/Vision',
      inputs: [
        { id: 'image', name: 'image', dataType: 'image' as const, required: true },
      ],
      outputs: [{ id: 'depthMap', name: 'depth map', dataType: 'image' as const }],
      size: S.STANDARD_TALL,
      defaultData: { provider: 'gemini', apiKeyId: '' },
    },
    { type: 'aieng:ImageBlend', title: 'Image Blend', category: 'AI/Image',
      inputs: [
        { id: 'image1', name: 'image 1', dataType: 'image' as const, required: true },
        { id: 'image2', name: 'image 2', dataType: 'image' as const, required: true },
      ],
      outputs: [{ id: 'image', name: 'image', dataType: 'image' as const }],
      size: S.STANDARD_LARGE,
      defaultData: { mode: 'normal', alpha: 0.5 },
    },
  ];

  const executors = createAIEngExecutors();

  return {
    manifest: {
      id: 'aieng',
      name: 'AI Engineer Pack',
      description: 'Video generation, inpainting, upscaling, background removal, style transfer, depth maps',
      version: '1.0.0',
      author: 'FlowForge',
      category: 'AI',
      icon: 'AI',
      color: COLOR,
      kind: 'builtin',
    },
    nodes: nodesDef.map(n => ({
      nodeType: {
        type: n.type,
        title: n.title,
        category: n.category,
        description: n.title,
        inputs: n.inputs,
        outputs: n.outputs,
        defaultSize: n.size,
        color: COLOR,
      },
      defaultData: n.defaultData,
    })),
    executors,
  };
}
