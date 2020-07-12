import { readFileSync } from "fs";
import { XmlDocument } from "xmldoc";
import { Graph, GraphNode } from "./graph";

const GRAPHML_FILE_PATH = "./src/graph.graphml";

function parseGraphMl(filePath: string): Graph {
    // Read .graphml file and parse its xml content
    const fileData = readFileSync(filePath).toString();
    let results = new XmlDocument(fileData);

    // === Construct Graph
    let graph: Graph = new Graph([]); // init empty graph
    const graphTag = results.childNamed("graph");
    if (!graphTag) {
        throw new Error("There is no graph tag in the GraphML file.");
    }

    // Parse "node" tags
    // const nodeNames: Array<string> = [];
    const nodes = graphTag.childrenNamed("node");
    if (nodes.length < 2) {
        throw new Error("There must be at least two node tags in the GraphML file.");
    }
    nodes.forEach(node => {
        graph.addGraphNode(new GraphNode(node.attr.id, []));
    });

    // Parse "edge" tags
    const edges = graphTag.childrenNamed("edge");
    if (!edges.length) {
        throw new Error("There must be at least one edge tag in the GraphML file.");
    }
    edges.forEach(edge => {
        const sourceNodeName: string = edge.attr.source;
        const targetNodeName: string = edge.attr.target;
        if (!sourceNodeName || !targetNodeName) {
            throw new Error("The edge tag has either no source or target attribute in the GraphMl file.");
        }
        const data = edge.childNamed("data");
        if (!data) {
            throw new Error("The current edge tag has no children tag named data in the GraphML file.");
        }
        const edgeWeight: number = Number(data.val);
        if (!edgeWeight) {
            throw new Error("The weight of the current edge is not a valid number.");
        }

        const sourceGraphNode = graph.getGraphNodesList().find(graphNode => graphNode.getName() === sourceNodeName);
        const targetGraphNode = graph.getGraphNodesList().find(graphNode => graphNode.getName() === targetNodeName);
        if (!sourceGraphNode || !targetGraphNode) {
            throw new Error("The node specified in the edge tag is not present in the GraphML file.");
        }
        sourceGraphNode.addAdjacentWeightedNode({
            targetNode: targetGraphNode,
            weight: edgeWeight
        });
        targetGraphNode.addAdjacentWeightedNode(({
            targetNode: sourceGraphNode,
            weight: edgeWeight
        }));
    });
    return graph;
}

interface LookupTableEntry {
    node: GraphNode;
    shortestDistanceToTargetNode: number;
    previousNode: GraphNode | null;
}

function initLookupTable(graph: Graph, startNode: GraphNode): LookupTableEntry[] {
    let lookupTable: LookupTableEntry[] = [];
    graph.getGraphNodesList().forEach(graphNode => {
        const shortestDistance: number = (graphNode === startNode) ? 0 : Infinity;
        lookupTable.push({
            node: graphNode,
            shortestDistanceToTargetNode: shortestDistance,
            previousNode: null
        });
    });
    return lookupTable;
}

function findNodeWithSmallestKnownDistance(lookupTable: LookupTableEntry[], unvisited: GraphNode[]): GraphNode {
    const filteredLookupTable = lookupTable.filter(lookupTableEntry => unvisited.includes(lookupTableEntry.node));
    if (filteredLookupTable.length === 0) {
        throw new Error("The filtered lookup table does not contain any elements.");
    }
    let smallestTableEntry = filteredLookupTable[0];
    for (let i = 0; i < filteredLookupTable.length; i++) {
        if (filteredLookupTable[i].shortestDistanceToTargetNode < smallestTableEntry.shortestDistanceToTargetNode) {
            smallestTableEntry = filteredLookupTable[i];
        }
    }
    return unvisited.find(graphNode => graphNode === smallestTableEntry.node) as GraphNode;
}


function getTableEntryforNode(lookupTable: LookupTableEntry[], graphNode: GraphNode): LookupTableEntry | null {
    const tableEntry = lookupTable.find(lookupTableEntry => lookupTableEntry.node === graphNode);
    return tableEntry ? tableEntry : null;
}

function checkNeighboringNodes(lookupTable: LookupTableEntry[], graphNode: GraphNode): void {
    const nodeTableEntry = getTableEntryforNode(lookupTable, graphNode) as LookupTableEntry;
    graphNode.getEdgesToNodes().forEach(edgeToNode => {
        const adjacentNodeTableEntry = getTableEntryforNode(lookupTable, edgeToNode.targetNode) as LookupTableEntry;
        const newDistance = nodeTableEntry.shortestDistanceToTargetNode + edgeToNode.weight;
        if (newDistance < adjacentNodeTableEntry.shortestDistanceToTargetNode) {
            adjacentNodeTableEntry.previousNode = graphNode;
            adjacentNodeTableEntry.shortestDistanceToTargetNode = newDistance;
        }
    });
}


//////////////////////////
// Dijkstra's algorithm //
//////////////////////////

interface ShortestPath {
    nodeNames: string[];
    shortestDistance: number;
}

function findShortestPathBetween(graph: Graph, startNode: GraphNode, targetNode: GraphNode): ShortestPath {
    const graphNodes = graph.getGraphNodesList();
    const graphNodesLength = graphNodes.length;
    if (!graphNodes.find(graphNode => graphNode === startNode)
        || !graphNodes.find(graphNode => graphNode === targetNode)) {
        throw new Error("Either the start node or the target node is not represented in the given graph");
    }
    const lookupTable = initLookupTable(graph, startNode);

    let visited: GraphNode[] = [];
    let unvisited: GraphNode[] = graphNodes; // shallow copy (!), graphNodes will be modified

    // --- Dijkstra
    let nextNode = startNode;
    while (visited.length < graphNodesLength) {
        nextNode = findNodeWithSmallestKnownDistance(lookupTable, unvisited);
        checkNeighboringNodes(lookupTable, nextNode);
        visited.push(nextNode);
        unvisited.splice(unvisited.indexOf(nextNode), 1);
    }

    // --- Rewind shortest path
    const pathNames: string[] = [];
    let nodeToCheck = targetNode;
    while (nodeToCheck !== startNode) {
        pathNames.push(nodeToCheck.getName());
        const previousNodeTableEntry = getTableEntryforNode(lookupTable, nodeToCheck) as LookupTableEntry;
        nodeToCheck = previousNodeTableEntry.previousNode as GraphNode;
    }
    pathNames.push(startNode.getName());

    const targetNodeTableEntry = getTableEntryforNode(lookupTable, targetNode) as LookupTableEntry;
    return {
        nodeNames: pathNames.reverse(),
        shortestDistance: targetNodeTableEntry.shortestDistanceToTargetNode
    };
}

function dijkstra(graph: Graph, startNodeName: string, targetNodeName: string): ShortestPath {
    const startNode = graph.getGraphNodesList().find(graphNode => graphNode.getName() === startNodeName) as GraphNode;
    const targetNode = graph.getGraphNodesList().find(graphNode => graphNode.getName() === targetNodeName) as GraphNode;
    if (!startNode || !targetNode) {
        throw new Error("The graph does not contain either the start node or the target node.");
    }
    return findShortestPathBetween(graph, startNode, targetNode);
}

const graph = parseGraphMl(GRAPHML_FILE_PATH);
console.log(dijkstra(graph, "A", "E"));
