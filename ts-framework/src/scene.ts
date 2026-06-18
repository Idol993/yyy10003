import { SceneNode, BlendMode, RenderContext, Mat4 } from './types';
import { MatrixStack } from './matrix';

let nextNodeId = 1;

export function createSceneNode(
  draw: (ctx: RenderContext) => void,
  opts?: Partial<{
    transform: Mat4;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
  }>
): SceneNode {
  return {
    id: nextNodeId++,
    parent: null,
    children: [],
    transform: opts?.transform ?? new Float64Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]),
    visible: opts?.visible ?? true,
    opacity: opts?.opacity ?? 1.0,
    blendMode: opts?.blendMode ?? BlendMode.AlphaBlend,
    draw,
  };
}

export function addChild(parent: SceneNode, child: SceneNode): void {
  child.parent = parent;
  parent.children.push(child);
}

export function removeChild(parent: SceneNode, child: SceneNode): void {
  const idx = parent.children.indexOf(child);
  if (idx >= 0) {
    parent.children.splice(idx, 1);
    child.parent = null;
  }
}

export function traverseScene(
  root: SceneNode,
  ctx: RenderContext,
  matrixStack: MatrixStack
): void {
  if (!root.visible) return;

  matrixStack.push();
  matrixStack.multiply(root.transform);

  const savedBlend = ctx.currentBlend;
  ctx.currentBlend = root.blendMode;

  root.draw(ctx);

  for (const child of root.children) {
    traverseScene(child, ctx, matrixStack);
  }

  ctx.currentBlend = savedBlend;
  matrixStack.pop();
}

export class SceneTree {
  private root: SceneNode;

  constructor() {
    this.root = createSceneNode(() => {}, { visible: true });
  }

  get rootNode(): SceneNode {
    return this.root;
  }

  add(node: SceneNode): void {
    addChild(this.root, node);
  }

  remove(node: SceneNode): void {
    if (node.parent) {
      removeChild(node.parent, node);
    }
  }

  render(ctx: RenderContext, matrixStack: MatrixStack): void {
    for (const child of this.root.children) {
      traverseScene(child, ctx, matrixStack);
    }
  }

  findNode(id: number): SceneNode | null {
    return this.findNodeRecursive(this.root, id);
  }

  private findNodeRecursive(node: SceneNode, id: number): SceneNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.findNodeRecursive(child, id);
      if (found) return found;
    }
    return null;
  }

  clear(): void {
    this.root.children.length = 0;
  }
}
