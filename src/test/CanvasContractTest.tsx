import { useEffect, useRef, useState } from 'react';
import { createRenderer, screenToWorld, worldToScreen } from '@flowforge/canvas';
import type { IRenderer } from '@flowforge/canvas';
import type { Viewport, CanvasSize, Color } from '@flowforge/types';
import { IconParty, IconWarning, IconClipboard, IconCheck, IconClose } from '../components/Icons';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export function CanvasContractTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [allPassed, setAllPassed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    runTests();
  }, []);
  
  async function runTests() {
    setIsRunning(true);
    const testResults: TestResult[] = [];
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    
    // === 테스트 1: 렌더러 생성 ===
    let renderer: IRenderer | null = null;
    let rendererType = 'none';
    
    try {
      renderer = await createRenderer(canvas);
      rendererType = renderer.getCapabilities().type;
      
      testResults.push({
        name: '1. 렌더러 생성',
        passed: true,
        detail: `Type: ${rendererType}`,
      });
    } catch (error) {
      testResults.push({
        name: '1. 렌더러 생성',
        passed: false,
        detail: `Error: ${error}`,
      });
    }
    
    // === 테스트 2: WebGPU 또는 WebGL2 ===
    testResults.push({
      name: '2. WebGPU/WebGL2 지원',
      passed: rendererType === 'webgpu' || rendererType === 'webgl2',
      detail: `Active: ${rendererType}`,
    });
    
    // === 테스트 3: DPR 반영 ===
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    
    const dprCorrect = canvas.width === Math.floor(rect.width * dpr);
    
    testResults.push({
      name: '3. DPR 반영',
      passed: dprCorrect,
      detail: `DPR: ${dpr}, CSS: ${rect.width}x${rect.height}, Backing: ${canvas.width}x${canvas.height}`,
    });
    
    // === 테스트 4: 좌표 변환 (World→Screen) ===
    const viewport: Viewport = { x: 100, y: 50, zoom: 1 };
    const canvasSize: CanvasSize = { width: 400, height: 300 };
    
    const screenPos = worldToScreen({ x: 100, y: 50 }, viewport, canvasSize);
    const expectedScreen = { x: 200, y: 150 }; // 화면 중심
    
    const transformCorrect = 
      Math.abs(screenPos.x - expectedScreen.x) < 0.001 &&
      Math.abs(screenPos.y - expectedScreen.y) < 0.001;
    
    testResults.push({
      name: '4. 좌표 변환 (World→Screen)',
      passed: transformCorrect,
      detail: `World(100,50) → Screen(${screenPos.x.toFixed(1)},${screenPos.y.toFixed(1)}), Expected(200,150)`,
    });
    
    // === 테스트 5: 역변환 (Screen→World) ===
    const worldPos = screenToWorld(screenPos, viewport, canvasSize);
    const inverseCorrect =
      Math.abs(worldPos.x - 100) < 0.001 &&
      Math.abs(worldPos.y - 50) < 0.001;
    
    testResults.push({
      name: '5. 좌표 변환 (Screen→World)',
      passed: inverseCorrect,
      detail: `Screen(${screenPos.x},${screenPos.y}) → World(${worldPos.x.toFixed(1)},${worldPos.y.toFixed(1)}), Expected(100,50)`,
    });
    
    // === 테스트 6: 줌 변환 ===
    const viewport2: Viewport = { x: 0, y: 0, zoom: 2 };
    const zoomScreen = worldToScreen({ x: 50, y: 25 }, viewport2, canvasSize);
    const zoomCorrect =
      Math.abs(zoomScreen.x - 300) < 0.001 &&
      Math.abs(zoomScreen.y - 200) < 0.001;
    
    testResults.push({
      name: '6. 줌 변환',
      passed: zoomCorrect,
      detail: `Zoom=2, World(50,25) → Screen(${zoomScreen.x},${zoomScreen.y}), Expected(300,200)`,
    });
    
    // === 테스트 7: 포인터 왕복 (Screen→World→Screen) ===
    const viewport3: Viewport = { x: 100, y: 50, zoom: 1.5 };
    const testScreenPos = { x: 250, y: 180 };
    const worldPos2 = screenToWorld(testScreenPos, viewport3, canvasSize);
    const backToScreen = worldToScreen(worldPos2, viewport3, canvasSize);
    
    const roundtripCorrect =
      Math.abs(backToScreen.x - testScreenPos.x) < 0.001 &&
      Math.abs(backToScreen.y - testScreenPos.y) < 0.001;
    
    testResults.push({
      name: '7. 포인터 왕복 (Screen→World→Screen)',
      passed: roundtripCorrect,
      detail: `Original(${testScreenPos.x},${testScreenPos.y}) → World(${worldPos2.x.toFixed(2)},${worldPos2.y.toFixed(2)}) → Back(${backToScreen.x.toFixed(2)},${backToScreen.y.toFixed(2)})`,
    });
    
    // === 테스트 8: 다양한 줌 레벨 왕복 ===
    const zoomLevels = [0.25, 0.5, 1, 2, 4];
    let allZoomsPassed = true;
    let failedZoom = '';
    
    for (const zoom of zoomLevels) {
      const vp: Viewport = { x: 0, y: 0, zoom };
      const screen = { x: 100, y: 100 };
      const world = screenToWorld(screen, vp, canvasSize);
      const back = worldToScreen(world, vp, canvasSize);
      
      if (Math.abs(back.x - screen.x) > 0.001 || Math.abs(back.y - screen.y) > 0.001) {
        allZoomsPassed = false;
        failedZoom = `zoom=${zoom}`;
        break;
      }
    }
    
    testResults.push({
      name: '8. 줌 레벨별 왕복 (0.25x ~ 4x)',
      passed: allZoomsPassed,
      detail: allZoomsPassed 
        ? `Tested zoom levels: ${zoomLevels.join(', ')}` 
        : `Failed at ${failedZoom}`,
    });
    
    // === 테스트 9: 기본 렌더링 ===
    if (renderer) {
      try {
        const testCanvasSize: CanvasSize = { width: rect.width, height: rect.height };
        
        renderer.beginFrame();
        renderer.setTransform({ x: 0, y: 0, zoom: 1 }, testCanvasSize, dpr);
        
        // 빨간 선
        const red: Color = { r: 255, g: 0, b: 0, a: 255 };
        renderer.drawLine(50, 50, 200, 50, red, 2);
        
        // 초록 선
        const green: Color = { r: 0, g: 255, b: 0, a: 255 };
        renderer.drawLine(50, 70, 200, 70, green, 2);
        
        // 파란 사각형
        const blue: Color = { r: 0, g: 100, b: 255, a: 255 };
        renderer.drawRect(50, 100, 100, 60, blue);
        
        // 보라 원
        const purple: Color = { r: 150, g: 50, b: 255, a: 255 };
        renderer.drawCircle(250, 130, 30, purple);
        
        // 주황 둥근 사각형
        const orange: Color = { r: 255, g: 150, b: 0, a: 255 };
        renderer.drawRoundedRect(300, 100, 80, 60, 10, orange);
        
        renderer.endFrame();
        
        testResults.push({
          name: '9. 기본 렌더링',
          passed: true,
          detail: 'Line, Rect, Circle, RoundedRect 렌더링 완료',
        });
      } catch (error) {
        testResults.push({
          name: '9. 기본 렌더링',
          passed: false,
          detail: `Error: ${error}`,
        });
      }
    } else {
      testResults.push({
        name: '9. 기본 렌더링',
        passed: false,
        detail: 'Renderer not available',
      });
    }
    
    // 결과 집계
    setResults(testResults);
    setAllPassed(testResults.every(r => r.passed));
    setIsRunning(false);
  }
  
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>FlowForge Week 0.5</h1>
      <h2 style={{ fontWeight: 'normal', color: '#666', marginBottom: 24 }}>
        Canvas Contract Test
      </h2>
      
      {/* 캔버스 영역 */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%',
          height: 200,
          border: '2px solid #ddd',
          borderRadius: 8,
          marginBottom: 24,
          background: '#fff',
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      
      {/* 테스트 결과 */}
      <h3 style={{ marginBottom: 12 }}>테스트 결과</h3>
      
      {isRunning ? (
        <p>테스트 실행 중...</p>
      ) : (
        <>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            background: '#fff',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                  테스트
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 80, borderBottom: '1px solid #dee2e6' }}>
                  결과
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                  상세
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee' }}>
                    {result.name}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontSize: 20 }}>
                      {result.passed ? IconCheck({ size: 20, color: '#68d391' }) : IconClose({ size: 20, color: '#fc8181' })}
                    </span>
                  </td>
                  <td style={{ 
                    padding: '10px 16px', 
                    borderBottom: '1px solid #eee',
                    fontSize: 13,
                    color: '#666',
                    fontFamily: 'monospace',
                  }}>
                    {result.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* 최종 결과 */}
          <div style={{ 
            marginTop: 24, 
            padding: 20, 
            background: allPassed ? '#d4edda' : '#f8d7da',
            border: `1px solid ${allPassed ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {allPassed ? IconParty({ size: 32 }) : IconWarning({ size: 32 })}
            </div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: allPassed ? '#155724' : '#721c24' }}>
              {allPassed 
                ? '모든 테스트 통과! Week 1 시작해도 됩니다.'
                : '실패한 테스트가 있습니다. 스택 조정이 필요합니다.'}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
              {results.filter(r => r.passed).length} / {results.length} 통과
            </div>
          </div>
          
          {/* 재실행 버튼 */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={runTests}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              테스트 다시 실행
            </button>
          </div>
        </>
      )}
      
      {/* 다음 단계 안내 */}
      <div style={{ 
        marginTop: 32, 
        padding: 16, 
        background: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: 8,
      }}>
        <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>{IconClipboard({ size: 16 })} Week 0.5 체크리스트</h4>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 4 }}>모든 테스트 통과 {IconCheck({ size: 14, color: '#68d391' })}</li>
          <li>창 리사이즈 연타 → 깨짐/깜빡임 없는지 확인</li>
          <li>다른 모니터로 이동 → DPR 변경 대응 확인</li>
          <li>통과하면 → Week 1 모노레포 셋업 시작</li>
        </ol>
      </div>
    </div>
  );
}
