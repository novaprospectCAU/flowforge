/**
 * Image Generate 노드 위젯
 * 이미지 생성 설정 및 결과 표시
 */

import { useState, useEffect, useCallback } from 'react';
import type { FlowNode } from '@flowforge/types';
import { keyManager } from '@flowforge/state';
import type { AIProviderType, ImageSize, MaskedAPIKeyEntry } from '@flowforge/state';
import { useTheme } from '../../hooks/useTheme';

interface ImageGenerateWidgetProps {
  node: FlowNode;
  zoom: number;
  onUpdate: (data: Record<string, unknown>) => void;
  onInteraction?: (interacting: boolean) => void;
}

const IMAGE_SIZES: ImageSize[] = [
  '256x256',
  '512x512',
  '1024x1024',
  '1792x1024',
  '1024x1792',
];

const IMAGE_MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: ['gpt-image-1', 'gpt-image-1-mini'],
  gemini: ['gemini-2.5-flash-image'],
};

/**
 * Image Generate 노드 위젯
 */
export function ImageGenerateWidget({
  node,
  zoom,
  onUpdate,
  onInteraction,
}: ImageGenerateWidgetProps) {
  const [keys, setKeys] = useState<MaskedAPIKeyEntry[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const { colors } = useTheme();

  // 노드 데이터 추출
  const provider = (node.data.provider as AIProviderType) || 'openai';
  const apiKeyId = (node.data.apiKeyId as string) || '';
  const model = (node.data.model as string) || 'gpt-image-1';
  const imageModels = IMAGE_MODELS_BY_PROVIDER[provider] || IMAGE_MODELS_BY_PROVIDER.openai;
  const size = (node.data.size as ImageSize) || '1024x1024';
  const quality = (node.data.quality as 'standard' | 'hd') || 'standard';
  const generatedImage = (node.data.generatedImage as string) || '';
  const revisedPrompt = node.data.revisedPrompt as string | undefined;
  const lastError = node.data.lastError as string | undefined;

  // API 키 로드
  const loadKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const loadedKeys = await keyManager.listKeysByProvider(provider);
      setKeys(loadedKeys);
    } catch {
      setKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [provider]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // 입력 핸들러
  const handleChange = (field: string, value: unknown) => {
    onUpdate({ [field]: value });
  };

  // 스타일 계산
  const baseFontSize = Math.max(10, Math.min(14, 12 * zoom));

  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: 4,
    color: colors.textPrimary,
    outline: 'none',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6 * zoom,
        padding: 8 * zoom,
        fontSize: baseFontSize,
      }}
      onMouseDown={() => onInteraction?.(true)}
      onMouseUp={() => onInteraction?.(false)}
      onMouseLeave={() => onInteraction?.(false)}
    >
      {/* 프로바이더 & 모델 & 크기 선택 */}
      <div style={{ display: 'flex', gap: 4 * zoom }}>
        <select
          style={{
            ...inputStyle,
            flex: 1,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          value={provider}
          onChange={e => {
            handleChange('provider', e.target.value);
            handleChange('apiKeyId', '');
            const models = IMAGE_MODELS_BY_PROVIDER[e.target.value];
            if (models?.[0]) handleChange('model', models[0]);
          }}
          aria-label="AI Provider"
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
        </select>

        <select
          style={{
            ...inputStyle,
            flex: 1,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          value={model}
          onChange={e => handleChange('model', e.target.value)}
          aria-label="Image model"
        >
          {imageModels.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          style={{
            ...inputStyle,
            flex: 1,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          value={size}
          onChange={e => handleChange('size', e.target.value)}
          aria-label="Image size"
        >
          {IMAGE_SIZES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Quality & API 키 */}
      <div style={{ display: 'flex', gap: 4 * zoom }}>
        <select
          style={{
            ...inputStyle,
            width: 80 * zoom,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          value={quality}
          onChange={e => handleChange('quality', e.target.value)}
          aria-label="Image quality"
        >
          <option value="standard">Standard</option>
          <option value="hd">HD</option>
        </select>

        <select
          style={{
            ...inputStyle,
            flex: 1,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          value={apiKeyId}
          onChange={e => handleChange('apiKeyId', e.target.value)}
          onFocus={loadKeys}
          aria-label="API Key"
        >
          <option value="">
            {isLoadingKeys ? 'Loading...' : 'Select API Key'}
          </option>
          {keys.map(key => (
            <option key={key.id} value={key.id}>
              {key.name}
            </option>
          ))}
        </select>
      </div>

      {/* 생성된 이미지 표시 */}
      {generatedImage && (
        <div
          style={{
            borderRadius: 4 * zoom,
            overflow: 'hidden',
            backgroundColor: colors.bgPrimary,
          }}
        >
          <img
            src={generatedImage}
            alt="Generated"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
          {revisedPrompt && (
            <div
              style={{
                padding: 6 * zoom,
                fontSize: baseFontSize * 0.8,
                color: colors.textMuted,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <strong>Revised:</strong> {revisedPrompt}
            </div>
          )}
        </div>
      )}

      {/* 에러 표시 */}
      {lastError && (
        <div
          style={{
            backgroundColor: colors.error + '22',
            border: `1px solid ${colors.error}`,
            borderRadius: 4 * zoom,
            padding: 6 * zoom,
            fontSize: baseFontSize * 0.85,
            color: colors.error,
          }}
        >
          {lastError}
        </div>
      )}
    </div>
  );
}
