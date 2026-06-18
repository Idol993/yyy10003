import { BlendMode } from './types.js';
import { MatrixStack } from './matrix.js';
let nextNodeId = 1;
export function createSceneNode(draw, opts) {
    return {
        id: nextNodeId++,
        parent: null,
        children: [],
        transform: opts?.transform ?? new Float64Array([
            1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
        visible: opts?.visible ?? true,
        opacity: opts?.opacity ?? 1.0,
        blendMode: opts?.blendMode ?? BlendMode.AlphaBlend,
        draw,
    };
}
export function addChild(parent, child) {
    child.parent = parent;
    parent.children.push(child);
}
export function removeChild(parent, child) {
    const idx = parent.children.indexOf(child);
    if (idx >= 0) {
        parent.children.splice(idx, 1);
        child.parent = null;
    }
}
export function traverseScene(root, ctx, matrixStack) {
    if (!root.visible)
        return;
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
    constructor() {
        this.root = createSceneNode(() => { }, { visible: true });
    }
    get rootNode() { return this.root; }
    add(node) { addChild(this.root, node); }
    remove(node) {
        if (node.parent)
            removeChild(node.parent, node);
    }
    render(ctx, matrixStack) {
        for (const child of this.root.children) {
            traverseScene(child, ctx, matrixStack);
        }
    }
    findNode(id) { return this.findNodeRecursive(this.root, id); }
    findNodeRecursive(node, id) {
        if (node.id === id)
            return node;
        for (const child of node.children) {
            const found = this.findNodeRecursive(child, id);
            if (found)
                return found;
        }
        return null;
    }
    clear() { this.root.children.length = 0; }
}
//# sourceMappingURL=scene.js.map
