import { useEffect, useRef, useState, useCallback } from 'react';
import type { FlowNode, Viewport, CanvasSize } from '@flowforge/types';
import { worldToScreen } from '@flowforge/canvas';

interface NodeWidgetsProps {
  nodes: FlowNode[];
  viewport: Viewport;
  canvasSize: CanvasSize;
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
  onWidgetInteraction?: (interacting: boolean) => void;
  isDragging?: boolean;  // 드래그 중일 때 위젯 숨김
}

// 노드 헤더 높이 (drawNode.ts의 NODE_STYLE.headerHeight와 동일)
const HEADER_HEIGHT = 28;
const WIDGET_PADDING = 8;

// 위젯이 지원되는 노드 타입
const WIDGET_SUPPORTED_TYPES = ['NumberInput', 'TextInput', 'ImageInput', 'Math', 'Filter', 'Resize', 'Merge', 'Condition', 'Display', 'SaveImage'];

export function NodeWidgets({
  nodes,
  viewport,
  canvasSize,
  onUpdateNode,
  onWidgetInteraction,
  isDragging,
}: NodeWidgetsProps) {
  // 드래그 중이면 위젯 숨김 (성능 최적화)
  if (isDragging) return null;

  // 위젯이 있는 노드만 필터링
  const widgetNodes = nodes.filter(n => WIDGET_SUPPORTED_TYPES.includes(n.type));

  // 줌이 너무 작으면 위젯 숨김
  if (viewport.zoom < 0.5) return null;

  return (
    <div style={styles.container}>
      {widgetNodes.map(node => (
        <NodeWidget
          key={node.id}
          node={node}
          viewport={viewport}
          canvasSize={canvasSize}
          onUpdate={(data) => onUpdateNode(node.id, data)}
          onInteraction={onWidgetInteraction}
        />
      ))}
    </div>
  );
}

interface NodeWidgetProps {
  node: FlowNode;
  viewport: Viewport;
  canvasSize: CanvasSize;
  onUpdate: (data: Record<string, unknown>) => void;
  onInteraction?: (interacting: boolean) => void;
}

