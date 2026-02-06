/**
 * LLM Chat 노드 위젯
 * 스트리밍 응답 표시와 설정 UI
 */

import { useState, useEffect, useCallback } from 'react';
import type { FlowNode } from '@flowforge/types';
import { keyManager, providerRegistry } from '@flowforge/state';
import type { AIProviderType, MaskedAPIKeyEntry } from '@flowforge/state';
import { useTheme } from '../../hooks/useTheme';

interface LLMChatWidgetProps {
  node: FlowNode;
  zoom: number;
  onUpdate: (data: Record<string, unknown>) => void;
  onInteraction?: (interacting: boolean) => void;
}

/**
 * LLM Chat 노드 위젯
 */
export function LLMChatWidget({
  node,
  zoom,
  onUpdate,
  onInteraction,
}: LLMChatWidgetProps) {
  const [keys, setKeys] = useState<MaskedAPIKeyEntry[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const { colors } = useTheme();

  // 노드 데이터 추출
  const provider = (node.data.provider as AIProviderType) || 'openai';
  const apiKeyId = (node.data.apiKeyId as string) || '';
  const model = (node.data.model as string) || 'gpt-4o-mini';
  const temperature = (node.data.temperature as number) ?? 0.7;
  const maxTokens = (node.data.maxTokens as number) ?? 2048;
  const stream = (node.data.stream as boolean) ?? true;
  const streamingResponse = (node.data.streamingResponse as string) || '';
  const isComplete = (node.data.isComplete as boolean) ?? true;
  const lastError = node.data.lastError as string | undefined;

  // 프로바이더 정보
  const providerInfo = providerRegistry.get(provider);
  const models = providerInfo?.models || [];

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
      {/* 프로바이더 & 모델 선택 */}
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
            handleChange('model', e.target.value === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307');
          }}
          aria-label="AI Provider"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>

        <select
          style={{
            ...inputStyle,
            flex: 2,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          value={model}
          onChange={e => handleChange('model', e.target.value)}
          aria-label="Model"
        >
          {models.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* API 키 선택 */}
      <select
        style={{
          ...inputStyle,
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
            {key.name} ({key.maskedKey})
          </option>
        ))}
      </select>

      {/* Temperature & Max Tokens */}
      <div style={{ display: 'flex', gap: 4 * zoom, alignItems: 'center' }}>
        <label style={{ color: colors.textMuted, fontSize: baseFontSize * 0.9 }}>
          Temp:
        </label>
        <input
          type="number"
          style={{
            ...inputStyle,
            width: 50 * zoom,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={e => handleChange('temperature', parseFloat(e.target.value))}
          aria-label="Temperature"
        />

        <label style={{ color: colors.textMuted, fontSize: baseFontSize * 0.9, marginLeft: 4 * zoom }}>
          Max:
        </label>
        <input
          type="number"
          style={{
            ...inputStyle,
            width: 60 * zoom,
            fontSize: baseFontSize,
            padding: `${4 * zoom}px`,
          }}
          min={1}
          max={128000}
          step={256}
          value={maxTokens}
          onChange={e => handleChange('maxTokens', parseInt(e.target.value))}
          aria-label="Max tokens"
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2 * zoom,
            color: colors.textMuted,
            fontSize: baseFontSize * 0.9,
            marginLeft: 'auto',
          }}
        >
          <input
            type="checkbox"
            checked={stream}
            onChange={e => handleChange('stream', e.target.checked)}
          />
          Stream
        </label>
      </div>

      {/* 스트리밍 응답 표시 */}
      {streamingResponse && (
        <div
          style={{
            backgroundColor: colors.bgPrimary,
            borderRadius: 4 * zoom,
            padding: 8 * zoom,
            maxHeight: 100 * zoom,
            overflowY: 'auto',
            fontSize: baseFontSize * 0.9,
            color: colors.textSecondary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {streamingResponse}
          {!isComplete && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: baseFontSize,
                backgroundColor: colors.success,
                animation: 'blink 1s infinite',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
              }}
            />
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
