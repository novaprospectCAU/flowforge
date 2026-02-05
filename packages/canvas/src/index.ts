// Renderer
export { createRenderer } from './renderer/createRenderer';
export type { IRenderer, CreateRendererOptions } from './renderer/createRenderer';
export { snapToHalfPixel, snapLineCoords } from './renderer/types';

// Viewport
export { screenToWorld, worldToScreen, getViewportBounds } from './viewport/transform';

// Rendering
export { drawNode, drawNodes, NODE_STYLE, type CompatiblePorts, type NodeValidation } from './rendering/drawNode';
export { drawEdge, drawEdges, drawTempEdge, getPortPosition, type EdgeStyle } from './rendering/drawEdge';
export { drawGrid } from './rendering/drawGrid';
export { drawMinimap, isInMinimap, minimapToWorld, MINIMAP } from './rendering/drawMinimap';
export { drawSelectionBox, isNodeInSelectionBox } from './rendering/drawSelectionBox';
export { drawGroup, drawGroups, getGroupBounds, hitTestGroups, hitTestGroupHeader } from './rendering/drawGroup';
export { calculateSnap, drawSnapLines, type SnapResult, type SnapLine } from './rendering/drawSnapLines';
export { drawComment, drawComments, hitTestComment, COMMENT_STYLE } from './rendering/drawComment';
export {
  drawCollapsedSubflow,
  drawExpandedSubflow,
  drawSubflows,
  getSubflowBounds,
  calculateCollapsedSize,
  getCollapsedSubflowPortPosition,
  hitTestSubflowHeader,
  SUBFLOW_STYLE,
} from './rendering/drawSubflow';

// Export
export { exportFlowToImage, downloadImage, type ExportImageOptions } from './export/exportImage';

// Interaction
export {
  hitTestNode,
  hitTestPort,
  hitTestEdge,
  hitTestResizeHandle,
  hitTestCollapsedSubflow,
  hitTestSubflowPort,
  type PortHitResult,
  type ResizeHandle,
  type ResizeHitResult,
  type CollapsedSubflowHitResult,
  type SubflowPortHitResult,
} from './interaction/hitTest';