function NodeWidget({ node, viewport, canvasSize, onUpdate, onInteraction }: NodeWidgetProps) {
  // 스크린 좌표 계산
  const screenPos = worldToScreen(node.position, viewport, canvasSize);
  const scaledWidth = node.size.width * viewport.zoom;
  const scaledHeight = node.size.height * viewport.zoom;

  // 위젯 영역 (헤더 아래)
  const widgetTop = screenPos.y + HEADER_HEIGHT * viewport.zoom;
  const widgetHeight = scaledHeight - HEADER_HEIGHT * viewport.zoom;

  // 화면 밖이면 렌더링 안 함
  if (
    screenPos.x + scaledWidth < 0 ||
    screenPos.x > canvasSize.width ||
    screenPos.y + scaledHeight < 0 ||
    screenPos.y > canvasSize.height
  ) {
    return null;
  }

  // 인터랙션 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInteraction?.(true);
  };

  const handleMouseUp = () => {
    onInteraction?.(false);
  };

  const handleChange = useCallback((key: string, value: unknown) => {
    onUpdate({ ...node.data, [key]: value });
  }, [node.data, onUpdate]);

  // 위젯 렌더링
  const renderWidget = () => {
    const fontSize = Math.max(10, 12 * viewport.zoom);

    switch (node.type) {
      case 'NumberInput':
        return (
          <NumberWidget
            value={node.data.value as number ?? 0}
            onChange={(v) => handleChange('value', v)}
            fontSize={fontSize}
          />
        );

      case 'TextInput':
        return (
          <TextWidget
            value={node.data.text as string ?? ''}
            onChange={(v) => handleChange('text', v)}
            fontSize={fontSize}
          />
        );

      case 'Math':
        return (
          <SelectWidget
            value={node.data.operation as string ?? 'add'}
            options={[
              { value: 'add', label: '+' },
              { value: 'subtract', label: '−' },
              { value: 'multiply', label: '×' },
              { value: 'divide', label: '÷' },
              { value: 'power', label: '^' },
              { value: 'modulo', label: '%' },
            ]}
            onChange={(v) => handleChange('operation', v)}
            fontSize={fontSize}
          />
        );

      case 'Filter':
        return (
          <SelectWidget
            value={node.data.filter as string ?? 'none'}
            options={[
              { value: 'none', label: 'None' },
              { value: 'grayscale', label: 'Grayscale' },
              { value: 'blur', label: 'Blur' },
              { value: 'sharpen', label: 'Sharpen' },
              { value: 'invert', label: 'Invert' },
              { value: 'sepia', label: 'Sepia' },
              { value: 'brightness', label: 'Brightness' },
            ]}
            onChange={(v) => handleChange('filter', v)}
            fontSize={fontSize}
          />
        );

      case 'Resize':
        return (
          <NumberWidget
            value={node.data.scale as number ?? 1}
            onChange={(v) => handleChange('scale', v)}
            fontSize={fontSize}
            min={0.1}
            max={10}
            step={0.1}
            showSlider
          />
        );

      case 'Merge':
        return (
          <SelectWidget
            value={node.data.mode as string ?? 'array'}
            options={[
              { value: 'array', label: 'Array' },
              { value: 'object', label: 'Object' },
            ]}
            onChange={(v) => handleChange('mode', v)}
            fontSize={fontSize}
          />
        );

      case 'Condition':
        return (
          <SelectWidget
            value={node.data.condition as string ?? 'equals'}
            options={[
              { value: 'equals', label: '==' },
              { value: 'notEquals', label: '!=' },
              { value: 'greater', label: '>' },
              { value: 'less', label: '<' },
              { value: 'greaterEqual', label: '>=' },
              { value: 'lessEqual', label: '<=' },
            ]}
            onChange={(v) => handleChange('condition', v)}
            fontSize={fontSize}
          />
        );

      case 'ImageInput':
        return (
          <ImageWidget
            imageData={node.data.imageData as string | undefined}
            fileName={node.data.fileName as string | undefined}
            onChange={(imageData, fileName) => {
              onUpdate({ ...node.data, imageData, fileName });
            }}
            fontSize={fontSize}
          />
        );

      case 'Display':
        return (
          <DisplayWidget
            data={node.data.displayValue}
            fontSize={fontSize}
          />
        );

      case 'SaveImage':
        return (
          <SaveImageWidget
            path={node.data.path as string ?? 'output.png'}
            onChange={(path) => handleChange('path', path)}
            fontSize={fontSize}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        ...styles.widget,
        left: screenPos.x + WIDGET_PADDING * viewport.zoom,
        top: widgetTop + WIDGET_PADDING * viewport.zoom,
        width: scaledWidth - WIDGET_PADDING * 2 * viewport.zoom,
        height: widgetHeight - WIDGET_PADDING * 2 * viewport.zoom,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {renderWidget()}
    </div>
  );
}

// 숫자 위젯 (슬라이더 옵션)
interface NumberWidgetProps {
  value: number;
  onChange: (value: number) => void;
  fontSize: number;
  min?: number;
  max?: number;
  step?: number;
  showSlider?: boolean;
}

function NumberWidget({ value, onChange, fontSize, min, max, step = 1, showSlider }: NumberWidgetProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  // 드래그로 값 조절
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === inputRef.current) return;

    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startValue = localValue;

    const handleMouseMove = (moveE: MouseEvent) => {
      const delta = (moveE.clientX - startX) * (step || 1) * 0.1;
      let newValue = startValue + delta;
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      newValue = Math.round(newValue / (step || 1)) * (step || 1);
      setLocalValue(newValue);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#2d2d30',
          borderRadius: 4,
          padding: '2px 6px',
          cursor: 'ew-resize',
        }}
        onMouseDown={handleMouseDown}
      >
        <input
          ref={inputRef}
          type="number"
          value={localValue}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          style={{
            ...styles.input,
            fontSize,
            width: '100%',
            cursor: 'text',
          }}
        />
      </div>
      {showSlider && min !== undefined && max !== undefined && (
        <input
          type="range"
          value={localValue}
          onChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          style={{
            width: '100%',
            height: 4,
            accentColor: '#0078d4',
          }}
        />
      )}
    </div>
  );
}

