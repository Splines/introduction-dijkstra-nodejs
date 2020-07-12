export class Graph {
    private graphNodes: GraphNode[];

    constructor(graphNodes: GraphNode[]) {
        this.graphNodes = graphNodes;
    }

    public getGraphNodesList(): GraphNode[] {
        return this.graphNodes;
    }

    public addGraphNode(graphNode: GraphNode) {
        this.graphNodes.push(graphNode);
    }
}

export interface EdgeToNode {
    targetNode: GraphNode;
    weight: number
}

export class GraphNode {
    private name: string;
    private edgesToNodes: EdgeToNode[];

    constructor(name: string, edgesToNodes: EdgeToNode[]) {
        this.name = name;
        this.edgesToNodes = edgesToNodes;
    }

    public getName(): string {
        return this.name;
    }

    public getEdgesToNodes(): EdgeToNode[] {
        return this.edgesToNodes;
    }

    public addAdjacentWeightedNode(edgeToNodes: EdgeToNode) {
        this.edgesToNodes.push(edgeToNodes);
    }
}

export function areSameGraphNodes(node1: GraphNode, node2: GraphNode) {
    return node1.getName() === node2.getName();
}