// 텍스트 위젯
interface TextWidgetProps {
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
}

function TextWidget({ value, onChange, fontSize }: TextWidgetProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      placeholder="Enter text..."
      style={{
        ...styles.textarea,
        fontSize,
        width: '100%',
        height: '100%',
        resize: 'none',
      }}
    />
  );
}

// 드롭다운 위젯
interface SelectWidgetProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  fontSize: number;
}

function SelectWidget({ value, options, onChange, fontSize }: SelectWidgetProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...styles.select,
        fontSize,
        width: '100%',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// 이미지 위젯 (파일 선택 + 미리보기)
interface ImageWidgetProps {
  imageData: string | undefined;
  fileName: string | undefined;
  onChange: (imageData: string, fileName: string) => void;
  fontSize: number;
}

function ImageWidget({ imageData, fileName, onChange, fontSize }: ImageWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onChange(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', height: '100%' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {imageData ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflow: 'hidden',
          }}
        >
          <img
            src={imageData}
            alt={fileName}
            style={{
              flex: 1,
              objectFit: 'contain',
              maxHeight: '100%',
              borderRadius: 4,
              background: '#1e1e1e',
            }}
            onClick={handleClick}
          />
          <div
            style={{
              fontSize: fontSize * 0.8,
              color: '#888',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fileName}
          </div>
        </div>
      ) : (
        <button
          onClick={handleClick}
          style={{
            flex: 1,
            background: '#2d2d30',
            border: '2px dashed #4a4a4a',
            borderRadius: 4,
            color: '#888',
            fontSize,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Click to load image
        </button>
      )}
    </div>
  );
}

// 디스플레이 위젯 (결과 미리보기)
interface DisplayWidgetProps {
  data: unknown;
  fontSize: number;
}

function DisplayWidget({ data, fontSize }: DisplayWidgetProps) {
  // 이미지 데이터인 경우
  if (data && typeof data === 'object' && 'imageData' in (data as Record<string, unknown>)) {
    const imageData = (data as Record<string, unknown>).imageData as string;
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <img
          src={imageData}
          alt="Preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: 4,
            background: '#1e1e1e',
          }}
        />
      </div>
    );
  }

  // 문자열이나 숫자
  const displayText = data === undefined
    ? '(no input)'
    : typeof data === 'object'
      ? JSON.stringify(data, null, 2)
      : String(data);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: '#1e1e1e',
        borderRadius: 4,
        padding: 6,
        fontSize,
        fontFamily: 'monospace',
        color: '#e0e0e0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {displayText}
    </div>
  );
}

// SaveImage 위젯 (파일명 입력)
interface SaveImageWidgetProps {
  path: string;
  onChange: (path: string) => void;
  fontSize: number;
}

function SaveImageWidget({ path, onChange, fontSize }: SaveImageWidgetProps) {
  const [localPath, setLocalPath] = useState(path);

  useEffect(() => {
    setLocalPath(path);
  }, [path]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPath(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <div style={{ fontSize: fontSize * 0.9, color: '#888' }}>Filename:</div>
      <input
        type="text"
        value={localPath}
        onChange={handleChange}
        placeholder="output.png"
        style={{
          background: '#2d2d30',
          border: '1px solid #3c3c3c',
          borderRadius: 4,
          color: '#e0e0e0',
          fontSize,
          padding: '4px 8px',
          outline: 'none',
          width: '100%',
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
  },
  widget: {
    position: 'absolute',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  input: {
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    outline: 'none',
    padding: 0,
    MozAppearance: 'textfield',
  },
  textarea: {
    background: '#2d2d30',
    border: '1px solid #3c3c3c',
    borderRadius: 4,
    color: '#e0e0e0',
    fontFamily: 'monospace',
    outline: 'none',
    padding: 6,
  },
  select: {
    background: '#2d2d30',
    border: '1px solid #3c3c3c',
    borderRadius: 4,
    color: '#e0e0e0',
    outline: 'none',
    padding: '4px 8px',
    cursor: 'pointer',
  },
};
